from __future__ import annotations

import json
import re
import shutil
import stat
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import PATHS

SOUND_PACK_TYPE = "soundpack"
SOUND_PACK_SCHEMA = 1
REQUIRED_SOUND_CUES = (
    "focus",
    "confirm",
    "back",
    "launch",
    "success",
    "toggle",
    "hover",
    "wake",
    "sleep",
    "startup",
)
ALLOWED_AUDIO_EXTENSIONS = {".wav", ".ogg", ".mp3", ".m4a"}
PACK_ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{1,63}$")
MAX_PACK_SIZE = 80 * 1024 * 1024
MAX_FILE_SIZE = 20 * 1024 * 1024
MAX_ARCHIVE_ENTRIES = 128
MAX_MANIFEST_SIZE = 128 * 1024
MAX_CUE_ITEMS = 6
MAX_COMPRESSION_RATIO = 250
ALLOWED_EXTRA_EXTENSIONS = {".txt", ".md"}


@dataclass(frozen=True)
class PackValidation:
    manifest: dict[str, Any]
    root: Path


def _builtin_manifest(pack_id: str, name: str, description: str, cues: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": SOUND_PACK_SCHEMA,
        "id": pack_id,
        "name": name,
        "author": "Nexus / Kenney",
        "version": "1.0.0",
        "type": SOUND_PACK_TYPE,
        "license": "CC0-1.0",
        "description": description,
        "builtin": True,
        "assetBase": "/sfx/kenney/",
        "cues": cues,
    }


