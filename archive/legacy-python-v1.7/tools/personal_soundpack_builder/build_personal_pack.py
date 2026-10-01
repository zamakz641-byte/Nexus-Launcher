from __future__ import annotations

import json
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

CUES = ("focus","confirm","back","launch","success","toggle","hover","wake","sleep","startup")
AUDIO_EXTS = (".wav", ".ogg", ".mp3", ".m4a")


def find_cue(folder: Path, cue: str) -> Path:
    matches = [folder / f"{cue}{ext}" for ext in AUDIO_EXTS if (folder / f"{cue}{ext}").is_file()]
    if len(matches) != 1:
        raise SystemExit(f"[{cue}] attendu exactement un fichier parmi: " + ", ".join(cue+e for e in AUDIO_EXTS))
    return matches[0]


def main() -> int:
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "user_sounds").resolve()
    if not source.is_dir():
        raise SystemExit(f"Dossier introuvable: {source}")
    name = input("Nom du pack [Personal Console]: ").strip() or "Personal Console"
    pack_id = input("ID du pack [personal-console]: ").strip().lower() or "personal-console"
    safe = "".join(c for c in pack_id if c.isalnum() or c in "._-")
    if safe != pack_id or len(pack_id) < 2:
        raise SystemExit("ID invalide. Utilise a-z, 0-9, ., _ ou -.")
    output = Path.cwd() / f"{pack_id}.nxsfx"
    with tempfile.TemporaryDirectory(prefix="nexus-personal-pack-") as td:
        root = Path(td)
        audio = root / "audio"
        audio.mkdir()
        cues = {}
        for cue in CUES:
            src = find_cue(source, cue)
            dst = audio / src.name.lower()
            shutil.copy2(src, dst)
            cues[cue] = {"file": f"audio/{dst.name}", "gain": 0.62 if cue == "startup" else 0.55}
        manifest = {
            "schema": 1,
            "id": pack_id,
            "name": name,
            "author": "Local user",
            "version": "1.0.0",
            "type": "soundpack",
            "license": "User-provided local audio",
            "description": "Pack construit localement à partir de fichiers fournis par l'utilisateur.",
            "cues": cues,
        }
        (root / "extension.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
            z.write(root / "extension.json", "extension.json")
            for p in sorted(audio.iterdir()):
                z.write(p, f"audio/{p.name}")
    print(f"\nPack créé: {output}")
    print("Dans Nexus: Paramètres > Extensions audio > Importer .nxsfx")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
