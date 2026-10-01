from __future__ import annotations

import ctypes
import os
import subprocess
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

import psutil

from .storage import Storage


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class GameLauncher:
    """Launch and track games without keeping Nexus busy in the background.

    Nexus itself is never elevated globally. If a specific executable requires
    administrator rights, Windows UAC is requested only for that game via the
    standard ``runas`` verb. During play the host yields scheduler priority and
    the monitor uses blocking waits where possible so returning to Nexus feels
    immediate without burning CPU in a tight polling loop.
    """

    def __init__(self, storage: Storage, event_callback: Callable[[str, dict[str, Any]], None] | None = None):
        self.storage = storage
        self.event_callback = event_callback or (lambda _name, _detail: None)
        self._active_lock = threading.RLock()
        self._active: dict[str, Any] | None = None
        self._launcher_priority = None
        self._child_priorities: dict[int, Any] = {}
        self._low_impact_active = False

    def _set_low_priority(self, enabled: bool) -> None:
        if os.name != "nt":
            return
        try:
            proc = psutil.Process(os.getpid())
            if enabled:
                self._low_impact_active = True
                if self._launcher_priority is None:
                    self._launcher_priority = proc.nice()
                proc.nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
                for child in proc.children(recursive=True):
                    try:
                        if child.pid not in self._child_priorities:
                            self._child_priorities[child.pid] = child.nice()
                        child.nice(psutil.IDLE_PRIORITY_CLASS)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
            else:
                self._low_impact_active = False
                if self._launcher_priority is not None:
                    proc.nice(self._launcher_priority)
                for pid, priority in list(self._child_priorities.items()):
                    try:
                        psutil.Process(pid).nice(priority)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
                self._child_priorities.clear()
                self._launcher_priority = None
        except (psutil.NoSuchProcess, psutil.AccessDenied, AttributeError):
            pass

    @staticmethod
    def _children_under_install_dir(install_dir: str, executable_name: str = "") -> list[psutil.Process]:
        root = os.path.normcase(os.path.abspath(install_dir)) if install_dir else ""
        exe_name = os.path.basename(executable_name).casefold() if executable_name else ""
        matches: list[psutil.Process] = []
        for proc in psutil.process_iter(["pid", "exe", "name"]):
            try:
                exe = proc.info.get("exe") or ""
                name = str(proc.info.get("name") or "").casefold()
                if root and exe and os.path.normcase(os.path.abspath(exe)).startswith(root + os.sep):
                    matches.append(proc)
                elif exe_name and name == exe_name:
                    matches.append(proc)
            except (psutil.NoSuchProcess, psutil.AccessDenied, OSError):
                continue
        return matches

    @staticmethod
    def _shell_execute_runas(exe: str, cwd: str) -> bool:
        if os.name != "nt":
            return False
        # ShellExecuteW returns >32 on success. Windows owns the UAC prompt and
        # only the child application receives elevation.
        result = ctypes.windll.shell32.ShellExecuteW(None, "runas", exe, None, cwd or None, 1)
        return int(result) > 32

    def _mark_auto_elevation(self, game: dict[str, Any]) -> None:
        try:
            stored = self.storage.get_game(str(game.get("id") or ""))
            if not stored:
                return
            stored["requiresElevation"] = True
            stored["lastLaunchElevated"] = True
            self.storage.upsert_game(stored)
        except Exception:
            pass

    def launch(self, game: dict[str, Any], low_impact: bool = True) -> dict[str, Any]:
        with self._active_lock:
            if self._active:
                return {"ok": False, "error": "Un jeu est déjà suivi par Nexus."}

            started_at = now_iso()
            process: subprocess.Popen[Any] | None = None
            source = str(game.get("source") or "manual")
            launch_uri = str(game.get("launchUri") or "")
            exe = str(game.get("executablePath") or "")
            elevated = False

            try:
                if source == "steam" and launch_uri:
                    if os.name == "nt":
                        os.startfile(launch_uri)  # type: ignore[attr-defined]
                    else:
                        subprocess.Popen(["xdg-open", launch_uri], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                elif exe and Path(exe).exists():
                    run_as_admin = bool(game.get("runAsAdmin"))
                    if run_as_admin and os.name == "nt":
                        if not self._shell_execute_runas(exe, str(Path(exe).parent)):
                            return {"ok": False, "error": "Élévation administrateur annulée ou refusée."}
                        elevated = True
                    else:
                        try:
                            process = subprocess.Popen(
                                [exe],
                                cwd=str(Path(exe).parent),
                                stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL,
                                creationflags=getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0),
                            )
                        except OSError as exc:
                            # ERROR_ELEVATION_REQUIRED = 740. Instead of running
                            # Nexus as admin forever, ask UAC only for this game.
                            if os.name == "nt" and getattr(exc, "winerror", None) == 740:
                                if not self._shell_execute_runas(exe, str(Path(exe).parent)):
                                    return {"ok": False, "error": "Ce jeu demande les droits administrateur et l'UAC a été annulé."}
                                elevated = True
                                self._mark_auto_elevation(game)
                            else:
                                raise
                elif launch_uri:
                    if os.name == "nt":
                        os.startfile(launch_uri)  # type: ignore[attr-defined]
                    else:
                        subprocess.Popen(["xdg-open", launch_uri], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    return {"ok": False, "error": "Aucun exécutable ou URI de lancement valide."}
            except Exception as exc:
                return {"ok": False, "error": f"Impossible de lancer le jeu : {exc}"}

            self._active = {
                "game": game,
                "startedAt": started_at,
                "startedMonotonic": time.monotonic(),
                "process": process,
                "stopRequested": False,
                "elevated": elevated,
            }
            if low_impact:
                self._set_low_priority(True)
            threading.Thread(target=self._monitor, name="nexus-game-monitor", daemon=True).start()
            return {"ok": True, "gameId": game["id"], "startedAt": started_at, "elevated": elevated}

    def _monitor(self) -> None:
        # URI launchers and UAC launches don't hand us a subprocess object. Give
        # them time to spawn, then track actual executables under the install dir.
        grace_deadline = time.monotonic() + 45
        tracked: list[psutil.Process] = []
        low_impact_refresh = time.monotonic() + 8

        while True:
            with self._active_lock:
                active = self._active
                if not active:
                    return
                game = active["game"]
                direct = active.get("process")
                stop_requested = bool(active.get("stopRequested"))

            if direct is not None:
                if stop_requested and direct.poll() is None:
                    try:
                        psutil.Process(direct.pid).terminate()
                    except Exception:
                        pass
                try:
                    direct.wait(timeout=0.28)
                    break
                except subprocess.TimeoutExpired:
                    pass
            else:
                tracked = [p for p in tracked if p.is_running()]
                if not tracked:
                    tracked = self._children_under_install_dir(
                        str(game.get("installDir") or ""),
                        str(game.get("executablePath") or ""),
                    )
                    if not tracked and time.monotonic() > grace_deadline:
                        break
                    # Discovery scans are comparatively expensive; keep them sparse.
                    time.sleep(0.55)
                else:
                    if stop_requested:
                        for proc in tracked:
                            try:
                                proc.terminate()
                            except Exception:
                                pass
                    _gone, alive = psutil.wait_procs(tracked, timeout=0.28)
                    tracked = alive
                    if not tracked:
                        break

            if self._low_impact_active and time.monotonic() >= low_impact_refresh:
                self._set_low_priority(True)
                low_impact_refresh = time.monotonic() + 8

        with self._active_lock:
            active = self._active
            self._active = None
        self._set_low_priority(False)
        if not active:
            return
        ended_at = now_iso()
        seconds = max(0, int(time.monotonic() - active["startedMonotonic"]))
        session = self.storage.add_session(
            active["game"]["id"], active["game"].get("title", "Jeu"), active["startedAt"], ended_at, seconds
        )
        self.event_callback("game-exited", {"session": session, "gameId": active["game"]["id"]})

    def request_stop(self) -> bool:
        with self._active_lock:
            if not self._active:
                return False
            self._active["stopRequested"] = True
            return True

    def active_state(self) -> dict[str, Any] | None:
        with self._active_lock:
            if not self._active:
                return None
            return {
                "gameId": self._active["game"]["id"],
                "startedAt": self._active["startedAt"],
                "elevated": bool(self._active.get("elevated")),
            }