BUILTIN_SOUND_PACKS: list[dict[str, Any]] = [
    _builtin_manifest(
        "nexus-console",
        "Nexus Console",
        "Sec, précis et discret. Basé sur des sons CC0 Kenney.",
        {
            "focus": {"file": "tick_001.wav", "gain": 0.22},
            "confirm": {"file": "select_001.wav", "gain": 0.34},
            "back": {"file": "back_001.wav", "gain": 0.28},
            "launch": [
                {"file": "open_001.wav", "gain": 0.36, "delayMs": 0},
                {"file": "maximize_003.wav", "gain": 0.22, "delayMs": 250},
                {"file": "confirmation_004.wav", "gain": 0.26, "delayMs": 600},
            ],
            "success": {"file": "confirmation_001.wav", "gain": 0.34},
            "toggle": {"file": "toggle_001.wav", "gain": 0.25},
            "hover": {"file": "click_003.wav", "gain": 0.09},
            "wake": {"file": "open_001.wav", "gain": 0.24},
            "sleep": {"file": "close_001.wav", "gain": 0.22},
            "startup": [
                {"file": "open_001.wav", "gain": 0.22, "delayMs": 120},
                {"file": "confirmation_004.wav", "gain": 0.26, "delayMs": 780},
            ],
        },
    ),
    _builtin_manifest(
        "nexus-glass",
        "Nexus Glass",
        "Plus aérien et doux, pour une interface console moderne.",
        {
            "focus": {"file": "click_003.wav", "gain": 0.075, "rate": 1.08},
            "confirm": {"file": "confirmation_001.wav", "gain": 0.27, "rate": 1.03},
            "back": {"file": "back_001.wav", "gain": 0.22, "rate": 0.98},
            "launch": [
                {"file": "open_001.wav", "gain": 0.28, "delayMs": 0, "rate": 0.98},
                {"file": "confirmation_001.wav", "gain": 0.18, "delayMs": 430, "rate": 1.08},
            ],
            "success": {"file": "confirmation_004.wav", "gain": 0.26, "rate": 1.04},
            "toggle": {"file": "toggle_001.wav", "gain": 0.18, "rate": 1.06},
            "hover": {"file": "tick_001.wav", "gain": 0.055, "rate": 1.12},
            "wake": {"file": "maximize_003.wav", "gain": 0.20, "rate": 1.02},
            "sleep": {"file": "close_001.wav", "gain": 0.18, "rate": 0.96},
            "startup": [
                {"file": "maximize_003.wav", "gain": 0.17, "delayMs": 160, "rate": 0.96},
                {"file": "confirmation_001.wav", "gain": 0.22, "delayMs": 880, "rate": 1.06},
            ],
        },
    ),
    _builtin_manifest(
        "nexus-aether",
        "Nexus Aether",
        "Très doux, spatial et lumineux. Pensé pour une sensation de console moderne premium, sans reprendre de son propriétaire.",
        {
            "focus": {"file": "tick_001.wav", "gain": 0.055, "rate": 1.18},
            "confirm": {"file": "confirmation_004.wav", "gain": 0.21, "rate": 1.08},
            "back": {"file": "close_001.wav", "gain": 0.16, "rate": 1.04},
            "launch": [
                {"file": "open_001.wav", "gain": 0.20, "delayMs": 0, "rate": 0.94},
                {"file": "maximize_003.wav", "gain": 0.14, "delayMs": 260, "rate": 1.02},
                {"file": "confirmation_001.wav", "gain": 0.17, "delayMs": 720, "rate": 1.12},
            ],
            "success": {"file": "confirmation_001.wav", "gain": 0.22, "rate": 1.12},
            "toggle": {"file": "toggle_001.wav", "gain": 0.13, "rate": 1.16},
            "hover": {"file": "click_003.wav", "gain": 0.045, "rate": 1.24},
            "wake": {"file": "maximize_003.wav", "gain": 0.16, "rate": 1.04},
            "sleep": {"file": "close_001.wav", "gain": 0.13, "rate": 0.98},
            "startup": [
                {"file": "open_001.wav", "gain": 0.16, "delayMs": 120, "rate": 0.94},
                {"file": "maximize_003.wav", "gain": 0.12, "delayMs": 520, "rate": 1.02},
                {"file": "confirmation_004.wav", "gain": 0.18, "delayMs": 980, "rate": 1.10},
            ],
        },
    ),
    _builtin_manifest(
        "nexus-pulse",
        "Nexus Pulse",
        "Plus net et énergique, avec des validations franches et un lancement plus percutant.",
        {
            "focus": {"file": "tick_001.wav", "gain": 0.18, "rate": 1.02},
            "confirm": {"file": "select_001.wav", "gain": 0.38, "rate": 0.98},
            "back": {"file": "back_001.wav", "gain": 0.30, "rate": 0.94},
            "launch": [
                {"file": "open_001.wav", "gain": 0.34, "delayMs": 0, "rate": 0.94},
                {"file": "toggle_001.wav", "gain": 0.18, "delayMs": 180, "rate": 0.96},
                {"file": "confirmation_004.wav", "gain": 0.31, "delayMs": 540, "rate": 0.98},
            ],
            "success": {"file": "confirmation_001.wav", "gain": 0.38, "rate": 0.98},
            "toggle": {"file": "toggle_001.wav", "gain": 0.29, "rate": 0.98},
            "hover": {"file": "click_003.wav", "gain": 0.08, "rate": 1.04},
            "wake": {"file": "open_001.wav", "gain": 0.27, "rate": 0.96},
            "sleep": {"file": "close_001.wav", "gain": 0.24, "rate": 0.92},
            "startup": [
                {"file": "open_001.wav", "gain": 0.25, "delayMs": 100, "rate": 0.94},
                {"file": "confirmation_004.wav", "gain": 0.29, "delayMs": 700, "rate": 0.98},
            ],
        },
    ),
    _builtin_manifest(
        "nexus-arcade",
        "Nexus Arcade",
        "Plus vif et joueur, avec des interactions courtes et lisibles à la manette.",
        {
            "focus": {"file": "click_003.wav", "gain": 0.10, "rate": 1.18},
            "confirm": {"file": "confirmation_001.wav", "gain": 0.30, "rate": 1.16},
            "back": {"file": "back_001.wav", "gain": 0.24, "rate": 1.10},
            "launch": [
                {"file": "select_001.wav", "gain": 0.28, "delayMs": 0, "rate": 1.12},
                {"file": "open_001.wav", "gain": 0.22, "delayMs": 180, "rate": 1.05},
                {"file": "confirmation_001.wav", "gain": 0.25, "delayMs": 500, "rate": 1.18},
            ],
            "success": {"file": "confirmation_004.wav", "gain": 0.31, "rate": 1.16},
            "toggle": {"file": "toggle_001.wav", "gain": 0.22, "rate": 1.18},
            "hover": {"file": "tick_001.wav", "gain": 0.07, "rate": 1.24},
            "wake": {"file": "maximize_003.wav", "gain": 0.21, "rate": 1.12},
            "sleep": {"file": "close_001.wav", "gain": 0.18, "rate": 1.05},
            "startup": [
                {"file": "maximize_003.wav", "gain": 0.19, "delayMs": 100, "rate": 1.08},
                {"file": "confirmation_001.wav", "gain": 0.24, "delayMs": 650, "rate": 1.18},
            ],
        },
    ),
]


