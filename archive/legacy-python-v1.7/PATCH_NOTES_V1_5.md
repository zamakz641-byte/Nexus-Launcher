# Nexus Launcher 1.5 — Extensions, PNG UI & Startup

## Real PNG icon pass

- Replaced the Lucide runtime icon set with cached PNG artwork.
- Controller prompts now use PNG assets for PlayStation/Xbox/Switch layouts.
- The Windows launcher fetches and caches the legal, redistributable icon sets before the Vite build.

## Sound extensions

- Added `.nxsfx` sound-pack extensions.
- Sound packs are data-only: they cannot execute Python or JavaScript.
- Mandatory cues: focus, confirm, back, launch, success, toggle, hover, wake, sleep, startup.
- Incomplete packs are rejected before installation.
- Path traversal, oversized packages and unsupported audio files are rejected.
- Built-in packs: Nexus Console and Nexus Glass, both based on redistributable CC0 audio.
- Local third-party packs live under `%LOCALAPPDATA%\\NexusLauncher\\extensions\\soundpacks`.
- Proprietary console sounds are not shipped by Nexus. Users can import a local pack only when they have rights to those assets.

## Startup sequence

- Added a lightweight Nexus startup signature separate from the game-launch sequence.
- Uses only opacity/transform transitions and the cached Nexus brand image.
- Runs once per actual WebView lifetime, not when returning from a game.
- Can be disabled in Settings → Lancement.

## Motion polish

- Short view-enter transitions use transform/opacity only.
- Existing low-impact game mode and render containment remain enabled.
