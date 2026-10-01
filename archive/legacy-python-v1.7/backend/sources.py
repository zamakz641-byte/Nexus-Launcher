from __future__ import annotations

import difflib
import json
import os
import re
from pathlib import Path
from typing import Any

from .vdf import get_root, parse_vdf


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def _steam_path_from_registry() -> Path | None:
    if os.name != "nt":
        return None
    try:
        import winreg

        candidates = [
            (winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam", "SteamPath"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Valve\Steam", "InstallPath"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Valve\Steam", "InstallPath"),
        ]
        for hive, key_name, value_name in candidates:
            try:
                with winreg.OpenKey(hive, key_name) as key:
                    value, _ = winreg.QueryValueEx(key, value_name)
                    if value:
                        return Path(value)
            except OSError:
                continue
    except Exception:
        return None
    return None


def find_steam_libraries(steam_root: Path | None = None) -> list[Path]:
    root = steam_root or _steam_path_from_registry()
    if not root:
        return []
    libraries = [root]
    vdf_path = root / "steamapps" / "libraryfolders.vdf"
    if vdf_path.exists():
        try:
            parsed = parse_vdf(_read_text(vdf_path))
            data = parsed.get("libraryfolders", parsed)
            if isinstance(data, dict):
                for value in data.values():
                    if isinstance(value, dict) and value.get("path"):
                        libraries.append(Path(str(value["path"])))
                    elif isinstance(value, str) and ("\\" in value or "/" in value):
                        libraries.append(Path(value))
        except Exception:
            pass
    unique: list[Path] = []
    seen: set[str] = set()
    for lib in libraries:
        key = str(lib).lower()
        if key not in seen:
            unique.append(lib)
            seen.add(key)
    return unique


def _score_executable(path: Path, install_dir: Path) -> int:
    name = path.name.lower()
    bad = ("unins", "uninstall", "setup", "redist", "crash", "report", "helper", "benchmark", "config")
    score = 0
    if any(token in name for token in bad):
        score -= 5000
    if "launcher" in name:
        score -= 300
    try:
        score += min(path.stat().st_size // 1_000_000, 3000)
    except OSError:
        pass
    depth = len(path.relative_to(install_dir).parts)
    score -= max(0, depth - 2) * 20
    return score


def detect_primary_executable(install_dir: Path) -> str:
    if not install_dir.exists():
        return ""
    candidates: list[Path] = []
    try:
        for path in install_dir.rglob("*.exe"):
            try:
                rel = path.relative_to(install_dir)
            except ValueError:
                continue
            if len(rel.parts) <= 5:
                candidates.append(path)
            if len(candidates) > 500:
                break
    except (OSError, PermissionError):
        return ""
    if not candidates:
        return ""
    candidates.sort(key=lambda p: _score_executable(p, install_dir), reverse=True)
    return str(candidates[0])


def scan_steam(steam_root: Path | None = None) -> list[dict[str, Any]]:
    games: list[dict[str, Any]] = []
    for library in find_steam_libraries(steam_root):
        steamapps = library / "steamapps"
        if not steamapps.exists():
            continue
        for manifest in steamapps.glob("appmanifest_*.acf"):
            try:
                parsed = get_root(parse_vdf(_read_text(manifest)))
                appid = str(parsed.get("appid") or manifest.stem.split("_")[-1])
                title = str(parsed.get("name") or f"Steam {appid}")
                install_dir = steamapps / "common" / str(parsed.get("installdir", ""))
                size = int(parsed.get("SizeOnDisk") or 0)
                games.append(
                    {
                        "source": "steam",
                        "sourceId": appid,
                        "steamAppId": appid,
                        "title": title,
                        "installDir": str(install_dir),
                        "installSizeBytes": size,
                        "executablePath": detect_primary_executable(install_dir),
                        "launchUri": f"steam://rungameid/{appid}",
                    }
                )
            except Exception:
                continue
    dedup: dict[str, dict[str, Any]] = {g["steamAppId"]: g for g in games}
    return sorted(dedup.values(), key=lambda item: item["title"].lower())


def scan_epic() -> list[dict[str, Any]]:
    if os.name != "nt":
        return []
    root = Path(os.environ.get("PROGRAMDATA", r"C:\ProgramData")) / "Epic" / "EpicGamesLauncher" / "Data" / "Manifests"
    if not root.exists():
        return []
    games: list[dict[str, Any]] = []
    for manifest in root.glob("*.item"):
        try:
            data = json.loads(_read_text(manifest))
            title = data.get("DisplayName")
            install = Path(data.get("InstallLocation", ""))
            launch_exe = data.get("LaunchExecutable", "")
            if not title or not install:
                continue
            executable = install / launch_exe if launch_exe else Path("")
            namespace = str(data.get("CatalogNamespace") or "")
            catalog_item_id = str(data.get("CatalogItemId") or "")
            app_name = str(data.get("AppName") or "")
            launch_uri = ""
            if namespace and catalog_item_id and app_name:
                # Same URI family used by the Epic launcher and by mature universal
                # launchers such as Playnite. Keep the store identifiers separately so
                # metadata providers never have to infer them again from the title.
                launch_uri = (
                    f"com.epicgames.launcher://apps/{namespace}%3A{catalog_item_id}%3A{app_name}"
                    "?action=launch&silent=true"
                )
            games.append(
                {
                    "source": "epic",
                    "sourceId": str(catalog_item_id or app_name or manifest.stem),
                    "title": title,
                    "installDir": str(install),
                    "installSizeBytes": 0,
                    "executablePath": str(executable) if executable and executable.exists() else detect_primary_executable(install),
                    "launchUri": launch_uri,
                    "epicNamespace": namespace,
                    "epicCatalogItemId": catalog_item_id,
                    "epicAppName": app_name,
                }
            )
        except Exception:
            continue
    return sorted(games, key=lambda item: item["title"].lower())


def scan_gog() -> list[dict[str, Any]]:
    if os.name != "nt":
        return []
    try:
        import winreg
    except Exception:
        return []
    roots = [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\GOG.com\Games"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\GOG.com\Games"),
    ]
    games: list[dict[str, Any]] = []
    for hive, root_name in roots:
        try:
            with winreg.OpenKey(hive, root_name) as root:
                count = winreg.QueryInfoKey(root)[0]
                for idx in range(count):
                    game_id = winreg.EnumKey(root, idx)
                    try:
                        with winreg.OpenKey(root, game_id) as key:
                            values = {}
                            for name in ("gameName", "path", "exe", "gameID"):
                                try:
                                    values[name] = winreg.QueryValueEx(key, name)[0]
                                except OSError:
                                    pass
                            title = values.get("gameName")
                            install = Path(values.get("path", ""))
                            exe = values.get("exe", "")
                            if title:
                                games.append(
                                    {
                                        "source": "gog",
                                        "sourceId": str(values.get("gameID") or game_id),
                                        "title": str(title),
                                        "installDir": str(install),
                                        "installSizeBytes": 0,
                                        "executablePath": str(install / exe) if exe else detect_primary_executable(install),
                                        "launchUri": "",
                                    }
                                )
                    except OSError:
                        continue
        except OSError:
            continue
    return sorted(games, key=lambda item: item["title"].lower())


def scan_all_sources() -> list[dict[str, Any]]:
    items = scan_steam() + scan_epic() + scan_gog()
    seen: set[tuple[str, str]] = set()
    result = []
    for item in items:
        key = (item.get("source", "manual"), item.get("sourceId", item.get("title", "")))
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


GENERIC_FOLDER_NAMES = {
    "engine", "engines", "binaries", "binary", "bin", "win64", "win32", "x64", "x86",
    "game", "games", "launcher", "launch", "system", "runtime", "content", "build", "release",
    "shipping", "client", "redist", "_commonredist", "common", "steamapps", "epic games",
    "gog galaxy", "gog games", "program files", "program files (x86)", "apps", "app", "windows",
}

TECHNICAL_EXE_TOKENS = {
    "game", "launcher", "launch", "start", "play", "client", "shipping", "win64", "win32", "x64", "x86",
    "dx11", "dx12", "avx", "avx2", "release", "retail", "binary", "binaries",
}


def _normalized_name(value: str) -> str:
    value = (value or "").casefold().replace("™", " ").replace("®", " ")
    return re.sub(r"[^a-z0-9]+", "", value)


def _pretty_folder_name(value: str) -> str:
    # Folder names are usually closer to the marketing title than EXE names.
    # Preserve deliberate camel-case brands such as eFootball instead of
    # turning them into "e Football".
    value = re.sub(r"[_\.]+", " ", value or "")
    value = re.sub(r"\s+", " ", value).strip(" -_")
    return value


def _humanize_executable(value: str) -> str:
    value = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", value or "")
    value = re.sub(r"(?<=[A-Za-z])(?=\d)|(?<=\d)(?=[A-Za-z])", " ", value)
    value = re.sub(r"[_\.\-]+", " ", value)
    words = [w for w in re.split(r"\s+", value.strip()) if w]
    # Strip the technical tail that Unreal/Unity/native builds love attaching
    # to the actual game name. Do it only at the tail so titles containing a
    # word such as "Game" are not randomly mutilated.
    while words and words[-1].casefold() in TECHNICAL_EXE_TOKENS:
        words.pop()
    # Digit splitting turns Win64/DX12/X64 into two tokens. Strip those pairs
    # after generic tails such as Shipping have already been removed.
    technical_pairs = {"win64", "win32", "x64", "x86", "dx11", "dx12", "avx2"}
    while len(words) >= 2 and "".join(w.casefold() for w in words[-2:]) in technical_pairs:
        words = words[:-2]
        while words and words[-1].casefold() in TECHNICAL_EXE_TOKENS:
            words.pop()
    title = " ".join(words)
    return re.sub(r"\s+", " ", title).strip()


def _is_generic_name(value: str) -> bool:
    n = re.sub(r"[^a-z0-9]+", " ", (value or "").casefold()).strip()
    if not n:
        return True
    if n in GENERIC_FOLDER_NAMES or n in TECHNICAL_EXE_TOKENS:
        return True
    parts = [p for p in n.split() if p]
    return bool(parts) and all(p in TECHNICAL_EXE_TOKENS for p in parts)


def _ancestor_title_candidates(path: Path, limit: int = 7) -> list[tuple[str, Path, int]]:
    out: list[tuple[str, Path, int]] = []
    current = path.parent
    for depth in range(limit):
        raw = current.name
        title = _pretty_folder_name(raw)
        if title and not _is_generic_name(title):
            out.append((title, current, depth))
        parent = current.parent
        if parent == current:
            break
        current = parent
    return out


def infer_manual_candidate(executable_path: str) -> dict[str, Any]:
    path = Path(executable_path)
    exe_title = _humanize_executable(path.stem)
    ancestors = _ancestor_title_candidates(path)

    ranked: list[tuple[float, str, Path | None, str]] = []
    if exe_title and not _is_generic_name(exe_title):
        score = 88.0
        # Very short EXE names are commonly internal codenames (ASC, TslGame,
        # etc.). Keep them available, but make a sensible folder beat them.
        if len(_normalized_name(exe_title)) <= 4:
            score -= 22
        ranked.append((score, exe_title, None, "executable"))

    for title, folder, depth in ancestors:
        score = 100.0 - depth * 8.0
        norm = _normalized_name(title)
        if " " in title or re.search(r"\d", title):
            score += 4
        # Studios and engines often hide the real game under a tiny codename
        # directory (ASC, b1, TSL...). Do not let a 2-4 character parent beat
        # a descriptive game folder one level above merely because it is nearer.
        if len(norm) <= 3 or (len(norm) <= 4 and " " not in title and not re.search(r"\d", title)):
            score -= 22
        if exe_title:
            similarity = difflib.SequenceMatcher(None, _normalized_name(exe_title), norm).ratio()
            if similarity >= 0.78:
                score += 12
        ranked.append((score, title, folder, "folder"))

    if not ranked:
        fallback = _pretty_folder_name(path.parent.name) or exe_title or path.stem or "Jeu PC"
        ranked.append((10.0, fallback, path.parent, "fallback"))

    ranked.sort(key=lambda row: row[0], reverse=True)
    title = ranked[0][1]

    # Infer the actual game root from the winning folder or the first meaningful
    # ancestor. This is important for layouts such as:
    # Split Fiction/Engine/Binaries/Win64/SplitFiction-Win64-Shipping.exe
    game_root: Path = path.parent
    if ranked[0][2] is not None:
        game_root = ranked[0][2]  # type: ignore[assignment]
    elif ancestors:
        game_root = ancestors[0][1]

    suggestions: list[str] = []
    seen: set[str] = set()
    for _, candidate_title, _, _ in ranked:
        key = _normalized_name(candidate_title)
        if not key or key in seen:
            continue
        seen.add(key)
        suggestions.append(candidate_title)
        if len(suggestions) >= 5:
            break

    return {
        "source": "manual",
        "sourceId": str(path.resolve()) if path.exists() else str(path),
        "title": title or "Jeu PC",
        "nameCandidates": suggestions,
        "detectedFrom": ranked[0][3],
        "installDir": str(game_root),
        "installSizeBytes": path.stat().st_size if path.exists() else 0,
        "executablePath": str(path),
        "launchUri": "",
    }
