from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_raw_boot_screen_precedes_react_root():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    boot_pos = html.find('id="nexus-boot"')
    root_pos = html.find('id="root"')
    module_pos = html.find('src="/src/main.tsx"')
    assert 0 <= boot_pos < root_pos < module_pos
    assert "#root" in html and "visibility: hidden" in html


def test_boot_has_console_length_and_two_phase_handoff():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "MINIMUM_VISIBLE_MS = 4600" in html
    assert "POST_READY_SETTLE_MS = 760" in html
    assert "UNDERLAY_PAINT_MS = 560" in html
    assert "nexus-app-underlay" in html
    assert "nexus-boot-handoff" in html
    assert "beginHandoff" in html


def test_http_snapshot_does_not_bypass_native_bridge():
    native = (ROOT / "src" / "services" / "native.ts").read_text(encoding="utf-8")
    snapshot_pos = native.find("if (snapshot) {")
    bridge_pos = native.find("await waitForNative(14000);", snapshot_pos)
    return_pos = native.find("return snapshot;", snapshot_pos)
    assert 0 <= snapshot_pos < bridge_pos < return_pos


def test_react_releases_boot_only_after_stable_first_frame():
    app = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
    store = (ROOT / "src" / "store" / "useLauncherStore.ts").read_text(encoding="utf-8")
    assert "if (!ready || bootReleasedRef.current) return;" in app
    assert "waitForStableFirstFrame" in app
    assert "document.fonts" in app
    assert "requestAnimationFrame(() => requestAnimationFrame" in app
    assert "window.__nexusBootReady?." in app
    assert "const [ready, setReady] = useState(false);" in store


def test_failed_native_boot_does_not_reveal_half_connected_ui():
    store = (ROOT / "src" / "store" / "useLauncherStore.ts").read_text(encoding="utf-8")
    failure_comment = "A failed native bootstrap is not a usable launcher"
    assert failure_comment in store
    tail = store[store.find(failure_comment):store.find("const onStarted", store.find(failure_comment))]
    assert "window.__nexusBootFail?.(message);" in tail
    assert "setReady(true)" not in tail


def test_stale_game_started_event_cannot_hide_renderer_during_boot():
    store = (ROOT / "src" / "store" / "useLauncherStore.ts").read_text(encoding="utf-8")
    assert "dataset.nexusBoot !== 'complete'" in store
    assert "classList.add('nexus-sleep')" in store


def test_old_react_startup_overlay_is_not_mounted():
    app = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
    assert "StartupOverlay" not in app


def test_renderer_recovery_can_escape_startup_gate():
    boundary = (ROOT / "src" / "components" / "ErrorBoundary.tsx").read_text(encoding="utf-8")
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "__nexusBootForceReveal" in boundary
    assert "Mode récupération" in boundary
    assert "__nexusBootFail" in html
    assert "Afficher le diagnostic" in html


def test_completed_handoff_removes_temporary_underlay_class():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "classList.remove('nexus-boot-handoff', 'nexus-app-underlay')" in html
    assert "classList.add('nexus-app-visible')" in html


def test_native_window_lifecycle_is_logged_and_cleanup_is_finally_guarded():
    main_py = (ROOT / "backend" / "main.py").read_text(encoding="utf-8")
    assert 'window.events.before_show += _lifecycle_logger("before_show")' in main_py
    assert 'window.events.loaded += _lifecycle_logger("loaded")' in main_py
    assert 'window.events.shown += _lifecycle_logger("shown")' in main_py
    assert "finally:" in main_py
    assert "static_server.stop()" in main_py
    assert "api._storage.close()" in main_py


def test_selected_soundpack_startup_cue_begins_in_raw_boot_shell():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    app = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
    server = (ROOT / "backend" / "local_server.py").read_text(encoding="utf-8")
    main_py = (ROOT / "backend" / "main.py").read_text(encoding="utf-8")
    assert "/__nexus_startup_sound__.json" in html
    assert "playRawBootAudio" in html
    assert "window.__nexusBootAudioStarted = true" in html
    assert "!window.__nexusBootAudioStarted" in app
    assert 'STARTUP_SOUND_PATH = "/__nexus_startup_sound__.json"' in server
    assert "api.startup_sound_profile" in main_py
