from __future__ import annotations

import contextlib
import difflib
import hashlib
import html
import json
import mimetypes
import os
import re
import urllib.parse
from pathlib import Path
from typing import Any, Callable

import requests

from .config import APP_VERSION, PATHS
from .metadata_resolver import MetadataResolver, MetadataSource

ProgressCallback = Callable[[str, int, str], None]
SaveCallback = Callable[[dict[str, Any]], None]


def _slug(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-").lower()
    return value[:96] or hashlib.sha1(value.encode("utf-8", errors="ignore")).hexdigest()[:12]


def _safe_extension(url: str, content_type: str = "") -> str:
    path = urllib.parse.urlparse(url).path
    suffix = Path(path).suffix.lower()
    allowed = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm"}
    if suffix in allowed:
        return suffix
    guessed = mimetypes.guess_extension(content_type.split(";")[0].strip()) if content_type else None
    return guessed if guessed in allowed else ".bin"




def optimize_cached_image(path: Path, kind: str) -> None:
    """Resize oversized artwork after download to reduce WebView2 decode/VRAM cost.

    The function is deliberately best-effort: metadata import must never fail just
    because Pillow cannot decode a provider's unusual image. Animated GIFs are kept
    untouched. Logos preserve alpha; photographic artwork is recompressed modestly.
    """
    if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
        return
    try:
        from PIL import Image, ImageOps  # type: ignore
        limits = {
            "cover": (800, 1200),
            "hero": (1920, 1080),
            "logo": (1400, 700),
            "icon": (512, 512),
            "screenshot": (1600, 900),
            "trailer-poster": (1600, 900),
        }
        max_size = limits.get(kind, (1600, 900))
        with Image.open(path) as raw:
            image = ImageOps.exif_transpose(raw)
            if getattr(image, "is_animated", False):
                return
            original_size = image.size
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            suffix = path.suffix.lower()
            save_kwargs: dict[str, Any] = {"optimize": True}
            if suffix in {".jpg", ".jpeg"}:
                if image.mode not in {"RGB", "L"}:
                    image = image.convert("RGB")
                save_kwargs.update({"quality": 88, "progressive": True})
                fmt = "JPEG"
            elif suffix == ".webp":
                save_kwargs.update({"quality": 88, "method": 4})
                fmt = "WEBP"
            else:
                fmt = "PNG"
                save_kwargs.update({"compress_level": 6})
            # Only rewrite if resizing helped or the source is very large.
            if image.size != original_size or path.stat().st_size > 3 * 1024 * 1024:
                tmp = path.with_suffix(path.suffix + ".opt")
                image.save(tmp, format=fmt, **save_kwargs)
                if tmp.exists() and tmp.stat().st_size > 0:
                    os.replace(tmp, path)
    except Exception:
        with contextlib.suppress(Exception):
            path.with_suffix(path.suffix + ".opt").unlink(missing_ok=True)


def file_uri(path: Path | str) -> str:
    """Return a browser-safe same-origin URL for cached Nexus media.

    WebView2 is intentionally served over localhost. Direct ``file:///`` URLs
    pointing into LocalAppData are blocked/inconsistent across renderers. Cached
    media therefore travels through the tiny local static server under
    ``/__nexus_media__/``.
    """
    path = Path(path).resolve()
    try:
        relative = path.relative_to(PATHS.media.resolve())
        url = "/__nexus_media__/" + urllib.parse.quote(relative.as_posix(), safe="/")
        try:
            return f"{url}?v={path.stat().st_mtime_ns:x}"
        except OSError:
            return url
    except (ValueError, OSError):
        try:
            return path.as_uri()
        except ValueError:
            return str(path)


class HttpClient:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": f"NexusLauncher/{APP_VERSION} (+https://github.com/)",
            "Accept": "application/json,text/plain,*/*",
        })

    def get_json(self, url: str, *, headers: dict[str, str] | None = None, params: dict[str, Any] | None = None, timeout: int = 15) -> dict[str, Any]:
        response = self.session.get(url, headers=headers, params=params, timeout=timeout)
        response.raise_for_status()
        content_type = response.headers.get("content-type", "")
        if "json" not in content_type.lower() and not response.text.lstrip().startswith(("{", "[")):
            raise ValueError(f"Réponse non JSON reçue depuis {url}")
        return response.json()

    def post_json(self, url: str, *, headers: dict[str, str] | None = None, params: dict[str, Any] | None = None, data: Any = None, timeout: int = 15) -> Any:
        response = self.session.post(url, headers=headers, params=params, data=data, timeout=timeout)
        response.raise_for_status()
        return response.json()

    def download(self, url: str, destination: Path, *, max_bytes: int = 350 * 1024 * 1024, timeout: int = 30) -> Path:
        destination.parent.mkdir(parents=True, exist_ok=True)
        tmp = destination.with_suffix(destination.suffix + ".part")
        with self.session.get(url, stream=True, timeout=timeout) as response:
            response.raise_for_status()
            length = int(response.headers.get("content-length") or 0)
            if length and length > max_bytes:
                raise ValueError(f"Fichier distant trop volumineux ({length} octets)")
            total = 0
            with tmp.open("wb") as fh:
                for chunk in response.iter_content(chunk_size=256 * 1024):
                    if not chunk:
                        continue
                    total += len(chunk)
                    if total > max_bytes:
                        fh.close()
                        tmp.unlink(missing_ok=True)
                        raise ValueError("Téléchargement interrompu: limite de taille dépassée")
                    fh.write(chunk)
        os.replace(tmp, destination)
        return destination


