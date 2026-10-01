# Nexus 1.4 — Video-driven polish pass

This patch was driven by a real recorded launcher session. It focuses on renderer stability, controller consistency, real achievements, lower artwork memory pressure, and a complete native quit path.

## Performance
- Hero double buffering and async decode.
- No full-screen backdrop blur in common modals.
- 30 Hz controller poll, 280 ms heartbeat while asleep.
- Pillow artwork downscale after download.
- WebView DOM wakes before the native window is shown after gameplay.

## Controller/UI
- PlayStation face glyphs for DualSense/DualShock.
- Refined Home rail cards.
- Library/controller focus no longer falls into hidden hover actions.
- Interactive Collections game row.
- Quit action in top bar, sidebar and settings.

## Steam
- Real achievement sync and rarity display.
- Existing metadata/trailer/identity resolver preserved.