def _safe_relative_file(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Nom de fichier audio manquant.")
    value = value.replace("\\", "/").strip().lstrip("/")
    if ".." in Path(value).parts:
        raise ValueError("Chemin audio invalide.")
    suffix = Path(value).suffix.lower()
    if suffix not in ALLOWED_AUDIO_EXTENSIONS:
        raise ValueError(f"Format audio non pris en charge: {suffix or 'sans extension'}")
    return value


def _normalise_cue(value: Any) -> list[dict[str, Any]]:
    raw_items = value if isinstance(value, list) else [value]
    if not raw_items:
        raise ValueError("Cue audio vide.")
    if len(raw_items) > MAX_CUE_ITEMS:
        raise ValueError(f"Trop de sons superposés pour un cue (max {MAX_CUE_ITEMS}).")
    normalised: list[dict[str, Any]] = []
    for item in raw_items:
        if isinstance(item, str):
            item = {"file": item}
        if not isinstance(item, dict):
            raise ValueError("Cue audio invalide.")
        file_name = _safe_relative_file(item.get("file"))
        normalised.append({
            "file": file_name,
            "gain": max(0.0, min(1.0, float(item.get("gain", 1.0) or 1.0))),
            "rate": max(0.5, min(2.0, float(item.get("rate", 1.0) or 1.0))),
            "delayMs": max(0, min(5000, int(item.get("delayMs", 0) or 0))),
        })
    return normalised


def validate_sound_pack(root: Path) -> PackValidation:
    manifest_path = root / "extension.json"
    if not manifest_path.exists():
        raise ValueError("extension.json est obligatoire à la racine du pack.")
    if manifest_path.stat().st_size > MAX_MANIFEST_SIZE:
        raise ValueError("extension.json est trop volumineux.")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"extension.json invalide: {exc}") from exc

    pack_id = str(manifest.get("id") or "").strip().lower()
    if not PACK_ID_RE.match(pack_id):
        raise ValueError("ID du pack invalide. Utilise 2 à 64 caractères: a-z, 0-9, ., _ ou -.")
    if manifest.get("type") != SOUND_PACK_TYPE:
        raise ValueError("Ce fichier n'est pas une extension audio Nexus.")
    if int(manifest.get("schema") or 0) != SOUND_PACK_SCHEMA:
        raise ValueError("Version de manifeste d'extension non prise en charge.")

    cues = manifest.get("cues")
    if not isinstance(cues, dict):
        raise ValueError("La section cues est obligatoire.")
    missing = [cue for cue in REQUIRED_SOUND_CUES if cue not in cues]
    if missing:
        raise ValueError("Pack incomplet. Sons manquants: " + ", ".join(missing))

    total_size = 0
    normalised_cues: dict[str, Any] = {}
    for cue_name in REQUIRED_SOUND_CUES:
        items = _normalise_cue(cues[cue_name])
        for item in items:
            target = (root / item["file"]).resolve()
            try:
                target.relative_to(root.resolve())
            except ValueError as exc:
                raise ValueError("Un fichier audio sort du dossier de l'extension.") from exc
            if not target.exists() or not target.is_file():
                raise ValueError(f"Fichier audio absent pour {cue_name}: {item['file']}")
            size = target.stat().st_size
            if size > MAX_FILE_SIZE:
                raise ValueError(f"Fichier trop volumineux: {item['file']}")
            if not _audio_header_matches(target):
                raise ValueError(f"Le contenu audio ne correspond pas au format annoncé: {item['file']}")
            total_size += size
        normalised_cues[cue_name] = items if isinstance(cues[cue_name], list) else items[0]

    if total_size > MAX_PACK_SIZE:
        raise ValueError("Le pack audio dépasse 80 Mo.")

    clean = {
        "schema": SOUND_PACK_SCHEMA,
        "id": pack_id,
        "name": str(manifest.get("name") or pack_id)[:80],
        "author": str(manifest.get("author") or "Inconnu")[:80],
        "version": str(manifest.get("version") or "1.0.0")[:32],
        "type": SOUND_PACK_TYPE,
        "license": str(manifest.get("license") or "Non précisée")[:80],
        "description": str(manifest.get("description") or "")[:280],
        "builtin": False,
        "cues": normalised_cues,
    }
    return PackValidation(clean, root)


def _audio_header_matches(path: Path) -> bool:
    try:
        with path.open("rb") as fh:
            head = fh.read(32)
    except OSError:
        return False
    suffix = path.suffix.lower()
    if suffix == ".wav":
        return len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WAVE"
    if suffix == ".ogg":
        return head.startswith(b"OggS")
    if suffix == ".mp3":
        return head.startswith(b"ID3") or (len(head) >= 2 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0)
    if suffix == ".m4a":
        return len(head) >= 12 and head[4:8] == b"ftyp"
    return False


