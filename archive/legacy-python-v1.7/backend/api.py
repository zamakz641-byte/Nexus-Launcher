from __future__ import annotations

import json
import os
import shutil
import sys
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import APP_VERSION, PATHS
from .jobs import JobManager
from .extensions import install_sound_pack, list_sound_packs, remove_sound_pack
from .launcher import GameLauncher
from .providers import GameEnricher, HttpClient, SteamAchievementsProvider, SteamGridDbProvider, SteamStoreProvider, file_uri
from .sources import infer_manual_candidate, scan_all_sources
from .storage import Storage


def _slug_id(source: str, source_id: str, title: str) -> str:
    import hashlib
    basis = f"{source}:{source_id or title}".encode("utf-8", errors="ignore")
    return f"{source}-{hashlib.sha1(basis).hexdigest()[:12]}"


def _browser_media_url(value: Any) -> Any:
    """Migrate old file:/// LocalAppData media references at read time.

    Existing libraries created by pre-hotfix builds do not need a re-import.
    Remote HTTP(S) URLs and already-normalised media paths are left untouched.
    """
    if not isinstance(value, str) or not value:
        return value
    if value.startswith('/__nexus_media__/') or value.startswith(('http://', 'https://', 'data:')):
        return value
    try:
        if value.startswith('file:'):
            from urllib.parse import urlparse, unquote
            parsed = urlparse(value)
            raw = unquote(parsed.path or '')
            if os.name == 'nt' and raw.startswith('/') and len(raw) > 2 and raw[2] == ':':
                raw = raw[1:]
            return file_uri(Path(raw))
        path = Path(value)
        if path.is_absolute():
            return file_uri(path)
    except Exception:
        pass
    return value


def _format_last_session(iso: str | None) -> str:
    if not iso:
        return "Jamais joué"
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone()
        now = datetime.now().astimezone()
        if dt.date() == now.date():
            return "Aujourd'hui"
        if (now.date() - dt.date()).days == 1:
            return "Hier"
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return ""


