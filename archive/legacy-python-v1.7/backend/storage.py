from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from .config import PATHS


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


DEFAULT_SETTINGS: dict[str, Any] = {
    "accentTheme": "gold",
    "sfxEnabled": True,
    "sfxVolume": 0.62,
    "launchAnimation": True,
    "startupAnimation": True,
    "ambientMotion": True,
    "controllerHints": True,
    "showClock": True,
    "density": "cinematic",
    "username": "NexusPlayer",
    "statusText": "Prêt à jouer",
    "avatarUrl": "",
    "steamGridDbApiKey": "",
    "igdbClientId": "",
    "igdbClientSecret": "",
    "steamWebApiKey": "",
    "steamId64": "",
    "autoScanSteam": True,
    "autoDownloadTrailer": True,
    "autoDownloadScreenshots": True,
    "hideDuringGame": True,
    "lowImpactMode": True,
    "reopenAfterGame": True,
    "startFullscreen": True,
    "launchDelayMs": 2450,
    "language": "fr",
    "metadataLanguage": "fr",
    "sfxPack": "nexus-glass",
}


class Storage:
    """Small SQLite persistence layer.

    Games are stored as JSON documents so the frontend model can evolve without
    destructive schema migrations. Sessions stay relational because statistics
    need cheap time-range queries.
    """

    def __init__(self, db_path: Path | None = None):
        self.db_path = db_path or PATHS.db
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self) -> None:
        with self._lock, self._conn:
            self._conn.executescript(
                """
                PRAGMA journal_mode=WAL;
                PRAGMA synchronous=NORMAL;
                CREATE TABLE IF NOT EXISTS games (
                    id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    game_id TEXT NOT NULL,
                    game_title TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    ended_at TEXT NOT NULL,
                    duration_seconds INTEGER NOT NULL DEFAULT 0
                );
                CREATE INDEX IF NOT EXISTS idx_sessions_game ON sessions(game_id);
                CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                """
            )

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    def get_settings(self) -> dict[str, Any]:
        settings = dict(DEFAULT_SETTINGS)
        with self._lock:
            rows = self._conn.execute("SELECT key, value FROM settings").fetchall()
        for row in rows:
            try:
                settings[row["key"]] = json.loads(row["value"])
            except json.JSONDecodeError:
                settings[row["key"]] = row["value"]
        # Legacy beta profile name maps to the new redistributable Glass pack.
        if settings.get("sfxPack") == "nexus-modern":
            settings["sfxPack"] = "nexus-glass"
        return settings

    def update_settings(self, patch: dict[str, Any]) -> dict[str, Any]:
        allowed = set(DEFAULT_SETTINGS)
        clean = {k: v for k, v in patch.items() if k in allowed}
        with self._lock, self._conn:
            for key, value in clean.items():
                self._conn.execute(
                    "INSERT INTO settings(key,value) VALUES(?,?) "
                    "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                    (key, json.dumps(value, ensure_ascii=False)),
                )
        return self.get_settings()

    def reset_settings(self) -> dict[str, Any]:
        with self._lock, self._conn:
            self._conn.execute("DELETE FROM settings")
        return self.get_settings()

    def upsert_game(self, game: dict[str, Any]) -> dict[str, Any]:
        game = dict(game)
        if not game.get("id"):
            game["id"] = str(uuid.uuid4())
        now = utc_now_iso()
        game.setdefault("importedAt", now)
        game["updatedAt"] = now
        payload = json.dumps(game, ensure_ascii=False)
        with self._lock, self._conn:
            exists = self._conn.execute("SELECT created_at FROM games WHERE id=?", (game["id"],)).fetchone()
            created = exists["created_at"] if exists else now
            self._conn.execute(
                "INSERT INTO games(id,payload,created_at,updated_at) VALUES(?,?,?,?) "
                "ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at",
                (game["id"], payload, created, now),
            )
        return game

    def get_game(self, game_id: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute("SELECT payload FROM games WHERE id=?", (game_id,)).fetchone()
        return json.loads(row["payload"]) if row else None

    def list_games(self) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute("SELECT payload FROM games ORDER BY updated_at DESC").fetchall()
        return [json.loads(row["payload"]) for row in rows]

    def delete_game(self, game_id: str) -> None:
        with self._lock, self._conn:
            self._conn.execute("DELETE FROM games WHERE id=?", (game_id,))

    def add_session(
        self,
        game_id: str,
        game_title: str,
        started_at: str,
        ended_at: str,
        duration_seconds: int,
    ) -> dict[str, Any]:
        session = {
            "id": str(uuid.uuid4()),
            "gameId": game_id,
            "gameTitle": game_title,
            "date": started_at,
            "endedAt": ended_at,
            "durationSeconds": int(max(0, duration_seconds)),
            "durationMinutes": int(round(max(0, duration_seconds) / 60)),
        }
        with self._lock, self._conn:
            self._conn.execute(
                "INSERT INTO sessions(id,game_id,game_title,started_at,ended_at,duration_seconds) VALUES(?,?,?,?,?,?)",
                (
                    session["id"], game_id, game_title, started_at, ended_at, session["durationSeconds"]
                ),
            )
        game = self.get_game(game_id)
        if game:
            total_seconds = int(game.get("playtimeSeconds") or round(float(game.get("playtimeHours", 0)) * 3600))
            total_seconds += session["durationSeconds"]
            game["playtimeSeconds"] = total_seconds
            game["playtimeHours"] = round(total_seconds / 3600, 1)
            game["lastPlayedAt"] = ended_at
            self.upsert_game(game)
        return session

    def list_sessions(self, limit: int = 5000) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [
            {
                "id": row["id"],
                "gameId": row["game_id"],
                "gameTitle": row["game_title"],
                "date": row["started_at"],
                "endedAt": row["ended_at"],
                "durationSeconds": row["duration_seconds"],
                "durationMinutes": int(round(row["duration_seconds"] / 60)),
            }
            for row in rows
        ]

    def replace_achievements(self, game_id: str, achievements: Iterable[dict[str, Any]]) -> None:
        game = self.get_game(game_id)
        if not game:
            return
        items = list(achievements)
        game["recentAchievements"] = items
        game["achievementsUnlocked"] = sum(1 for item in items if item.get("unlocked"))
        game["totalAchievements"] = len(items)
        self.upsert_game(game)
