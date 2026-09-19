from __future__ import annotations

import contextlib
import json
import mimetypes
import posixpath
import threading
import urllib.parse
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable

from .config import PATHS
from .extensions import list_sound_packs

MEDIA_PREFIX = "/__nexus_media__/"
EXTENSION_PREFIX = "/__nexus_extension__/"
BOOTSTRAP_PATH = "/__nexus_bootstrap__.json"
SOUND_PACKS_PATH = "/__nexus_soundpacks__.json"
STARTUP_SOUND_PATH = "/__nexus_startup_sound__.json"


def _safe_join(root: Path, relative_url: str) -> Path | None:
    decoded = urllib.parse.unquote(relative_url)
    # Normalise URL separators before resolving on Windows.
    clean = posixpath.normpath("/" + decoded).lstrip("/")
    candidate = (root / Path(clean)).resolve()
    root_resolved = root.resolve()
    try:
        candidate.relative_to(root_resolved)
    except ValueError:
        return None
    return candidate


class NexusStaticHandler(BaseHTTPRequestHandler):
    server_version = "NexusLocal/1.0"

    def log_message(self, *_args):
        return

    def _resolve(self) -> Path | None:
        path = urllib.parse.urlsplit(self.path).path
        if path.startswith(MEDIA_PREFIX):
            return _safe_join(PATHS.media, path[len(MEDIA_PREFIX):])
        if path.startswith(EXTENSION_PREFIX):
            return _safe_join(PATHS.extensions, path[len(EXTENSION_PREFIX):])
        rel = path.lstrip("/") or "index.html"
        candidate = _safe_join(PATHS.dist, rel)
        if candidate and candidate.exists() and candidate.is_file():
            return candidate
        # React is state-driven rather than route-driven today, but this makes
        # direct navigation resilient if routes are added later.
        fallback = PATHS.dist / "index.html"
        return fallback if fallback.exists() else None

    def do_HEAD(self):
        self._send_file(send_body=False)

    def do_GET(self):
        path = urllib.parse.urlsplit(self.path).path
        if path == BOOTSTRAP_PATH:
            self._send_bootstrap()
            return
        if path == SOUND_PACKS_PATH:
            self._send_sound_packs()
            return
        if path == STARTUP_SOUND_PATH:
            self._send_startup_sound()
            return
        self._send_file(send_body=True)

    def _send_bootstrap(self):
        provider = getattr(self.server, "nexus_bootstrap_provider", None)
        if not callable(provider):
            self.send_error(HTTPStatus.SERVICE_UNAVAILABLE)
            return
        try:
            payload = json.dumps(provider(), ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            with contextlib.suppress(Exception):
                self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR)

    def _send_startup_sound(self):
        provider = getattr(self.server, "nexus_startup_sound_provider", None)
        if not callable(provider):
            self.send_error(HTTPStatus.SERVICE_UNAVAILABLE)
            return
        try:
            payload = json.dumps(provider(), ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            with contextlib.suppress(Exception):
                self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR)

    def _send_sound_packs(self):
        try:
            payload = json.dumps({"packs": list_sound_packs()}, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            with contextlib.suppress(Exception):
                self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR)

    def _send_file(self, *, send_body: bool):
        target = self._resolve()
        if not target or not target.exists() or not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            stat = target.stat()
            total_size = stat.st_size
            content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
            start = 0
            end = max(0, total_size - 1)
            status = HTTPStatus.OK
            range_header = self.headers.get("Range", "")
            if range_header.startswith("bytes=") and total_size:
                raw = range_header[6:].split(",", 1)[0].strip()
                first, _, last = raw.partition("-")
                try:
                    if first:
                        start = max(0, min(int(first), total_size - 1))
                        end = max(start, min(int(last), total_size - 1)) if last else total_size - 1
                    elif last:
                        length = max(1, min(int(last), total_size))
                        start = total_size - length
                        end = total_size - 1
                    status = HTTPStatus.PARTIAL_CONTENT
                except ValueError:
                    start, end, status = 0, total_size - 1, HTTPStatus.OK

            content_length = max(0, end - start + 1)
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(content_length))
            self.send_header("Accept-Ranges", "bytes")
            if status == HTTPStatus.PARTIAL_CONTENT:
                self.send_header("Content-Range", f"bytes {start}-{end}/{total_size}")
            self.send_header("Cache-Control", "public, max-age=31536000, immutable" if self.path.startswith((MEDIA_PREFIX, EXTENSION_PREFIX)) else "no-cache")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            if send_body and content_length:
                remaining = content_length
                with target.open("rb") as fh:
                    fh.seek(start)
                    while remaining > 0:
                        chunk = fh.read(min(256 * 1024, remaining))
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except OSError:
            with contextlib.suppress(Exception):
                self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR)



class LocalStaticServer:
    def __init__(
        self,
        bootstrap_provider: Callable[[], dict[str, Any]] | None = None,
        startup_sound_provider: Callable[[], dict[str, Any]] | None = None,
    ):
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), NexusStaticHandler)
        self.httpd.nexus_bootstrap_provider = bootstrap_provider  # type: ignore[attr-defined]
        self.httpd.nexus_startup_sound_provider = startup_sound_provider  # type: ignore[attr-defined]
        self.thread = threading.Thread(target=self.httpd.serve_forever, name="nexus-static", daemon=True)

    @property
    def url(self) -> str:
        host, port = self.httpd.server_address[:2]
        return f"http://{host}:{port}/index.html"

    def start(self) -> None:
        self.thread.start()

    def stop(self) -> None:
        self.httpd.shutdown()
        self.httpd.server_close()