class NexusApi:
    # pywebview 6.2.1 recursively walks every *public* attribute of js_api.
    # Keep all runtime/state objects private, especially the Window instance, or
    # the bridge can recurse into WinForms/.NET objects until Python hits its
    # recursion limit before window.pywebview.api is injected.
    def __init__(self):
        self._storage = Storage()
        self._jobs = JobManager()
        self._window = None
        self._event_lock = threading.RLock()
        self._launcher = GameLauncher(self._storage, self._emit)

    def _bind_window(self, window: Any) -> None:
        self._window = window

    def _emit(self, name: str, detail: dict[str, Any]) -> None:
        window = self._window
        if not window:
            return
        try:
            if name == "game-exited":
                settings = self._storage.get_settings()
                if settings.get("reopenAfterGame", True):
                    # Wake the already-loaded DOM before making WebView2 visible.
                    # This avoids the short black frame caused by showing a window
                    # whose renderer is still carrying the in-game sleep class.
                    try:
                        window.evaluate_js("document.documentElement.classList.remove('nexus-sleep');")
                    except Exception:
                        pass
                    try:
                        window.show()
                        window.restore()
                    except Exception:
                        pass
            payload = json.dumps(detail, ensure_ascii=False)
            window.evaluate_js(
                f"window.dispatchEvent(new CustomEvent({json.dumps('nexus-'+name)}, {{detail:{payload}}}));"
            )
        except Exception:
            pass

    @staticmethod
    def _decorate(game: dict[str, Any]) -> dict[str, Any]:
        game = dict(game)
        for field in ("coverImage", "heroImage", "logoUrl", "iconUrl", "trailerUrl", "trailerPosterUrl"):
            if game.get(field):
                game[field] = _browser_media_url(game[field])
        if isinstance(game.get("screenshots"), list):
            game["screenshots"] = [_browser_media_url(item) for item in game["screenshots"]]
        seconds = int(game.get("playtimeSeconds") or round(float(game.get("playtimeHours", 0) or 0) * 3600))
        game["playtimeSeconds"] = seconds
        game["playtimeHours"] = round(seconds / 3600, 1)
        game["lastSession"] = _format_last_session(game.get("lastPlayedAt"))
        size = int(game.get("installSizeBytes") or 0)
        game["installSizeGb"] = round(size / (1024 ** 3), 1) if size else float(game.get("installSizeGb") or 0)
        game.setdefault("description", "")
        game.setdefault("genres", [])
        game.setdefault("screenshots", [])
        game.setdefault("recentAchievements", [])
        game.setdefault("collections", [])
        game.setdefault("developer", "")
        game.setdefault("publisher", "")
        game.setdefault("releaseYear", 0)
        game.setdefault("achievementsUnlocked", 0)
        game.setdefault("totalAchievements", 0)
        game.setdefault("coverImage", "")
        game.setdefault("heroImage", "")
        game.setdefault("logoUrl", "")
        game.setdefault("iconUrl", "")
        game.setdefault("accentColor", "#e9c96a")
        game.setdefault("accentSecondary", "#6aa9e9")
        game.setdefault("isFavorite", False)
        game.setdefault("eyebrow", "BIBLIOTHÈQUE NEXUS")
        game.setdefault("quote", "")
        game.setdefault("runAsAdmin", False)
        game.setdefault("identityLocked", False)
        game.setdefault("identityProvider", "")
        game.setdefault("canonicalTitle", game.get("title", ""))
        game.setdefault("titleLocked", False)
        return game

    def bootstrap(self) -> dict[str, Any]:
        return {
            "version": APP_VERSION,
            "games": [self._decorate(g) for g in self._storage.list_games()],
            "sessions": self._storage.list_sessions(),
            "settings": self._storage.get_settings(),
            "activeGame": self._launcher.active_state(),
            "dataDirectory": str(PATHS.data),
            "platform": os.name,
        }

    def startup_sound_profile(self) -> dict[str, Any]:
        """Return only the minimal audio data needed by the raw boot shell.

        The HTML startup runs before React, so it cannot wait for the normal
        renderer sound registry. Keeping this payload tiny lets the selected
        pack's startup cue begin while the rest of Nexus is still loading.
        """
        settings = self._storage.get_settings()
        pack_id = str(settings.get("sfxPack") or "nexus-glass")
        packs = list_sound_packs()
        pack = next((item for item in packs if item.get("id") == pack_id), None)
        if pack is None:
            pack = next((item for item in packs if item.get("id") == "nexus-glass"), packs[0] if packs else {})
        volume = max(0.0, min(1.0, float(settings.get("sfxVolume", 0.62) or 0.62)))
        return {
            "enabled": bool(settings.get("sfxEnabled", True) and settings.get("startupAnimation", True)),
            "volume": volume,
            "pack": {
                "id": str(pack.get("id") or ""),
                "assetBase": str(pack.get("assetBase") or "/sfx/kenney/"),
                "startup": (pack.get("cues") or {}).get("startup"),
            },
        }

    def choose_executable(self) -> str:
        if not self._window:
            return ""
        try:
            import webview
            result = self._window.create_file_dialog(
                webview.FileDialog.OPEN,
                allow_multiple=False,
                file_types=("Applications Windows (*.exe)", "Tous les fichiers (*.*)"),
            )
            return result[0] if result else ""
        except Exception:
            try:
                import webview
                result = self._window.create_file_dialog(
                    webview.OPEN_DIALOG,
                    allow_multiple=False,
                    file_types=("Applications Windows (*.exe)", "Tous les fichiers (*.*)"),
                )
                return result[0] if result else ""
            except Exception:
                return ""

    def scan_installed_games(self) -> list[dict[str, Any]]:
        imported = {(g.get("source"), str(g.get("sourceId"))) for g in self._storage.list_games()}
        items = scan_all_sources()
        for item in items:
            item["alreadyImported"] = (item.get("source"), str(item.get("sourceId"))) in imported
        return items

    def _base_game(self, candidate: dict[str, Any]) -> dict[str, Any]:
        source = str(candidate.get("source") or "manual")
        source_id = str(candidate.get("sourceId") or candidate.get("executablePath") or candidate.get("title") or uuid.uuid4())
        game_id = _slug_id(source, source_id, str(candidate.get("title") or "Jeu"))
        existing = self._storage.get_game(game_id) or {}
        return {
            **existing,
            "id": game_id,
            "source": source,
            "sourceId": source_id,
            "steamAppId": str(candidate.get("steamAppId") or existing.get("steamAppId") or ""),
            "title": str(candidate.get("title") or existing.get("title") or "Jeu PC"),
            "installDir": str(candidate.get("installDir") or existing.get("installDir") or ""),
            "installSizeBytes": int(candidate.get("installSizeBytes") or existing.get("installSizeBytes") or 0),
            "executablePath": str(candidate.get("executablePath") or existing.get("executablePath") or ""),
            "launchUri": str(candidate.get("launchUri") or existing.get("launchUri") or ""),
            "description": existing.get("description", ""),
            "genres": existing.get("genres", []),
            "playtimeSeconds": int(existing.get("playtimeSeconds") or 0),
            "lastPlayedAt": existing.get("lastPlayedAt"),
            "achievementsUnlocked": int(existing.get("achievementsUnlocked") or 0),
            "totalAchievements": int(existing.get("totalAchievements") or 0),
            "coverImage": existing.get("coverImage", ""),
            "heroImage": existing.get("heroImage", ""),
            "logoUrl": existing.get("logoUrl", ""),
            "iconUrl": existing.get("iconUrl", ""),
            "accentColor": existing.get("accentColor", "#e9c96a"),
            "accentSecondary": existing.get("accentSecondary", "#6aa9e9"),
            "isFavorite": bool(existing.get("isFavorite", False)),
            "collections": existing.get("collections", []),
            "developer": existing.get("developer", ""),
            "publisher": existing.get("publisher", ""),
            "releaseYear": int(existing.get("releaseYear") or 0),
            "screenshots": existing.get("screenshots", []),
            "recentAchievements": existing.get("recentAchievements", []),
            "mediaStatus": "importing",
            "runAsAdmin": bool(existing.get("runAsAdmin", False)),
            "identityLocked": bool(existing.get("identityLocked", False)),
            "identityProvider": existing.get("identityProvider", ""),
            "canonicalTitle": existing.get("canonicalTitle", ""),
            "titleLocked": bool(candidate.get("titleLocked", existing.get("titleLocked", False))),
            "steamGridDbId": existing.get("steamGridDbId", ""),
            "metadataSources": existing.get("metadataSources", {}),
            "metadataConfidence": existing.get("metadataConfidence", {}),
        }

    def _start_import(self, candidate: dict[str, Any]) -> str:
        base = self._base_game(candidate)
        self._storage.upsert_game(base)

        def worker(progress):
            settings = self._storage.get_settings()
            enricher = GameEnricher(settings, self._storage.upsert_game, progress)
            result = enricher.enrich(base)
            return self._decorate(result)

        return self._jobs.start(worker)

    def _candidate_from_executable(self, executable_path: str) -> dict[str, Any]:
        candidate = infer_manual_candidate(executable_path)
        # If the exe lives in a scanned Steam/Epic/GOG game, use richer source data
        # but keep the smart manual-name suggestions for the editor.
        normalized = os.path.normcase(os.path.abspath(executable_path))
        manual_suggestions = list(candidate.get("nameCandidates") or [])
        for item in scan_all_sources():
            install = item.get("installDir") or ""
            if not install:
                continue
            root = os.path.normcase(os.path.abspath(install))
            try:
                inside = os.path.commonpath([normalized, root]) == root
            except (ValueError, OSError):
                inside = normalized.startswith(root + os.sep)
            if inside:
                richer = dict(item)
                richer["executablePath"] = executable_path
                suggestions = [str(richer.get("title") or ""), *manual_suggestions]
                richer["nameCandidates"] = list(dict.fromkeys(x for x in suggestions if x))[:5]
                richer["detectedFrom"] = "library"
                candidate = richer
                break
        return candidate

    def inspect_executable(self, executable_path: str) -> dict[str, Any]:
        if not executable_path:
            raise ValueError("Exécutable manquant")
        return self._candidate_from_executable(executable_path)

    def start_import_executable(self, executable_path: str) -> str:
        return self._start_import(self._candidate_from_executable(executable_path))

    def start_import_candidate(self, candidate: dict[str, Any]) -> str:
        return self._start_import(candidate)

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        return self._jobs.get(job_id)

    def list_games(self) -> list[dict[str, Any]]:
        return [self._decorate(g) for g in self._storage.list_games()]

    def list_sessions(self) -> list[dict[str, Any]]:
        return self._storage.list_sessions()

    def update_game(self, game_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
        game = self._storage.get_game(game_id)
        if not game:
            return None
        allowed = {"isFavorite", "collections", "accentColor", "accentSecondary", "executablePath", "title", "runAsAdmin", "titleLocked"}
        for key, value in patch.items():
            if key in allowed:
                game[key] = value
        if "title" in patch and str(patch.get("title") or "").strip():
            game["title"] = str(patch["title"]).strip()
            game["titleLocked"] = True
        return self._decorate(self._storage.upsert_game(game))

    def delete_game(self, game_id: str, delete_media: bool = False) -> bool:
        self._storage.delete_game(game_id)
        if delete_media:
            shutil.rmtree(PATHS.media / game_id, ignore_errors=True)
        return True

    def refresh_media(self, game_id: str) -> str:
        game = self._storage.get_game(game_id)
        if not game:
            raise ValueError("Jeu introuvable")
        candidate = {k: game.get(k) for k in (
            "source", "sourceId", "steamAppId", "title", "installDir", "installSizeBytes", "executablePath", "launchUri"
        )}
        return self._start_import(candidate)

    def search_identity_candidates(self, game_id: str) -> list[dict[str, Any]]:
        game = self._storage.get_game(game_id)
        if not game:
            raise ValueError("Jeu introuvable")
        settings = self._storage.get_settings()
        raw_language = str(settings.get("metadataLanguage") or settings.get("language") or "french").lower()
        language = {"fr": "french", "en": "english", "es": "spanish"}.get(raw_language, raw_language)
        http = HttpClient()
        store = SteamStoreProvider(http)
        sgdb = SteamGridDbProvider(http, settings.get("steamGridDbApiKey", ""))
        title = str(game.get("canonicalTitle") or game.get("title") or "").strip()
        candidates: list[dict[str, Any]] = []
        try:
            candidates.extend(store.search_candidates(title, language=language, limit=7, hydrate=True))
        except Exception:
            pass
        try:
            candidates.extend(sgdb.search_candidates(title, limit=5))
        except Exception:
            pass

        # De-duplicate obvious cross-provider duplicates while keeping Steam first
        # because an AppID unlocks official metadata/trailers/achievements.
        seen: set[tuple[str, str]] = set()
        clean: list[dict[str, Any]] = []
        for item in sorted(candidates, key=lambda row: (row.get("provider") == "steam", float(row.get("score") or 0)), reverse=True):
            key = (str(item.get("provider") or ""), str(item.get("providerId") or ""))
            if key in seen:
                continue
            seen.add(key)
            clean.append(item)
        return clean[:10]

    def apply_identity_candidate(self, game_id: str, candidate: dict[str, Any]) -> str:
        game = self._storage.get_game(game_id)
        if not game:
            raise ValueError("Jeu introuvable")
        provider = str(candidate.get("provider") or "").lower()
        if provider not in {"steam", "steamgriddb"}:
            raise ValueError("Provider d'identité non pris en charge")
        title = str(candidate.get("title") or "").strip()
        if provider == "steam":
            appid = str(candidate.get("steamAppId") or candidate.get("providerId") or "").strip()
            if not appid.isdigit():
                raise ValueError("Steam AppID invalide")
            game["steamAppId"] = appid
            game["identityProvider"] = "steam"
        else:
            sgid = str(candidate.get("steamGridDbId") or candidate.get("providerId") or "").strip()
            if not sgid:
                raise ValueError("SteamGridDB ID invalide")
            game["steamGridDbId"] = sgid
            game["identityProvider"] = "steamgriddb"
        if title:
            game["canonicalTitle"] = title
            # Manual filenames such as FIFA23 benefit from the canonical title.
            if str(game.get("source") or "manual") == "manual" and not game.get("titleLocked"):
                game["title"] = title
        game["identityLocked"] = True
        game["identityConfidence"] = float(candidate.get("score") or 1.0)
        self._storage.upsert_game(game)
        payload = {k: game.get(k) for k in (
            "source", "sourceId", "steamAppId", "steamGridDbId", "title", "canonicalTitle",
            "identityLocked", "identityProvider", "titleLocked", "installDir", "installSizeBytes",
            "executablePath", "launchUri", "runAsAdmin"
        )}
        return self._start_import(payload)

    def list_sound_packs(self) -> list[dict[str, Any]]:
        return list_sound_packs()

    def choose_sound_pack(self) -> str:
        if not self._window:
            return ""
        try:
            import webview
            result = self._window.create_file_dialog(
                webview.FileDialog.OPEN,
                allow_multiple=False,
                file_types=("Nexus Sound Pack (*.nxsfx;*.zip)", "Tous les fichiers (*.*)"),
            )
            return result[0] if result else ""
        except Exception:
            try:
                import webview
                result = self._window.create_file_dialog(
                    webview.OPEN_DIALOG,
                    allow_multiple=False,
                    file_types=("Nexus Sound Pack (*.nxsfx;*.zip)", "Tous les fichiers (*.*)"),
                )
                return result[0] if result else ""
            except Exception:
                return ""

    def install_sound_pack(self, package_path: str) -> dict[str, Any]:
        try:
            pack = install_sound_pack(package_path)
            return {"ok": True, "pack": pack, "packs": list_sound_packs()}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}

    def remove_sound_pack(self, pack_id: str) -> dict[str, Any]:
        current = self._storage.get_settings().get("sfxPack")
        if current == pack_id:
            self._storage.update_settings({"sfxPack": "nexus-console"})
        try:
            removed = remove_sound_pack(pack_id)
            return {"ok": removed, "packs": list_sound_packs()}
        except Exception as exc:
            return {"ok": False, "error": str(exc), "packs": list_sound_packs()}

    def reveal_extensions_folder(self) -> bool:
        try:
            target = PATHS.soundpacks
            if os.name == "nt":
                os.startfile(str(target))  # type: ignore[attr-defined]
            elif sys.platform == "darwin":
                import subprocess
                subprocess.Popen(["open", str(target)])
            else:
                import subprocess
                subprocess.Popen(["xdg-open", str(target)])
            return True
        except Exception:
            return False

    def get_settings(self) -> dict[str, Any]:
        return self._storage.get_settings()

    def update_settings(self, patch: dict[str, Any]) -> dict[str, Any]:
        return self._storage.update_settings(patch)

    def reset_settings(self) -> dict[str, Any]:
        return self._storage.reset_settings()

    def launch_game(self, game_id: str) -> dict[str, Any]:
        game = self._storage.get_game(game_id)
        if not game:
            return {"ok": False, "error": "Jeu introuvable"}
        settings = self._storage.get_settings()
        result = self._launcher.launch(game, low_impact=bool(settings.get("lowImpactMode", True)))
        if result.get("ok"):
            self._emit("game-started", {"gameId": game_id, "startedAt": result.get("startedAt"), "elevated": bool(result.get("elevated"))})
        if result.get("ok") and settings.get("hideDuringGame", True) and self._window:
            def hide_later():
                import time
                time.sleep(0.10)
                try:
                    self._window.hide()
                except Exception:
                    pass
            threading.Thread(target=hide_later, daemon=True).start()
        return result


    def sync_achievements(self, game_id: str) -> dict[str, Any]:
        game = self._storage.get_game(game_id)
        if not game:
            return {"ok": False, "error": "Jeu introuvable"}
        appid = str(game.get("steamAppId") or "").strip()
        if not appid:
            return {"ok": False, "error": "Ce jeu n'a pas d'identifiant Steam associé."}
        settings = self._storage.get_settings()
        provider = SteamAchievementsProvider(
            HttpClient(),
            str(settings.get("steamWebApiKey") or ""),
            str(settings.get("steamId64") or ""),
        )
        if not provider.enabled:
            return {"ok": False, "error": "Ajoute Steam Web API Key et SteamID64 dans Paramètres."}
        raw_language = str(settings.get("metadataLanguage") or settings.get("language") or "french").lower()
        language = {"fr": "french", "en": "english", "es": "spanish"}.get(raw_language, raw_language)
        try:
            items = provider.get(appid, language=language)
        except Exception as exc:
            return {"ok": False, "error": f"Synchronisation Steam impossible : {exc}"}
        game["recentAchievements"] = items
        game["achievementsUnlocked"] = sum(1 for item in items if item.get("unlocked"))
        game["totalAchievements"] = len(items)
        game.setdefault("metadataSources", {})["achievements"] = "steam"
        updated = self._storage.upsert_game(game)
        return {"ok": True, "game": self._decorate(updated), "count": len(items)}

    def quit_launcher(self) -> bool:
        window = self._window
        if not window:
            return False
        def close_later():
            import time
            time.sleep(0.06)
            try:
                window.destroy()
            except Exception:
                try:
                    window.hide()
                except Exception:
                    pass
        threading.Thread(target=close_later, name="nexus-quit", daemon=True).start()
        return True

    def stop_game(self) -> bool:
        return self._launcher.request_stop()

    def active_game(self) -> dict[str, Any] | None:
        return self._launcher.active_state()

    def show_launcher(self) -> bool:
        if not self._window:
            return False
        try:
            self._window.show()
            self._window.restore()
            return True
        except Exception:
            return False

    def toggle_fullscreen(self) -> bool:
        if not self._window:
            return False
        try:
            self._window.toggle_fullscreen()
            return True
        except Exception:
            return False

    def reveal_data_folder(self) -> bool:
        try:
            if os.name == "nt":
                os.startfile(PATHS.data)  # type: ignore[attr-defined]
            elif os.name == "posix":
                import subprocess
                subprocess.Popen(["xdg-open", str(PATHS.data)])
            return True
        except Exception:
            return False
