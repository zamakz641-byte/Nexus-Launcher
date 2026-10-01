from __future__ import annotations

import time
from pathlib import Path

from backend.jobs import JobManager
from backend.providers import SteamGridDbProvider, SteamStoreProvider
from backend.sources import infer_manual_candidate, scan_steam
from backend.storage import Storage
from backend.vdf import get_root, parse_vdf


def test_vdf_and_steam_scan(tmp_path: Path):
    root = tmp_path / "Steam"
    steamapps = root / "steamapps"
    game_dir = steamapps / "common" / "Nexus Test Game"
    game_dir.mkdir(parents=True)
    exe = game_dir / "NexusTest.exe"
    exe.write_bytes(b"MZ" + b"0" * 5000)

    (steamapps / "appmanifest_424242.acf").write_text(
        '"AppState"\n{\n"appid" "424242"\n"name" "Nexus Test Game"\n"installdir" "Nexus Test Game"\n"SizeOnDisk" "987654321"\n}',
        encoding="utf-8",
    )
    parsed = get_root(parse_vdf((steamapps / "appmanifest_424242.acf").read_text()))
    assert parsed["name"] == "Nexus Test Game"

    games = scan_steam(root)
    assert len(games) == 1
    assert games[0]["steamAppId"] == "424242"
    assert games[0]["title"] == "Nexus Test Game"
    assert games[0]["launchUri"] == "steam://rungameid/424242"
    assert games[0]["executablePath"].endswith("NexusTest.exe")


def test_storage_roundtrip_and_sessions(tmp_path: Path):
    storage = Storage(tmp_path / "nexus.db")
    game = storage.upsert_game({
        "id": "g1",
        "title": "Game One",
        "playtimeSeconds": 120,
        "isFavorite": False,
    })
    assert game["id"] == "g1"
    assert storage.get_game("g1")["title"] == "Game One"

    settings = storage.update_settings({"sfxVolume": 0.2, "hideDuringGame": True, "unknown": 123})
    assert settings["sfxVolume"] == 0.2
    assert "unknown" not in settings

    session = storage.add_session(
        "g1", "Game One", "2026-01-01T10:00:00+00:00", "2026-01-01T11:00:00+00:00", 3600
    )
    assert session["durationMinutes"] == 60
    updated = storage.get_game("g1")
    assert updated["playtimeSeconds"] == 3720
    assert len(storage.list_sessions()) == 1
    storage.close()


def test_job_manager_reports_frontend_shape():
    jobs = JobManager()

    def worker(progress):
        progress("media", 55, "Téléchargement")
        return {"ok": True}

    job_id = jobs.start(worker)
    deadline = time.time() + 2
    job = jobs.get(job_id)
    while job and job["status"] not in {"done", "error"} and time.time() < deadline:
        time.sleep(0.02)
        job = jobs.get(job_id)
    assert job is not None
    assert job["status"] == "done"
    assert job["progress"] == 100
    assert job["result"] == {"ok": True}


def test_store_metadata_is_real_data_mapping():
    base = {"title": "Old", "genres": []}
    result = SteamStoreProvider.apply_metadata(base, {
        "name": "New",
        "short_description": "<b>Hello</b> world",
        "developers": ["Studio"],
        "publishers": ["Publisher"],
        "genres": [{"description": "Action"}],
        "release_date": {"date": "14 Sep, 2026"},
        "header_image": "https://example.test/header.jpg",
        "background_raw": "https://example.test/bg.jpg",
        "screenshots": [{"path_full": "https://example.test/shot.jpg"}],
        "movies": [{"thumbnail": "https://example.test/poster.jpg", "mp4": {"max": "https://example.test/trailer.mp4"}}],
    })
    assert result["title"] == "New"
    assert result["description"] == "Hello  world"
    assert result["genres"] == ["Action"]
    assert result["releaseYear"] == 2026
    assert result["remoteTrailerUrl"].endswith("trailer.mp4")


def test_steamgriddb_asset_choice_prefers_correct_shape():
    items = [
        {"url": "https://x/landscape.jpg", "width": 1920, "height": 620, "score": 900},
        {"url": "https://x/portrait.jpg", "width": 600, "height": 900, "score": 5},
    ]
    chosen = SteamGridDbProvider.choose_asset(items, "grids")
    assert chosen["url"].endswith("portrait.jpg")


def test_manual_candidate_uses_parent_for_generic_exe(tmp_path: Path):
    folder = tmp_path / "Beautiful Game"
    folder.mkdir()
    exe = folder / "game.exe"
    exe.write_bytes(b"MZ")
    candidate = infer_manual_candidate(str(exe))
    assert candidate["title"] == "Beautiful Game"
    assert candidate["source"] == "manual"