def _safe_extract_zip(package_path: Path, destination: Path) -> None:
    with zipfile.ZipFile(package_path) as archive:
        infos = archive.infolist()
        if len(infos) > MAX_ARCHIVE_ENTRIES:
            raise ValueError(f"Archive trop complexe (max {MAX_ARCHIVE_ENTRIES} entrées).")
        total = 0
        seen: set[str] = set()
        root_resolved = destination.resolve()
        for info in infos:
            raw_name = info.filename.replace("\\", "/")
            if not raw_name or len(raw_name) > 240:
                raise ValueError("Nom de fichier d'extension invalide.")
            key = raw_name.casefold()
            if key in seen:
                raise ValueError("Archive invalide: noms de fichiers dupliqués.")
            seen.add(key)
            parts = Path(raw_name).parts
            if raw_name.startswith(("/", "\\")) or ".." in parts or (parts and ":" in parts[0]):
                raise ValueError("Archive d'extension invalide (path traversal).")
            unix_mode = (info.external_attr >> 16) & 0xFFFF
            if stat.S_ISLNK(unix_mode):
                raise ValueError("Les liens symboliques sont interdits dans les extensions.")
            if info.is_dir():
                continue
            suffix = Path(raw_name).suffix.lower()
            base = Path(raw_name).name.lower()
            if base != "extension.json" and suffix not in ALLOWED_AUDIO_EXTENSIONS | ALLOWED_EXTRA_EXTENSIONS:
                raise ValueError(f"Type de fichier interdit dans l'extension: {raw_name}")
            total += info.file_size
            if total > MAX_PACK_SIZE + 2 * 1024 * 1024:
                raise ValueError("Archive d'extension trop volumineuse.")
            if info.file_size > MAX_FILE_SIZE and base != "extension.json":
                raise ValueError(f"Fichier trop volumineux dans l'archive: {raw_name}")
            if info.compress_size > 0 and info.file_size / info.compress_size > MAX_COMPRESSION_RATIO:
                raise ValueError("Archive refusée: ratio de compression anormal.")
            candidate = (destination / raw_name).resolve()
            try:
                candidate.relative_to(root_resolved)
            except ValueError as exc:
                raise ValueError("Archive d'extension invalide (path traversal).") from exc

        for info in infos:
            raw_name = info.filename.replace("\\", "/")
            candidate = destination / raw_name
            if info.is_dir():
                candidate.mkdir(parents=True, exist_ok=True)
                continue
            candidate.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(info, "r") as src, candidate.open("wb") as dst:
                shutil.copyfileobj(src, dst, length=256 * 1024)


def install_sound_pack(package_path: str | Path) -> dict[str, Any]:
    package = Path(package_path).expanduser().resolve()
    if package.suffix.lower() not in {".nxsfx", ".zip"}:
        raise ValueError("Sélectionne un fichier .nxsfx ou .zip.")
    if not package.exists():
        raise ValueError("Fichier d'extension introuvable.")

    with tempfile.TemporaryDirectory(prefix="nexus-sfx-") as temp:
        root = Path(temp)
        _safe_extract_zip(package, root)
        # Tolerate one wrapping directory from common ZIP tools.
        manifest_root = root
        if not (manifest_root / "extension.json").exists():
            dirs = [p for p in root.iterdir() if p.is_dir()]
            if len(dirs) == 1 and (dirs[0] / "extension.json").exists():
                manifest_root = dirs[0]
        validation = validate_sound_pack(manifest_root)
        pack_id = validation.manifest["id"]
        if any(pack["id"] == pack_id for pack in BUILTIN_SOUND_PACKS):
            raise ValueError("Cet ID est réservé à un pack Nexus intégré.")
        destination = PATHS.soundpacks / pack_id
        staging = PATHS.soundpacks / f".{pack_id}.staging"
        shutil.rmtree(staging, ignore_errors=True)
        shutil.copytree(manifest_root, staging)
        (staging / "extension.json").write_text(
            json.dumps(validation.manifest, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        shutil.rmtree(destination, ignore_errors=True)
        staging.replace(destination)
    return decorate_pack(validation.manifest)


def decorate_pack(manifest: dict[str, Any]) -> dict[str, Any]:
    pack = dict(manifest)
    if pack.get("builtin"):
        pack.setdefault("assetBase", "/sfx/kenney/")
    else:
        pack["assetBase"] = f"/__nexus_extension__/soundpacks/{pack['id']}/"
    return pack


def list_sound_packs() -> list[dict[str, Any]]:
    packs = [decorate_pack(pack) for pack in BUILTIN_SOUND_PACKS]
    for folder in sorted(PATHS.soundpacks.iterdir()):
        if not folder.is_dir() or folder.name.startswith("."):
            continue
        try:
            packs.append(decorate_pack(validate_sound_pack(folder).manifest))
        except Exception:
            # A damaged extension is ignored rather than destabilising Nexus.
            continue
    return packs


def remove_sound_pack(pack_id: str) -> bool:
    pack_id = str(pack_id or "").strip().lower()
    if any(pack["id"] == pack_id for pack in BUILTIN_SOUND_PACKS):
        return False
    if not PACK_ID_RE.match(pack_id):
        return False
    target = PATHS.soundpacks / pack_id
    if not target.exists():
        return False
    shutil.rmtree(target, ignore_errors=False)
    return True
