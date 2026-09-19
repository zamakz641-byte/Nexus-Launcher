from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "public" / "sfx" / "kenney"
BASES = [
    "https://raw.githubusercontent.com/Calinou/kenney-interface-sounds/master/addons/kenney_interface_sounds",
    "https://cdn.jsdelivr.net/gh/Calinou/kenney-interface-sounds@master/addons/kenney_interface_sounds",
]
FILES = [
    "tick_001.wav",
    "select_001.wav",
    "back_001.wav",
    "toggle_001.wav",
    "click_003.wav",
    "confirmation_001.wav",
    "confirmation_004.wav",
    "open_001.wav",
    "close_001.wav",
    "maximize_003.wav",
]

LICENSE = """Kenney Interface Sounds\n\nSource: https://kenney.nl/assets/interface-sounds\nMirror used by Nexus: https://github.com/Calinou/kenney-interface-sounds\nLicense: Creative Commons CC0 1.0 Universal (public domain dedication).\nThe audio files are redistributed unmodified.\n"""


def fetch(name: str) -> bool:
    target = DEST / name
    if target.exists() and target.stat().st_size > 256:
        return True
    headers = {"User-Agent": "NexusLauncher-SFX/1.0"}
    for base in BASES:
        try:
            request = urllib.request.Request(f"{base}/{name}", headers=headers)
            with urllib.request.urlopen(request, timeout=15) as response:
                data = response.read(2 * 1024 * 1024)
            if len(data) < 256 or not data.startswith(b"RIFF"):
                continue
            target.write_bytes(data)
            return True
        except Exception:
            continue
    return False


def main() -> int:
    DEST.mkdir(parents=True, exist_ok=True)
    (DEST / "LICENSE.txt").write_text(LICENSE, encoding="utf-8")
    ok = 0
    for name in FILES:
        if fetch(name):
            ok += 1
            print(f"[Nexus SFX] OK {name}")
        else:
            print(f"[Nexus SFX] WARN impossible de récupérer {name}; le CDN sera utilisé au runtime.")
    print(f"[Nexus SFX] {ok}/{len(FILES)} sons locaux prêts.")
    if ok != len(FILES):
        print("[Nexus SFX] Pack intégré incomplet. Une release ne doit pas être construite ainsi.")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