def test_store_search_only_accepts_strong_match():
    class FakeHttp:
        def get_json(self, *_args, **_kwargs):
            return {
                "total": 3,
                "items": [
                    {"id": 11, "name": "Completely Different Game"},
                    {"id": 22, "name": "Nexus Adventure - Deluxe Edition"},
                    {"id": 33, "name": "Nexus Adventures 2"},
                ],
            }

    provider = SteamStoreProvider(FakeHttp())  # type: ignore[arg-type]
    result = provider.search_app("Nexus Adventure")
    assert result is not None
    assert result["id"] == 22

    class WrongHttp:
        def get_json(self, *_args, **_kwargs):
            return {"total": 1, "items": [{"id": 44, "name": "Unrelated Racing Simulator"}]}

    provider = SteamStoreProvider(WrongHttp())  # type: ignore[arg-type]
    assert provider.search_app("Nexus Adventure") is None


def test_frontend_contains_no_seeded_fake_library():
    root = Path(__file__).resolve().parents[1]
    src = root / "src"
    combined = "\n".join(
        path.read_text(encoding="utf-8", errors="ignore")
        for path in src.rglob("*")
        if path.is_file() and path.suffix in {".ts", ".tsx", ".css"}
    )
    forbidden = [
        "mockGames",
        "images.unsplash.com",
        "Top 1%",
        "Niveau Maître",
        "846 sessions",
        r"C:\\Games\\",
    ]
    for token in forbidden:
        assert token not in combined, f"Seed/demo token still present: {token}"


def test_metadata_resolver_separates_library_origin_from_metadata_source():
    from backend.metadata_resolver import MetadataResolver, MetadataSource

    epic_game = {"source": "epic", "title": "Library Title", "description": ""}
    merged = MetadataResolver("epic").merge(
        epic_game,
        [
            MetadataSource("steam", {"title": "Steam Title", "description": "Steam description", "genres": ["Action"]}),
            MetadataSource("igdb", {"title": "IGDB Title", "description": "IGDB description", "genres": ["RPG"]}),
        ],
    )
    assert merged["title"] == "Library Title"
    assert merged["description"] == "IGDB description"
    assert merged["genres"] == ["RPG"]
    assert merged["metadataSources"]["description"] == "igdb"


def test_igdb_metadata_mapping_without_network():
    from backend.providers import IgdbProvider

    meta = IgdbProvider.to_metadata({
        "id": 123,
        "name": "Example Game",
        "summary": "A real summary",
        "first_release_date": 1704067200,
        "genres": [{"name": "RPG"}],
        "cover": {"image_id": "cover123"},
        "artworks": [{"image_id": "art123"}],
        "screenshots": [{"image_id": "shot123"}],
        "involved_companies": [
            {"developer": True, "publisher": False, "company": {"name": "Dev Studio"}},
            {"developer": False, "publisher": True, "company": {"name": "Pub Studio"}},
        ],
    })
    assert meta["title"] == "Example Game"
    assert meta["description"] == "A real summary"
    assert meta["developer"] == "Dev Studio"
    assert meta["publisher"] == "Pub Studio"
    assert meta["genres"] == ["RPG"]
    assert "cover123" in meta["igdbCoverUrl"]
    assert "art123" in meta["igdbBackgroundUrl"]


def test_steam_trailer_selection_prefers_named_trailer():
    movies = [
        {"name": "Gameplay Overview", "mp4": {"max": "https://cdn/gameplay.mp4"}},
        {"name": "Official Launch Trailer", "thumbnail": "https://cdn/poster.jpg", "mp4": {"max": "https://cdn/launch.mp4"}},
        {"name": "Teaser", "mp4": {"max": "https://cdn/teaser.mp4"}},
    ]
    result = SteamStoreProvider.best_trailer(movies)
    assert result is not None
    assert result["url"].endswith("launch.mp4")
    assert result["poster"].endswith("poster.jpg")


def test_igdb_trailer_fallback_and_resolver():
    from backend.metadata_resolver import MetadataResolver
    from backend.providers import IgdbProvider

    meta = IgdbProvider.trailer_metadata([
        {"name": "Gameplay", "video_id": "abc123DEF45"},
        {"name": "Official Trailer", "video_id": "xyz987ABC12"},
    ])
    assert "xyz987ABC12" in meta["igdbTrailerEmbedUrl"]
    assert "youtube-nocookie.com" in meta["igdbTrailerEmbedUrl"]

    provider, trailer = MetadataResolver.choose_trailer({
        "igdb": {
            "embedUrl": meta["igdbTrailerEmbedUrl"],
            "poster": meta["igdbTrailerPosterUrl"],
            "mode": "embed",
        }
    }, "epic")
    assert provider == "igdb"
    assert trailer["mode"] == "embed"


