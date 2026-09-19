from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path

APP_NAME = "NexusLauncher"
APP_VERSION = "1.6.4"


def resource_root() -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(getattr(sys, "_MEIPASS"))
    return Path(__file__).resolve().parent.parent


def user_data_dir() -> Path:
    if os.name == "nt":
        base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    path = base / APP_NAME
    path.mkdir(parents=True, exist_ok=True)
    return path


@dataclass(frozen=True)
class Paths:
    root: Path = resource_root()
    data: Path = user_data_dir()

    @property
    def dist(self) -> Path:
        return self.root / "dist"

    @property
    def db(self) -> Path:
        return self.data / "nexus.sqlite3"

    @property
    def media(self) -> Path:
        path = self.data / "media"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def logs(self) -> Path:
        path = self.data / "logs"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def webview_storage(self) -> Path:
        path = self.data / "webview"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def extensions(self) -> Path:
        path = self.data / "extensions"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def soundpacks(self) -> Path:
        path = self.extensions / "soundpacks"
        path.mkdir(parents=True, exist_ok=True)
        return path


PATHS = Paths()
