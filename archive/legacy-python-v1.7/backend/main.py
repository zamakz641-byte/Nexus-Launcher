from __future__ import annotations

import logging
import os
import sys
import threading
import time
from pathlib import Path

from .api import NexusApi
from .config import APP_NAME, PATHS
from .local_server import LocalStaticServer


LOGGER = logging.getLogger("nexus.boot")


def configure_logging() -> None:
    log_file = PATHS.logs / "nexus.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        handlers=[logging.FileHandler(log_file, encoding="utf-8")],
    )


def _lifecycle_logger(name: str):
    def _handler(*_args, **_kwargs) -> None:
        LOGGER.info("WebView lifecycle: %s", name)

    return _handler


def _loaded_probe(window):
    def _handler(*_args, **_kwargs) -> None:
        LOGGER.info("WebView lifecycle: loaded")

        def probe() -> None:
            time.sleep(6.5)
            script = r'''(() => {
  const html = document.documentElement;
  const root = document.getElementById('root');
  const app = document.getElementById('nexus-root');
  const boot = document.getElementById('nexus-boot');
  const footer = document.getElementById('nexus-console-footer');
  const style = root ? getComputedStyle(root) : null;
  const appStyle = app ? getComputedStyle(app) : null;
  const footerStyle = footer ? getComputedStyle(footer) : null;
  const footerRect = footer ? footer.getBoundingClientRect() : null;
  return {
    readyState: document.readyState, bootState: html.dataset.nexusBoot || '',
    htmlClass: html.className, hasBoot: !!boot, hasRoot: !!root,
    rootChildren: root ? root.childElementCount : -1, hasNexusRoot: !!app,
    rootVisibility: style ? style.visibility : '', rootOpacity: style ? style.opacity : '',
    appVisibility: appStyle ? appStyle.visibility : '', appDisplay: appStyle ? appStyle.display : '',
    hasFooter: !!footer, footerDisplay: footerStyle ? footerStyle.display : '',
    footerVisibility: footerStyle ? footerStyle.visibility : '',
    footerOpacity: footerStyle ? footerStyle.opacity : '',
    footerPosition: footerStyle ? footerStyle.position : '',
    footerZ: footerStyle ? footerStyle.zIndex : '',
    footerBg: footerStyle ? footerStyle.backgroundColor : '',
    footerColor: footerStyle ? footerStyle.color : '',
    footerHTML: footer ? footer.innerText.slice(0, 160) : '',
    footerRect: footerRect ? [footerRect.left, footerRect.top, footerRect.width, footerRect.height] : []
  };
})()'''
            try:
                state = window.evaluate_js(script)
                LOGGER.info("Renderer state: %r", state)
                if isinstance(state, dict) and state.get('hasNexusRoot'):
                    hidden = state.get('rootVisibility') == 'hidden' or state.get('rootOpacity') == '0'
                    sleeping = 'nexus-sleep' in str(state.get('htmlClass', ''))
                    if hidden and not sleeping:
                        window.evaluate_js(r'''(() => {
  if (typeof window.__nexusBootForceReveal === 'function') {
    window.__nexusBootForceReveal();
    return;
  }
  const html = document.documentElement;
  html.classList.add('nexus-app-visible');
  html.dataset.nexusBoot = 'complete';
  document.getElementById('nexus-boot')?.remove();
})()''')
                        LOGGER.warning("Renderer self-heal forced visible root")
            except Exception:
                LOGGER.exception("Renderer probe failed")

        threading.Thread(target=probe, name='nexus-render-probe', daemon=True).start()

    return _handler


def main() -> int:
    configure_logging()
    if os.name == 'nt':
        # Hybrid-GPU laptops can occasionally produce a fully black WebView2
        # compositor in borderless/fullscreen mode. Prefer the stable software
        # compositor for the launcher UI; games remain completely unaffected.
        existing = os.environ.get('WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS', '').strip()
        stable_args = '--disable-gpu --disable-gpu-compositing'
        os.environ['WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS'] = f'{existing} {stable_args}'.strip()
        LOGGER.info('WebView2 stable compositor enabled')
    try:
        import webview
    except ImportError:
        print("pywebview n'est pas installé. Exécutez: pip install -r requirements.txt", file=sys.stderr)
        return 2

    index = PATHS.dist / "index.html"
    if not index.exists():
        print(f"Frontend introuvable: {index}. Lancez d'abord npm run build.", file=sys.stderr)
        return 3

    api = NexusApi()
    static_server = LocalStaticServer(api.bootstrap, api.startup_sound_profile)

    try:
        settings = api._storage.get_settings()
        static_server.start()
        LOGGER.info("Static server ready: %s", static_server.url)

        window = webview.create_window(
            APP_NAME,
            url=static_server.url,
            js_api=api,
            min_size=(1100, 680),
            width=1600,
            height=900,
            fullscreen=bool(settings.get("startFullscreen", True)),
            background_color="#02070d",
            text_select=False,
            zoomable=False,
        )
        api._bind_window(window)

        # Lifecycle breadcrumbs make a native WebView2 black-frame failure
        # diagnosable instead of leaving only a generic Windows exit code.
        try:
            window.events.before_show += _lifecycle_logger("before_show")
            window.events.loaded += _lifecycle_logger("loaded")
            window.events.loaded += _loaded_probe(window)
            window.events.shown += _lifecycle_logger("shown")
            window.events.closing += _lifecycle_logger("closing")
        except Exception:
            LOGGER.exception("Unable to attach one or more WebView lifecycle loggers")

        LOGGER.info("Starting pywebview (gui=%s)", "edgechromium" if os.name == "nt" else "auto")
        # Edge Chromium uses the installed WebView2 runtime, avoiding the weight of bundling CEF.
        webview.start(
            gui="edgechromium" if os.name == "nt" else None,
            debug=False,
            storage_path=str(PATHS.webview_storage),
        )
        LOGGER.info("pywebview event loop exited normally")
        return 0
    except Exception:
        LOGGER.exception("Fatal Nexus startup error")
        raise
    finally:
        try:
            static_server.stop()
        except Exception:
            LOGGER.exception("Static server cleanup failed")
        try:
            api._storage.close()
        except Exception:
            LOGGER.exception("Storage cleanup failed")


if __name__ == "__main__":
    raise SystemExit(main())