def test_cached_media_uses_same_origin_route():
    import backend.providers as providers
    image = providers.PATHS.media / "__pytest_media__" / "cover.jpg"
    image.parent.mkdir(parents=True, exist_ok=True)
    image.write_bytes(b"jpg")
    try:
        url = providers.file_uri(image)
        assert url.startswith("/__nexus_media__/__pytest_media__/cover.jpg?v=")
    finally:
        image.unlink(missing_ok=True)
        image.parent.rmdir()


def test_title_normalization_splits_executable_style_names():
    from backend.providers import SteamStoreProvider
    assert SteamStoreProvider._normalized_title("FIFA23") == "fifa 23"
    assert SteamStoreProvider._normalized_title("motogp26 Win64 Shipping") == "motogp 26"


def test_unversioned_title_with_year_variants_requires_identity_picker():
    class FakeHttp:
        def get_json(self, *_args, **_kwargs):
            return {
                "total": 3,
                "items": [
                    {"id": 1665460, "name": "eFootball", "tiny_image": "https://cdn/efootball.jpg"},
                    {"id": 2022001, "name": "eFootball 2022", "tiny_image": "https://cdn/2022.jpg"},
                    {"id": 2021001, "name": "eFootball PES 2021", "tiny_image": "https://cdn/2021.jpg"},
                ],
            }

    provider = SteamStoreProvider(FakeHttp())  # type: ignore[arg-type]
    candidates = provider.search_candidates("eFootball")
    assert candidates[0]["title"] == "eFootball"
    assert any(item["title"] == "eFootball 2022" for item in candidates)
    # Auto-enrichment must not silently pick the latest/current live-service entry.
    assert provider.search_app("eFootball") is None


def test_language_settings_roundtrip(tmp_path: Path):
    storage = Storage(tmp_path / "nexus-language.db")
    settings = storage.update_settings({
        "language": "es",
        "metadataLanguage": "fr",
        "sfxPack": "nexus-modern",
    })
    assert settings["language"] == "es"
    assert settings["metadataLanguage"] == "fr"
    assert settings["sfxPack"] == "nexus-glass"
    storage.close()


def test_launcher_spec_does_not_request_global_admin():
    root = Path(__file__).resolve().parents[1]
    spec = (root / "NexusLauncher.spec").read_text(encoding="utf-8", errors="ignore").casefold()
    assert "uac_admin=true" not in spec
    assert "uac_admin = true" not in spec


def test_youtube_trailer_is_last_resort_after_store_and_igdb():
    from backend.metadata_resolver import MetadataResolver

    youtube = {
        "embedUrl": "https://www.youtube-nocookie.com/embed/abc123DEF45?rel=0",
        "name": "Official Trailer",
        "mode": "embed",
    }
    provider, trailer = MetadataResolver.choose_trailer({"youtube": youtube}, "manual")
    assert provider == "youtube"
    assert trailer["mode"] == "embed"

    provider, trailer = MetadataResolver.choose_trailer({
        "youtube": youtube,
        "steam": {"url": "https://cdn.example/trailer.mp4", "mode": "direct"},
    }, "manual")
    assert provider == "steam"
    assert trailer["mode"] == "direct"


def test_loopback_bootstrap_endpoint_is_available_without_pywebview_bridge():
    import json
    import urllib.request
    from backend.local_server import LocalStaticServer

    snapshot = {
        "version": "test",
        "games": [{"id": "persisted", "title": "Persisted Game"}],
        "sessions": [],
        "settings": {},
        "activeGame": None,
        "dataDirectory": "",
        "platform": "nt",
    }
    server = LocalStaticServer(lambda: snapshot)
    server.start()
    try:
        with urllib.request.urlopen(server.url.rsplit('/', 1)[0] + '/__nexus_bootstrap__.json', timeout=2) as response:
            payload = json.loads(response.read().decode('utf-8'))
        assert payload["games"][0]["id"] == "persisted"
        assert payload["version"] == "test"
    finally:
        server.stop()


def test_artwork_optimizer_caps_hero_resolution(tmp_path):
    from PIL import Image
    from backend.providers import optimize_cached_image
    image = tmp_path / "hero.jpg"
    Image.new("RGB", (3200, 1800), (30, 40, 50)).save(image, quality=95)
    optimize_cached_image(image, "hero")
    with Image.open(image) as result:
        assert result.width <= 1920
        assert result.height <= 1080