class SteamStoreProvider:
    BASE = "https://store.steampowered.com/api/appdetails"
    SEARCH = "https://store.steampowered.com/api/storesearch/"

    def __init__(self, http: HttpClient):
        self.http = http

    @staticmethod
    def _normalized_title(value: str) -> str:
        value = html.unescape(value or "").casefold()
        value = value.replace("™", " ").replace("®", " ").replace("©", " ")
        value = re.sub(r"\b(win\s*64|win\s*32|shipping|x\s*64|x\s*86)\b", " ", value)
        value = re.sub(r"(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])", " ", value)
        value = re.sub(r"\b(win\s*64|win\s*32|shipping|x\s*64|x\s*86)\b", " ", value)
        # Storefront suffixes often differ from executable/folder names. Strip only
        # non-essential edition/platform labels, never arbitrary words.
        value = re.sub(r"\b(game of the year|goty|ultimate|deluxe|complete|definitive|standard|digital)\s+edition\b", " ", value)
        value = re.sub(r"\b(remastered|remaster)\b", " ", value)
        value = re.sub(r"[^a-z0-9]+", " ", value)
        return re.sub(r"\s+", " ", value).strip()

    def search_candidates(self, title: str, language: str = "french", limit: int = 8, hydrate: bool = False) -> list[dict[str, Any]]:
        """Return ranked Steam identity candidates instead of silently guessing.

        This powers Nexus' Playnite-style identity picker. Automatic matching still
        uses a strict threshold, while the UI can show lower-confidence alternatives
        with their artwork/year so titles such as eFootball are easy to disambiguate.
        """
        query = (title or "").strip()
        if not query:
            return []
        target = self._normalized_title(query)
        if not target:
            return []

        search_terms = [query]
        if target.casefold() != query.casefold():
            search_terms.append(target)

        combined: dict[str, dict[str, Any]] = {}
        for term in search_terms:
            try:
                payload = self.http.get_json(
                    self.SEARCH,
                    params={"term": term, "l": language, "cc": "FR"},
                    timeout=15,
                )
            except Exception:
                continue
            for item in payload.get("items") or []:
                if isinstance(item, dict) and item.get("id") and item.get("name"):
                    combined[str(item["id"])] = item

        ranked: list[dict[str, Any]] = []
        for item in combined.values():
            candidate = self._normalized_title(str(item.get("name") or ""))
            if not candidate:
                continue
            if candidate == target:
                score = 1.0
            else:
                score = difflib.SequenceMatcher(None, target, candidate).ratio()
                if len(target) >= 8 and (candidate.startswith(target + " ") or target.startswith(candidate + " ")):
                    score = max(score, 0.96)
            ranked.append({
                "provider": "steam",
                "providerId": str(item.get("id")),
                "steamAppId": str(item.get("id")),
                "title": str(item.get("name") or ""),
                "imageUrl": str(item.get("tiny_image") or ""),
                "score": round(score, 4),
                "releaseYear": 0,
                "developer": "",
                "publisher": "",
                "verified": score >= 0.93,
            })

        ranked.sort(key=lambda x: (float(x.get("score") or 0), bool(x.get("verified"))), reverse=True)
        ranked = ranked[: max(1, limit)]

        if hydrate:
            for row in ranked[:5]:
                try:
                    data = self.get_app(str(row["steamAppId"]), language)
                    if data:
                        meta = self.to_metadata(data)
                        row["releaseYear"] = int(meta.get("releaseYear") or 0)
                        row["developer"] = str(meta.get("developer") or "")
                        row["publisher"] = str(meta.get("publisher") or "")
                        row["description"] = str(meta.get("description") or "")
                except Exception:
                    pass
        return ranked

    def search_app(self, title: str, language: str = "french") -> dict[str, Any] | None:
        """Best-effort automatic match, deliberately refusing ambiguous versions.

        A bare franchise/live-service name such as ``eFootball`` can coexist
        with year-labelled editions.  An exact text match is therefore not
        always enough to decide which historical release is installed.  In
        that case Nexus leaves the game unmatched and lets the identity picker
        show the candidates instead of silently attaching today's metadata.
        """
        candidates = self.search_candidates(title, language=language, limit=8, hydrate=False)
        if not candidates or float(candidates[0].get("score") or 0) < 0.93:
            return None
        top = candidates[0]
        target = self._normalized_title(title)

        # If the user's name contains no explicit year/version but Steam also
        # offers year-labelled variants of the same base title, selection is a
        # human decision. This catches eFootball-like cases without a game-name
        # hardcode and keeps versioned executable names such as FIFA23 automatic.
        target_has_version = bool(re.search(r"(?:\b(?:19|20)\d{2}\b|\b\d{2}\b$)", target))
        if not target_has_version and float(top.get("score") or 0) >= 0.999:
            for alternative in candidates[1:]:
                alt = self._normalized_title(str(alternative.get("title") or ""))
                if (
                    alt.startswith(target + " ")
                    and re.search(r"\b(?:19|20)\d{2}\b", alt)
                    and float(alternative.get("score") or 0) >= 0.72
                ):
                    return None

        raw_id = str(top["steamAppId"])
        app_id: int | str = int(raw_id) if raw_id.isdigit() else raw_id
        return {"id": app_id, "name": top["title"], "tiny_image": top.get("imageUrl", "")}

    def get_app(self, appid: str, language: str = "french") -> dict[str, Any] | None:
        payload = self.http.get_json(
            self.BASE,
            params={"appids": appid, "l": language, "cc": "FR"},
            timeout=15,
        )
        node = payload.get(str(appid)) or {}
        if not node.get("success"):
            return None
        return node.get("data") or None

    @staticmethod
    def to_metadata(data: dict[str, Any]) -> dict[str, Any]:
        release = (data.get("release_date") or {}).get("date") or ""
        year = re.search(r"\b(19|20)\d{2}\b", release)
        return {
            "title": data.get("name") or "",
            "description": html.unescape(re.sub(r"<[^>]+>", " ", data.get("short_description") or "")).strip(),
            "developer": ", ".join(data.get("developers") or []),
            "publisher": ", ".join(data.get("publishers") or []),
            "genres": [item.get("description") for item in data.get("genres") or [] if item.get("description")],
            "releaseYear": int(year.group(0)) if year else 0,
        }

    @staticmethod
    def best_trailer(movies: list[dict[str, Any]]) -> dict[str, str] | None:
        """Pick the most trailer-like Steam movie with the best direct URL."""
        if not movies:
            return None

        def rank(movie: dict[str, Any]) -> tuple[int, int]:
            name = str(movie.get("name") or "").casefold()
            score = 0
            if "launch trailer" in name or "release trailer" in name:
                score += 80
            elif "trailer" in name:
                score += 60
            elif "teaser" in name:
                score += 35
            elif "gameplay" in name:
                score += 20
            if "developer" in name or "behind the scenes" in name:
                score -= 20
            mp4 = movie.get("mp4") or {}
            webm = movie.get("webm") or {}
            has_max = int(bool(mp4.get("max") or webm.get("max")))
            return score, has_max

        for movie in sorted([m for m in movies if isinstance(m, dict)], key=rank, reverse=True):
            mp4 = movie.get("mp4") or {}
            webm = movie.get("webm") or {}
            url = mp4.get("max") or mp4.get("480") or webm.get("max") or webm.get("480") or ""
            if url:
                return {
                    "url": str(url),
                    "poster": str(movie.get("thumbnail") or ""),
                    "name": str(movie.get("name") or "Trailer"),
                }
        return None

    @staticmethod
    def apply_metadata(game: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
        game = dict(game)
        game["title"] = data.get("name") or game.get("title")
        game["description"] = html.unescape(re.sub(r"<[^>]+>", " ", data.get("short_description") or "")).strip()
        game["developer"] = ", ".join(data.get("developers") or [])
        game["publisher"] = ", ".join(data.get("publishers") or [])
        game["genres"] = [item.get("description") for item in data.get("genres") or [] if item.get("description")]
        release = (data.get("release_date") or {}).get("date") or ""
        year = re.search(r"\b(19|20)\d{2}\b", release)
        if year:
            game["releaseYear"] = int(year.group(0))
        if data.get("header_image"):
            game["remoteHeaderUrl"] = data["header_image"]
        if data.get("background_raw") or data.get("background"):
            game["remoteBackgroundUrl"] = data.get("background_raw") or data.get("background")
        game["remoteScreenshots"] = [item.get("path_full") for item in data.get("screenshots") or [] if item.get("path_full")]
        trailer = SteamStoreProvider.best_trailer(data.get("movies") or [])
        if trailer:
            game["remoteTrailerUrl"] = trailer.get("url") or ""
            game["remoteTrailerPoster"] = trailer.get("poster") or ""
            game["remoteTrailerName"] = trailer.get("name") or ""
        return game


class IgdbProvider:
    BASE = "https://api.igdb.com/v4"
    TOKEN_URL = "https://id.twitch.tv/oauth2/token"

    def __init__(self, http: HttpClient, client_id: str, client_secret: str):
        self.http = http
        self.client_id = (client_id or "").strip()
        self.client_secret = (client_secret or "").strip()
        self._token = ""

    @property
    def enabled(self) -> bool:
        return bool(self.client_id and self.client_secret)

    def _access_token(self) -> str:
        if self._token:
            return self._token
        if not self.enabled:
            return ""
        payload = self.http.post_json(
            self.TOKEN_URL,
            params={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "client_credentials",
            },
            timeout=15,
        )
        self._token = str((payload or {}).get("access_token") or "")
        return self._token

    def _headers(self) -> dict[str, str]:
        return {
            "Client-ID": self.client_id,
            "Authorization": f"Bearer {self._access_token()}",
            "Accept": "application/json",
        }

    @staticmethod
    def _escape_search(value: str) -> str:
        return (value or "").replace("\\", "\\\\").replace('"', '\\"')

    def search_game(self, title: str) -> dict[str, Any] | None:
        if not self.enabled or not title.strip():
            return None
        query = (
            f'search "{self._escape_search(title.strip())}"; '
            "fields name,summary,first_release_date,genres.name,"
            "involved_companies.company.name,involved_companies.developer,involved_companies.publisher,"
            "cover.image_id,artworks.image_id,screenshots.image_id,videos.video_id,videos.name; limit 12;"
        )
        rows = self.http.post_json(
            f"{self.BASE}/games", headers=self._headers(), data=query, timeout=20
        )
        if not isinstance(rows, list) or not rows:
            return None
        target = SteamStoreProvider._normalized_title(title)
        ranked: list[tuple[float, dict[str, Any]]] = []
        for row in rows:
            candidate = SteamStoreProvider._normalized_title(str(row.get("name") or ""))
            if not candidate:
                continue
            score = 1.0 if candidate == target else difflib.SequenceMatcher(None, target, candidate).ratio()
            if len(target) >= 8 and (candidate.startswith(target + " ") or target.startswith(candidate + " ")):
                score = max(score, 0.96)
            ranked.append((score, row))
        if not ranked:
            return None
        ranked.sort(key=lambda item: item[0], reverse=True)
        # Slightly more tolerant than Steam search because IGDB is used precisely
        # for titles absent from Steam, but still reject weak matches.
        return ranked[0][1] if ranked[0][0] >= 0.88 else None

    @staticmethod
    def image_url(image_id: str, size: str) -> str:
        return f"https://images.igdb.com/igdb/image/upload/t_{size}/{image_id}.jpg" if image_id else ""

    @classmethod
    def to_metadata(cls, row: dict[str, Any]) -> dict[str, Any]:
        developers: list[str] = []
        publishers: list[str] = []
        for entry in row.get("involved_companies") or []:
            company = (entry.get("company") or {}).get("name")
            if not company:
                continue
            if entry.get("developer") and company not in developers:
                developers.append(company)
            if entry.get("publisher") and company not in publishers:
                publishers.append(company)
        release_year = 0
        try:
            from datetime import datetime, timezone
            ts = int(row.get("first_release_date") or 0)
            if ts:
                release_year = datetime.fromtimestamp(ts, tz=timezone.utc).year
        except Exception:
            pass
        cover_id = str((row.get("cover") or {}).get("image_id") or "")
        artwork_ids = [str(x.get("image_id") or "") for x in row.get("artworks") or [] if x.get("image_id")]
        screenshot_ids = [str(x.get("image_id") or "") for x in row.get("screenshots") or [] if x.get("image_id")]
        return {
            "title": row.get("name") or "",
            "description": row.get("summary") or "",
            "developer": ", ".join(developers),
            "publisher": ", ".join(publishers),
            "genres": [x.get("name") for x in row.get("genres") or [] if x.get("name")],
            "releaseYear": release_year,
            "igdbCoverUrl": cls.image_url(cover_id, "cover_big_2x"),
            "igdbBackgroundUrl": cls.image_url((artwork_ids or screenshot_ids or [""])[0], "1080p"),
            "igdbScreenshots": [cls.image_url(image_id, "1080p") for image_id in screenshot_ids[:6]],
            **cls.trailer_metadata(row.get("videos") or []),
        }


    @staticmethod
    def trailer_metadata(videos: list[dict[str, Any]]) -> dict[str, str]:
        """Map the best IGDB YouTube video to safe in-app streaming URLs."""
        if not videos:
            return {}

        def rank(video: dict[str, Any]) -> int:
            name = str(video.get("name") or "").casefold()
            if "launch trailer" in name or "release trailer" in name:
                return 80
            if "trailer" in name:
                return 60
            if "teaser" in name:
                return 35
            if "gameplay" in name:
                return 20
            return 5

        for video in sorted([v for v in videos if isinstance(v, dict)], key=rank, reverse=True):
            video_id = str(video.get("video_id") or "").strip()
            if not re.fullmatch(r"[A-Za-z0-9_-]{6,20}", video_id):
                continue
            return {
                "igdbTrailerPageUrl": f"https://www.youtube.com/watch?v={video_id}",
                "igdbTrailerEmbedUrl": f"https://www.youtube-nocookie.com/embed/{video_id}?rel=0&modestbranding=1",
                "igdbTrailerPosterUrl": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
                "igdbTrailerName": str(video.get("name") or "Trailer"),
            }
        return {}


class SteamGridDbProvider:
    BASE = "https://www.steamgriddb.com/api/v2"

    def __init__(self, http: HttpClient, api_key: str):
        self.http = http
        self.api_key = (api_key or "").strip()

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}"}

    def _request(self, path: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        if not self.enabled:
            return []
        payload = self.http.get_json(f"{self.BASE}/{path.lstrip('/')}", headers=self._headers(), params=params, timeout=20)
        if not payload.get("success", False):
            return []
        data = payload.get("data") or []
        return data if isinstance(data, list) else [data]

    def search_candidates(self, title: str, limit: int = 8) -> list[dict[str, Any]]:
        if not self.enabled or not (title or "").strip():
            return []
        target = SteamStoreProvider._normalized_title(title)
        try:
            items = self._request(f"search/autocomplete/{urllib.parse.quote(title)}")
        except Exception:
            return []
        result: list[dict[str, Any]] = []
        for item in items:
            if not isinstance(item, dict) or not item.get("id"):
                continue
            name = str(item.get("name") or "")
            candidate = SteamStoreProvider._normalized_title(name)
            score = 1.0 if target and candidate == target else difflib.SequenceMatcher(None, target, candidate).ratio()
            result.append({
                "provider": "steamgriddb",
                "providerId": str(item.get("id")),
                "steamGridDbId": str(item.get("id")),
                "title": name,
                "imageUrl": "",
                "score": round(score, 4),
                "releaseYear": 0,
                "verified": bool(item.get("verified")),
            })
        result.sort(key=lambda x: (float(x.get("score") or 0), bool(x.get("verified"))), reverse=True)
        return result[: max(1, limit)]

    def resolve_game(self, title: str, steam_app_id: str = "") -> dict[str, Any] | None:
        if not self.enabled:
            return None
        if steam_app_id:
            try:
                matches = self._request(f"games/steam/{steam_app_id}")
                if matches:
                    return matches[0]
            except Exception:
                pass
        search_terms = [title]
        target = SteamStoreProvider._normalized_title(title)
        if target and target.casefold() != title.casefold():
            search_terms.append(target)
        combined: dict[str, dict[str, Any]] = {}
        for term in search_terms:
            for item in self._request(f"search/autocomplete/{urllib.parse.quote(term)}"):
                if isinstance(item, dict):
                    combined[str(item.get("id") or item.get("name") or len(combined))] = item
        if not combined:
            return None

        def score(item: dict[str, Any]) -> tuple[float, int]:
            candidate = SteamStoreProvider._normalized_title(str(item.get("name") or ""))
            similarity = 1.0 if candidate == target and target else difflib.SequenceMatcher(None, target, candidate).ratio()
            return (similarity, 1 if item.get("verified") else 0)

        best = max(combined.values(), key=score)
        similarity, _verified = score(best)
        return best if similarity >= 0.86 else None

    def assets(self, kind: str, game_id: int | str) -> list[dict[str, Any]]:
        try:
            return self._request(f"{kind}/game/{game_id}", params={"types": "static", "nsfw": "false"})
        except Exception:
            return self._request(f"{kind}/game/{game_id}")

    @staticmethod
    def choose_asset(items: list[dict[str, Any]], kind: str) -> dict[str, Any] | None:
        if not items:
            return None
        def rank(item: dict[str, Any]) -> tuple[int, int, int]:
            width = int(item.get("width") or 0)
            height = int(item.get("height") or 0)
            score = int(item.get("score") or 0)
            static_bonus = 1 if not str(item.get("url", "")).lower().endswith((".webm", ".mp4")) else 0
            if kind == "grids":
                shape = 3 if height > width and height > 0 else 0
            elif kind == "heroes":
                shape = 3 if width > height and width > 0 else 0
            elif kind == "icons":
                shape = 2 if width and height and abs(width - height) < max(width, height) * 0.2 else 0
            else:
                shape = 2
            return (static_bonus, shape, score)
        return max(items, key=rank)


class SteamAchievementsProvider:
    BASE = "https://api.steampowered.com/ISteamUserStats"

    def __init__(self, http: HttpClient, api_key: str, steam_id64: str):
        self.http = http
        self.api_key = (api_key or "").strip()
        self.steam_id64 = (steam_id64 or "").strip()

    @property
    def enabled(self) -> bool:
        return bool(self.api_key and self.steam_id64)

    def get(self, appid: str, language: str = "french") -> list[dict[str, Any]]:
        if not self.enabled or not appid:
            return []
        player = self.http.get_json(
            f"{self.BASE}/GetPlayerAchievements/v1/",
            params={"key": self.api_key, "steamid": self.steam_id64, "appid": appid, "l": language},
        )
        schema = self.http.get_json(
            f"{self.BASE}/GetSchemaForGame/v2/",
            params={"key": self.api_key, "appid": appid, "l": language},
        )
        player_items = ((player.get("playerstats") or {}).get("achievements") or [])
        schema_items = (((schema.get("game") or {}).get("availableGameStats") or {}).get("achievements") or [])
        schema_map = {str(item.get("name")): item for item in schema_items}
        rarity_map: dict[str, float] = {}
        try:
            global_payload = self.http.get_json(
                "https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/",
                params={"gameid": appid},
            )
            rarity_items = ((global_payload.get("achievementpercentages") or {}).get("achievements") or [])
            rarity_map = {str(row.get("name") or ""): float(row.get("percent") or 0) for row in rarity_items}
        except Exception:
            rarity_map = {}
        result: list[dict[str, Any]] = []
        for item in player_items:
            api_name = str(item.get("apiname") or "")
            meta = schema_map.get(api_name, {})
            unlocktime = int(item.get("unlocktime") or 0)
            result.append({
                "id": api_name,
                "title": item.get("name") or meta.get("displayName") or api_name,
                "description": item.get("description") or meta.get("description") or "",
                "rarity": round(rarity_map.get(api_name, 0), 2),
                "unlocked": bool(item.get("achieved")),
                "unlockedAt": unlocktime if unlocktime else None,
                "iconUrl": meta.get("icon") or "",
                "iconGrayUrl": meta.get("icongray") or "",
            })
        return result


class YoutubeTrailerProvider:
    """Last-resort trailer lookup using yt-dlp's YouTube search extractor.

    Nexus only keeps the public video ID/embed URL. It deliberately does not
    download YouTube video files, which keeps the launcher lightweight and
    avoids turning a metadata feature into a video downloader.
    """

    BAD_WORDS = (
        "reaction", "review", "walkthrough", "lets play", "let's play",
        "comparison", "benchmark", "mod", "fan made", "fan-made", "analysis",
        "ending", "all cutscenes", "full game",
    )

    @staticmethod
    def _clean_video_title(value: str) -> str:
        value = (value or "").casefold().replace("™", " ").replace("®", " ")
        value = re.sub(r"\b(official|gameplay|launch|release|announcement|cinematic|story|game|trailer|teaser|4k|hd)\b", " ", value)
        value = re.sub(r"[^a-z0-9]+", " ", value)
        return re.sub(r"\s+", " ", value).strip()

    def search(self, title: str) -> dict[str, str] | None:
        query_title = (title or "").strip()
        if not query_title:
            return None
        try:
            import yt_dlp  # type: ignore
        except Exception:
            return None

        options = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "extract_flat": "in_playlist",
            "noplaylist": True,
            "socket_timeout": 12,
            "playlistend": 8,
        }
        try:
            with yt_dlp.YoutubeDL(options) as ydl:
                payload = ydl.extract_info(f"ytsearch8:{query_title} official game trailer", download=False) or {}
        except Exception:
            return None

        target = SteamStoreProvider._normalized_title(query_title)
        target_clean = self._clean_video_title(query_title)
        best: tuple[float, dict[str, Any]] | None = None
        for entry in payload.get("entries") or []:
            if not isinstance(entry, dict):
                continue
            video_id = str(entry.get("id") or "").strip()
            video_title = str(entry.get("title") or "").strip()
            if not video_id or not video_title:
                continue
            low = video_title.casefold()
            score = 0.0
            if "launch trailer" in low or "release trailer" in low:
                score += 52
            elif "official trailer" in low:
                score += 46
            elif "trailer" in low:
                score += 34
            elif "teaser" in low:
                score += 22
            if "official" in low:
                score += 12
            if "gameplay" in low and "trailer" not in low:
                score -= 8
            if any(word in low for word in self.BAD_WORDS):
                score -= 45

            clean = self._clean_video_title(video_title)
            ratio = difflib.SequenceMatcher(None, target_clean, clean).ratio() if clean else 0.0
            score += ratio * 42
            normalized_video = SteamStoreProvider._normalized_title(video_title)
            target_words = [w for w in target.split() if len(w) > 2]
            if target_words and all(w in normalized_video for w in target_words[: min(4, len(target_words))]):
                score += 24
            duration = entry.get("duration")
            try:
                duration_value = float(duration or 0)
                if duration_value and (duration_value < 10 or duration_value > 720):
                    score -= 18
            except (TypeError, ValueError):
                pass

            if best is None or score > best[0]:
                best = (score, entry)

        if not best or best[0] < 42:
            return None
        entry = best[1]
        video_id = str(entry.get("id") or "")
        return {
            "embedUrl": f"https://www.youtube-nocookie.com/embed/{video_id}?rel=0&modestbranding=1",
            "pageUrl": f"https://www.youtube.com/watch?v={video_id}",
            "poster": str(entry.get("thumbnail") or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"),
            "name": str(entry.get("title") or "Trailer YouTube"),
            "mode": "embed",
        }


class GameEnricher:
    def __init__(self, settings: dict[str, Any], save_callback: SaveCallback, progress: ProgressCallback | None = None):
        self.settings = settings
        self.save_callback = save_callback
        self.progress = progress or (lambda _step, _pct, _msg: None)
        self.http = HttpClient()
        self.store = SteamStoreProvider(self.http)
        self.igdb = IgdbProvider(
            self.http,
            settings.get("igdbClientId", ""),
            settings.get("igdbClientSecret", ""),
        )
        self.sgdb = SteamGridDbProvider(self.http, settings.get("steamGridDbApiKey", ""))
        self.youtube = YoutubeTrailerProvider()
        self.achievements = SteamAchievementsProvider(
            self.http,
            settings.get("steamWebApiKey", ""),
            settings.get("steamId64", ""),
        )

    def _persist(self, game: dict[str, Any], step: str, pct: int, message: str) -> None:
        self.save_callback(game)
        self.progress(step, pct, message)

    def _download_and_set(self, game: dict[str, Any], field: str, url: str, basename: str, max_bytes: int = 40 * 1024 * 1024) -> None:
        if not url:
            return
        media_dir = PATHS.media / str(game["id"])
        media_dir.mkdir(parents=True, exist_ok=True)
        # We need one lightweight request first only when extension is missing.
        ext = _safe_extension(url)
        dest = media_dir / f"{basename}{ext}"
        self.http.download(url, dest, max_bytes=max_bytes)
        optimize_cached_image(dest, basename)
        game[field] = file_uri(dest)
        game.setdefault("cachedMedia", {})[basename] = str(dest)
        self.save_callback(game)

    def enrich(self, base_game: dict[str, Any]) -> dict[str, Any]:
        game = dict(base_game)
        self.progress("metadata", 8, "Identification du jeu")
        locked_display_title = str(game.get("title") or "") if game.get("titleLocked") else ""
        lookup_title = str((game.get("canonicalTitle") if game.get("identityLocked") else "") or game.get("title") or "")

        appid = str(game.get("steamAppId") or "")
        language = str(self.settings.get("metadataLanguage") or self.settings.get("language") or "french").lower()
        language = {"fr": "french", "en": "english", "es": "spanish"}.get(language, language)
        store_data: dict[str, Any] | None = None
        igdb_data: dict[str, Any] | None = None
        metadata_candidates: list[MetadataSource] = []

        # Manual/Epic/GOG imports can still be cross-matched to Steam. We only
        # accept strong matches so an exclusive or similarly named title never
        # receives another game's trailer/achievements.
        if not appid:
            try:
                match = self.store.search_app(lookup_title, language=language)
                if match and match.get("id"):
                    appid = str(match["id"])
                    game["steamAppId"] = appid
                    game["steamMatchSource"] = "store-search"
                    self._persist(game, "metadata", 12, "Correspondance Steam vérifiée")
            except Exception as exc:
                game.setdefault("warnings", []).append(f"Steam search: {exc}")

        if appid:
            try:
                store_data = self.store.get_app(appid, language=language)
                if store_data:
                    # Preserve media URLs from Steam, but defer text-field selection
                    # to the resolver so library origin and metadata origin remain
                    # independent à la Playnite.
                    game = self.store.apply_metadata(game, store_data)
                    if locked_display_title:
                        game["title"] = locked_display_title
                    metadata_candidates.append(MetadataSource("steam", self.store.to_metadata(store_data), confidence=1.0 if str(game.get("source") or "") == "steam" else 0.96))
                    self._persist(game, "metadata", 17, "Métadonnées Steam récupérées")
            except Exception as exc:
                game.setdefault("warnings", []).append(f"Steam metadata: {exc}")

        if self.igdb.enabled:
            try:
                igdb_data = self.igdb.search_game(lookup_title)
                if igdb_data:
                    game["igdbId"] = str(igdb_data.get("id") or "")
                    igdb_meta = self.igdb.to_metadata(igdb_data)
                    metadata_candidates.append(MetadataSource("igdb", igdb_meta, confidence=0.94))
                    game["igdbCoverUrl"] = igdb_meta.get("igdbCoverUrl", "")
                    game["igdbBackgroundUrl"] = igdb_meta.get("igdbBackgroundUrl", "")
                    game["igdbScreenshots"] = igdb_meta.get("igdbScreenshots", [])
                    game["igdbTrailerPageUrl"] = igdb_meta.get("igdbTrailerPageUrl", "")
                    game["igdbTrailerEmbedUrl"] = igdb_meta.get("igdbTrailerEmbedUrl", "")
                    game["igdbTrailerPosterUrl"] = igdb_meta.get("igdbTrailerPosterUrl", "")
                    game["igdbTrailerName"] = igdb_meta.get("igdbTrailerName", "")
                    self._persist(game, "metadata", 21, "IGDB identifié")
            except Exception as exc:
                game.setdefault("warnings", []).append(f"IGDB: {exc}")

        if metadata_candidates:
            game = MetadataResolver(str(game.get("source") or "manual")).merge(game, metadata_candidates)
            if locked_display_title:
                game["title"] = locked_display_title
            self.save_callback(game)

        external_ids = dict(game.get("externalIds") or {})
        if appid:
            external_ids["steam"] = appid
        if game.get("igdbId"):
            external_ids["igdb"] = str(game.get("igdbId"))
        if game.get("epicCatalogItemId") or game.get("epicNamespace") or game.get("epicAppName"):
            external_ids["epic"] = {
                "catalogItemId": str(game.get("epicCatalogItemId") or ""),
                "namespace": str(game.get("epicNamespace") or ""),
                "appName": str(game.get("epicAppName") or ""),
            }
        game["externalIds"] = external_ids

        sgdb_game = None
        if self.sgdb.enabled:
            try:
                if game.get("identityLocked") and game.get("steamGridDbId"):
                    sgdb_game = {"id": game.get("steamGridDbId"), "name": game.get("canonicalTitle") or game.get("title")}
                else:
                    sgdb_game = self.sgdb.resolve_game(lookup_title or game.get("title", ""), appid)
                if sgdb_game:
                    game["steamGridDbId"] = sgdb_game.get("id")
                    external_ids = dict(game.get("externalIds") or {})
                    external_ids["steamgriddb"] = str(sgdb_game.get("id"))
                    game["externalIds"] = external_ids
                    self._persist(game, "steamgriddb", 25, "SteamGridDB identifié")
            except Exception as exc:
                game.setdefault("warnings", []).append(f"SteamGridDB search: {exc}")

        # SteamGridDB preferred artwork.
        if sgdb_game and sgdb_game.get("id"):
            gid = sgdb_game["id"]
            for kind, field, basename, pct in [
                ("grids", "coverImage", "cover", 36),
                ("heroes", "heroImage", "hero", 47),
                ("logos", "logoUrl", "logo", 55),
                ("icons", "iconUrl", "icon", 61),
            ]:
                try:
                    asset = self.sgdb.choose_asset(self.sgdb.assets(kind, gid), kind)
                    if asset and asset.get("url"):
                        self._download_and_set(game, field, asset["url"], basename)
                        self.progress(kind, pct, f"{kind.capitalize()} SteamGridDB sauvegardé")
                except Exception as exc:
                    game.setdefault("warnings", []).append(f"SteamGridDB {kind}: {exc}")

        # Fallback public Steam assets for Steam titles if SGDB is missing/unconfigured.
        if appid:
            fallback = {
                "coverImage": f"https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900_2x.jpg",
                "heroImage": f"https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/{appid}/library_hero.jpg",
                "logoUrl": f"https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/{appid}/logo.png",
            }
            for field, url in fallback.items():
                if not game.get(field):
                    try:
                        self._download_and_set(game, field, url, {"coverImage":"cover","heroImage":"hero","logoUrl":"logo"}[field])
                    except Exception:
                        # Store API header/background are a final fallback.
                        alt = game.get("remoteHeaderUrl") if field == "coverImage" else game.get("remoteBackgroundUrl") if field == "heroImage" else ""
                        if alt:
                            try:
                                self._download_and_set(game, field, alt, {"coverImage":"cover","heroImage":"hero","logoUrl":"logo"}[field])
                            except Exception:
                                pass
            self._persist(game, "artwork", 66, "Illustrations locales prêtes")

        # Neutral fallback for games that are not available on Steam. This is
        # especially useful for Epic/GOG exclusives: library source does not
        # dictate artwork source.
        for field, url, basename in [
            ("coverImage", game.get("igdbCoverUrl"), "cover"),
            ("heroImage", game.get("igdbBackgroundUrl"), "hero"),
        ]:
            if not game.get(field) and url:
                try:
                    self._download_and_set(game, field, str(url), basename)
                    game.setdefault("metadataSources", {})[field] = "igdb"
                except Exception as exc:
                    game.setdefault("warnings", []).append(f"IGDB {basename}: {exc}")

        # Trailer provider resolver.  Steam gives Nexus a direct MP4/WebM that
        # can be cached locally.  IGDB supplies YouTube IDs for games absent
        # from Steam; those remain streamed through an embedded player rather
        # than downloading third-party video files.
        trailer_candidates: dict[str, dict[str, Any]] = {}
        if game.get("remoteTrailerUrl"):
            trailer_candidates["steam"] = {
                "url": str(game.get("remoteTrailerUrl") or ""),
                "poster": str(game.get("remoteTrailerPoster") or ""),
                "name": str(game.get("remoteTrailerName") or "Trailer Steam"),
                "mode": "direct",
            }
        if game.get("epicTrailerUrl") or game.get("epicTrailerEmbedUrl"):
            trailer_candidates["epic"] = {
                "url": str(game.get("epicTrailerUrl") or ""),
                "embedUrl": str(game.get("epicTrailerEmbedUrl") or ""),
                "poster": str(game.get("epicTrailerPosterUrl") or ""),
                "name": str(game.get("epicTrailerName") or "Trailer Epic"),
                "mode": "direct" if game.get("epicTrailerUrl") else "embed",
            }
        if game.get("igdbTrailerEmbedUrl"):
            trailer_candidates["igdb"] = {
                "embedUrl": str(game.get("igdbTrailerEmbedUrl") or ""),
                "pageUrl": str(game.get("igdbTrailerPageUrl") or ""),
                "poster": str(game.get("igdbTrailerPosterUrl") or ""),
                "name": str(game.get("igdbTrailerName") or "Trailer IGDB"),
                "mode": "embed",
            }

        # No store/IGDB trailer? Search YouTube as a final metadata fallback.
        # This returns an embed ID only; no third-party video is downloaded.
        if not trailer_candidates:
            try:
                youtube = self.youtube.search(lookup_title or str(game.get("title") or ""))
                if youtube:
                    trailer_candidates["youtube"] = youtube
            except Exception as exc:
                game.setdefault("warnings", []).append(f"YouTube trailer: {exc}")

        trailer_provider, trailer = MetadataResolver.choose_trailer(
            trailer_candidates, str(game.get("source") or "manual")
        )
        if trailer_provider and trailer:
            game["trailerProvider"] = trailer_provider
            game["trailerName"] = trailer.get("name") or "Trailer"
            game["trailerPageUrl"] = trailer.get("pageUrl") or ""
            game["trailerEmbedUrl"] = trailer.get("embedUrl") or ""
            game["remoteTrailerPoster"] = trailer.get("poster") or game.get("remoteTrailerPoster") or ""
            game.setdefault("metadataSources", {})["trailer"] = trailer_provider
            self.save_callback(game)

        if self.settings.get("autoDownloadScreenshots", True):
            shots = list(game.get("remoteScreenshots") or [])[:6]
            if not shots:
                shots = list(game.get("igdbScreenshots") or [])[:6]
            local_shots: list[str] = []
            for index, url in enumerate(shots):
                try:
                    media_dir = PATHS.media / str(game["id"]) / "screenshots"
                    ext = _safe_extension(url)
                    dest = media_dir / f"shot-{index + 1}{ext}"
                    self.http.download(url, dest, max_bytes=20 * 1024 * 1024)
                    optimize_cached_image(dest, "screenshot")
                    local_shots.append(file_uri(dest))
                except Exception as exc:
                    game.setdefault("warnings", []).append(f"Screenshot {index + 1}: {exc}")
            if local_shots:
                game["screenshots"] = local_shots
                self._persist(game, "screenshots", 76, f"{len(local_shots)} captures sauvegardées")

        selected_direct_trailer = str((trailer or {}).get("url") or "")
        if selected_direct_trailer.startswith("http://"):
            selected_direct_trailer = "https://" + selected_direct_trailer[len("http://"):]
        if selected_direct_trailer:
            # A failed cache download must never make a perfectly valid Steam
            # trailer disappear. Make the remote URL playable immediately, then
            # replace it with the local cache only if the download succeeds.
            game["trailerUrl"] = selected_direct_trailer
            game["trailerIsLocal"] = False
            game["trailerPosterUrl"] = str((trailer or {}).get("poster") or game.get("remoteTrailerPoster") or game.get("heroImage") or "")
            self.save_callback(game)

        if self.settings.get("autoDownloadTrailer", True) and selected_direct_trailer:
            try:
                media_dir = PATHS.media / str(game["id"])
                ext = _safe_extension(selected_direct_trailer)
                dest = media_dir / f"trailer{ext}"
                self.http.download(selected_direct_trailer, dest, max_bytes=350 * 1024 * 1024, timeout=60)
                game["trailerUrl"] = file_uri(dest)
                game["trailerIsLocal"] = True
                poster_url = str((trailer or {}).get("poster") or game.get("remoteTrailerPoster") or "")
                if poster_url:
                    try:
                        pext = _safe_extension(poster_url)
                        pdest = media_dir / f"trailer-poster{pext}"
                        self.http.download(poster_url, pdest, max_bytes=15 * 1024 * 1024)
                        optimize_cached_image(pdest, "trailer-poster")
                        game["trailerPosterUrl"] = file_uri(pdest)
                    except Exception:
                        game["trailerPosterUrl"] = poster_url
                self._persist(game, "trailer", 88, f"Trailer {trailer_provider or 'direct'} sauvegardé")
            except Exception as exc:
                game.setdefault("warnings", []).append(f"Trailer {trailer_provider or 'direct'}: {exc}")
                self._persist(game, "trailer", 88, f"Trailer {trailer_provider or 'direct'} prêt en streaming")
        elif trailer_provider and trailer.get("embedUrl"):
            # Keep a remote fallback for titles with no downloadable store movie.
            game["trailerIsLocal"] = False
            game["trailerPosterUrl"] = trailer.get("poster") or game.get("heroImage") or ""
            self._persist(game, "trailer", 88, f"Trailer {trailer_provider} prêt en streaming")

        if appid and self.achievements.enabled:
            try:
                items = self.achievements.get(appid, language=language)
                if items:
                    game["recentAchievements"] = items
                    game["achievementsUnlocked"] = sum(1 for item in items if item.get("unlocked"))
                    game["totalAchievements"] = len(items)
                    self._persist(game, "achievements", 95, "Succès Steam synchronisés")
            except Exception as exc:
                game.setdefault("warnings", []).append(f"Steam achievements: {exc}")

        game["mediaStatus"] = "ready"
        game["warnings"] = game.get("warnings", [])[-12:]
        self._persist(game, "done", 100, "Import terminé")
        return game
