# Third-party notices

## Kenney — Interface Sounds

Nexus uses selected unmodified WAV one-shots from **Kenney Interface Sounds** for controller/menu feedback.

- Project: https://kenney.nl/assets/interface-sounds
- Lossless WAV mirror used by the fetch script: https://github.com/Calinou/kenney-interface-sounds
- License: **Creative Commons CC0 1.0 Universal**

The Windows development/build scripts fetch only the small subset used by Nexus and cache it under `public/sfx/kenney/`. Nexus does not include ripped PlayStation, Xbox, Nintendo, Steam Big Picture, or other proprietary console UI audio.

## Meritite Union — Input Prompts

Nexus downloads the PNG controller prompts used by the footer and controller hints from **Meritite Union Input Prompts**.

- Project: https://github.com/meritite-union/input-prompts
- Assets used: PNG 256 variants for PlayStation, Xbox and Nintendo-style controller prompts
- License: **Creative Commons CC0 1.0 Universal**

These are independent input-prompt graphics, not Sony/Microsoft/Nintendo artwork copied from a console firmware.

## Material Icons PNG

Nexus downloads pre-rendered PNG UI icons from the `material-icons/material-icons-png` mirror of Google Material Icons.

- Project: https://github.com/material-icons/material-icons-png
- Upstream design system: Google Material Icons
- License: **Apache License 2.0**

Nexus uses the raster PNG files at runtime; the visible navigation icons are not drawn from inline SVG paths by the launcher.