def _write_complete_sound_pack(root: Path, pack_id: str = "test.complete"):
    import json
    cues = {}
    from backend.extensions import REQUIRED_SOUND_CUES
    for cue in REQUIRED_SOUND_CUES:
        name = f"{cue}.wav"
        (root / name).write_bytes(b"RIFF" + (36).to_bytes(4, "little") + b"WAVEfmt " + (16).to_bytes(4, "little") + (1).to_bytes(2, "little") + (1).to_bytes(2, "little") + (8000).to_bytes(4, "little") + (16000).to_bytes(4, "little") + (2).to_bytes(2, "little") + (16).to_bytes(2, "little") + b"data" + (0).to_bytes(4, "little"))
        cues[cue] = {"file": name, "gain": 0.5}
    (root / "extension.json").write_text(json.dumps({
        "schema": 1,
        "id": pack_id,
        "name": "Complete Test Pack",
        "author": "Tests",
        "version": "1.0.0",
        "type": "soundpack",
        "license": "CC0-1.0",
        "cues": cues,
    }), encoding="utf-8")


def test_sound_pack_validator_accepts_complete_pack(tmp_path: Path):
    from backend.extensions import validate_sound_pack
    _write_complete_sound_pack(tmp_path)
    result = validate_sound_pack(tmp_path)
    assert result.manifest["id"] == "test.complete"
    assert set(result.manifest["cues"]) >= {"startup", "launch", "focus", "back"}


def test_sound_pack_validator_rejects_missing_cue(tmp_path: Path):
    import json
    import pytest
    from backend.extensions import validate_sound_pack
    _write_complete_sound_pack(tmp_path)
    manifest = json.loads((tmp_path / "extension.json").read_text(encoding="utf-8"))
    del manifest["cues"]["startup"]
    (tmp_path / "extension.json").write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(ValueError, match="Pack incomplet"):
        validate_sound_pack(tmp_path)


def test_sound_pack_validator_rejects_path_traversal(tmp_path: Path):
    import json
    import pytest
    from backend.extensions import validate_sound_pack
    _write_complete_sound_pack(tmp_path)
    manifest = json.loads((tmp_path / "extension.json").read_text(encoding="utf-8"))
    manifest["cues"]["focus"] = {"file": "../focus.wav"}
    (tmp_path / "extension.json").write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(ValueError, match="Chemin audio invalide"):
        validate_sound_pack(tmp_path)


def test_sound_pack_http_registry_has_builtins():
    import json
    import urllib.request
    from backend.local_server import LocalStaticServer
    server = LocalStaticServer(lambda: {"games": [], "sessions": [], "settings": {}})
    server.start()
    try:
        base = server.url.rsplit('/', 1)[0]
        with urllib.request.urlopen(base + '/__nexus_soundpacks__.json', timeout=2) as response:
            payload = json.loads(response.read().decode('utf-8'))
        ids = {pack['id'] for pack in payload['packs']}
        assert {'nexus-console', 'nexus-glass'} <= ids
    finally:
        server.stop()


def test_pywebview_api_has_no_public_runtime_state():
    """Regression for pywebview 6.2.1 recursive js_api discovery on Windows.

    Public non-callable attributes are recursively inspected by pywebview. A
    Window/Storage/JobManager object there can walk into native objects forever.
    """
    import ast

    root = Path(__file__).resolve().parents[1]
    tree = ast.parse((root / "backend" / "api.py").read_text(encoding="utf-8"))
    api_class = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "NexusApi")
    init = next(node for node in api_class.body if isinstance(node, ast.FunctionDef) and node.name == "__init__")
    assigned: set[str] = set()
    for node in ast.walk(init):
        targets = []
        if isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = list(node.targets) if isinstance(node, ast.Assign) else [node.target]
        for target in targets:
            if isinstance(target, ast.Attribute) and isinstance(target.value, ast.Name) and target.value.id == "self":
                assigned.add(target.attr)
    assert assigned
    assert all(name.startswith("_") for name in assigned), f"Public runtime state exposed to pywebview: {assigned}"
    assert not any(isinstance(node, ast.FunctionDef) and node.name == "bind_window" for node in api_class.body)


def test_host_main_never_uses_public_runtime_state():
    """The desktop host must use NexusApi private runtime fields.

    v1.6.1 privatized storage/jobs/window to stop pywebview recursion but main.py
    still read api.storage, causing an AttributeError before WebView2 started.
    """
    root = Path(__file__).resolve().parents[1]
    source = (root / "backend" / "main.py").read_text(encoding="utf-8")
    forbidden = ("api.storage", "api.jobs", "api.launcher", "api.window")
    assert not any(token in source for token in forbidden), source
    assert "api._storage.get_settings()" in source
    assert "api._storage.close()" in source


def test_push_script_does_not_probe_missing_origin_with_get_url():
    """Windows PowerShell 5.1 turns missing-origin stderr into NativeCommandError."""
    root = Path(__file__).resolve().parents[1]
    source = (root / "scripts" / "push_github.ps1").read_text(encoding="utf-8")
    assert "remote get-url origin" not in source
    assert '$remotes = @(& git remote)' in source
    assert 'remote add origin $Repo' in source
