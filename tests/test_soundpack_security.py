from __future__ import annotations

import json
import stat
import zipfile
from pathlib import Path

import pytest

from backend.extensions import _safe_extract_zip, validate_sound_pack

CUES = ("focus","confirm","back","launch","success","toggle","hover","wake","sleep","startup")

def wav_bytes() -> bytes:
    # Tiny valid PCM WAV: RIFF header + empty data chunk.
    return b"RIFF" + (36).to_bytes(4,"little") + b"WAVEfmt " + (16).to_bytes(4,"little") + (1).to_bytes(2,"little") + (1).to_bytes(2,"little") + (8000).to_bytes(4,"little") + (16000).to_bytes(4,"little") + (2).to_bytes(2,"little") + (16).to_bytes(2,"little") + b"data" + (0).to_bytes(4,"little")

def make_manifest() -> dict:
    return {"schema":1,"id":"test-pack","name":"Test","author":"Test","version":"1","type":"soundpack","license":"test","cues":{c:{"file":f"audio/{c}.wav"} for c in CUES}}

def test_valid_pack_audio_headers(tmp_path: Path):
    root=tmp_path/"pack"; (root/"audio").mkdir(parents=True)
    (root/"extension.json").write_text(json.dumps(make_manifest()),encoding="utf-8")
    for c in CUES: (root/"audio"/f"{c}.wav").write_bytes(wav_bytes())
    assert validate_sound_pack(root).manifest["id"] == "test-pack"

def test_rejects_fake_audio_with_wav_extension(tmp_path: Path):
    root=tmp_path/"pack"; (root/"audio").mkdir(parents=True)
    (root/"extension.json").write_text(json.dumps(make_manifest()),encoding="utf-8")
    for c in CUES: (root/"audio"/f"{c}.wav").write_bytes(wav_bytes())
    (root/"audio"/"focus.wav").write_bytes(b"MZ-not-a-wave")
    with pytest.raises(ValueError, match="format annoncé"):
        validate_sound_pack(root)

def test_zip_rejects_path_traversal(tmp_path: Path):
    z=tmp_path/"bad.nxsfx"
    with zipfile.ZipFile(z,"w") as a: a.writestr("../evil.wav",wav_bytes())
    with pytest.raises(ValueError, match="path traversal"):
        _safe_extract_zip(z,tmp_path/"out")

def test_zip_rejects_executable_payload(tmp_path: Path):
    z=tmp_path/"bad.nxsfx"
    with zipfile.ZipFile(z,"w") as a: a.writestr("payload.exe",b"MZ")
    with pytest.raises(ValueError, match="Type de fichier interdit"):
        _safe_extract_zip(z,tmp_path/"out")

def test_zip_rejects_symlink(tmp_path: Path):
    z=tmp_path/"bad.nxsfx"
    info=zipfile.ZipInfo("audio/link.wav")
    info.create_system=3
    info.external_attr=(stat.S_IFLNK | 0o777) << 16
    with zipfile.ZipFile(z,"w") as a: a.writestr(info,"target.wav")
    with pytest.raises(ValueError, match="liens symboliques"):
        _safe_extract_zip(z,tmp_path/"out")
