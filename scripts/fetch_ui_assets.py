from __future__ import annotations

import argparse
import hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
UI_DIR = ROOT / "public" / "icons" / "ui"
PAD_DIR = ROOT / "public" / "icons" / "controller"
BRAND_DIR = ROOT / "public" / "branding"

# These PNGs are part of the release archive. Startup must never depend on the
# network. This script only validates the bundle and repairs an accidentally
# missing/corrupt file locally.
UI_ICONS = [
    "Activity", "AlertTriangle", "BarChart3", "Calendar", "CheckCircle2", "Clock", "Compass",
    "Database", "Film", "FolderKanban", "FolderOpen", "FolderPlus", "Gamepad2", "Gauge", "Globe",
    "HardDrive", "HardDriveDownload", "Heart", "Home", "Info", "KeyRound", "Layers3", "LayoutGrid",
    "List", "LoaderCircle", "Lock", "Monitor", "Palette", "Pencil", "Play", "Plus", "Power",
    "RefreshCw", "RotateCcw", "Save", "ScanSearch", "Search", "Settings", "ShieldAlert", "ShieldCheck",
    "SlidersHorizontal", "Sparkles", "Square", "Star", "Swords", "Timer", "Trash2", "Trophy", "User",
    "Users", "Volume2", "VolumeX", "X", "Zap",
]
CONTROLLER_FILES = [
    "ps/cross.png", "ps/circle.png", "ps/square.png", "ps/triangle.png", "ps/l1.png", "ps/r1.png",
    "xbox/a.png", "xbox/b.png", "xbox/x.png", "xbox/y.png", "xbox/lb.png", "xbox/rb.png",
    "switch/a.png", "switch/b.png", "switch/x.png", "switch/y.png",
]


def is_valid_png(path: Path) -> bool:
    try:
        if not path.is_file() or path.stat().st_size < 180:
            return False
        with path.open("rb") as handle:
            return handle.read(8) == b"\x89PNG\r\n\x1a\n"
    except OSError:
        return False


def _fallback_icon(path: Path, label: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    size = 128
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((12, 12, 116, 116), radius=28, fill=(7, 18, 29, 238), outline=(130, 220, 255, 245), width=5)
    d.rounded_rectangle((20, 20, 108, 108), radius=22, outline=(58, 177, 232, 110), width=2)
    short = "".join(ch for ch in label.upper() if ch.isalnum())[:2] or "N"
    font = ImageFont.load_default()
    box = d.textbbox((0, 0), short, font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    # Render at default size, then enlarge cleanly. This uses only Pillow's bundled font.
    badge = Image.new("RGBA", (max(24, w + 8), max(20, h + 8)), (0, 0, 0, 0))
    bd = ImageDraw.Draw(badge)
    bd.text(((badge.width - w) / 2 - box[0], (badge.height - h) / 2 - box[1]), short, font=font, fill=(248, 252, 255, 255))
    badge = badge.resize((72, 54), Image.Resampling.LANCZOS)
    im.alpha_composite(badge, ((size - badge.width) // 2, (size - badge.height) // 2))
    im.save(path, optimize=True)


def _repair_missing() -> list[Path]:
    repaired: list[Path] = []
    for name in UI_ICONS:
        path = UI_DIR / f"{name}.png"
        if not is_valid_png(path):
            _fallback_icon(path, name)
            repaired.append(path)
    for rel in CONTROLLER_FILES:
        path = PAD_DIR / rel
        if not is_valid_png(path):
            label = Path(rel).stem
            _fallback_icon(path, label)
            repaired.append(path)
    return repaired


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true", help="Fail if any bundled PNG remains invalid after local repair.")
    args = parser.parse_args()

    UI_DIR.mkdir(parents=True, exist_ok=True)
    PAD_DIR.mkdir(parents=True, exist_ok=True)
    BRAND_DIR.mkdir(parents=True, exist_ok=True)

    source_brand = ROOT / "assets" / "nexus.png"
    brand_target = BRAND_DIR / "nexus.png"
    if source_brand.exists():
        if not brand_target.exists() or hashlib.sha256(source_brand.read_bytes()).digest() != hashlib.sha256(brand_target.read_bytes()).digest():
            brand_target.write_bytes(source_brand.read_bytes())

    repaired = _repair_missing()
    if repaired:
        print(f"[Nexus] {len(repaired)} PNG(s) reparé(s) localement, sans telechargement.")

    expected = [UI_DIR / f"{name}.png" for name in UI_ICONS] + [PAD_DIR / rel for rel in CONTROLLER_FILES]
    missing = [path for path in expected if not is_valid_png(path)]
    if missing:
        print("[Nexus] Assets PNG encore invalides:")
        for path in missing:
            print("  -", path.relative_to(ROOT))
        return 2 if args.strict else 0

    print(f"[Nexus] PNG integres prets: {len(UI_ICONS)} icones UI + {len(CONTROLLER_FILES)} prompts manette. Aucun reseau requis.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
