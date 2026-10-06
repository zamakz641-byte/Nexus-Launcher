# Nexus Replay

An independently runnable Windows capture engine derived from GameHQ 0.7.9.
**GPL-3.0-only**, including the Nexus-specific wrapper and modified worker. This
directory is an exception to the launcher repository's root MIT license.

Upstream: https://github.com/UnderFusion/GameHQ/tree/d42bff9df9201744154a2990d68e2b13b07031b1

## What was kept

The Windows Graphics Capture worker, H.264/AAC Media Foundation encoder, audio
capture, ring segment leases, atomic capture publication and MP4 replay export.
See `UPSTREAM.json` for exact unchanged source paths. All upstream license notices
are retained. The vendor script reproduces the extraction at the immutable commit.

## Changes

- Extract `FramePumpWorker` from the combined GUI service; remove app configuration,
  detection/UI dependencies and the Qt/QML service owner.
- Expose a documented JSON-line CLI with explicit recording commands. No gallery,
  themes, updater, SQLite database, Qt Quick/Widgets/Multimedia or FFmpeg runtime.
- Permit the existing safe BGRA readback for SDR as well as HDR screenshot frames.
- Use Nexus-owned cache paths and atomic thumbnail writes. Add safe game-folder
  names, descendant-window targeting and bounded quality/duration choices.
- Initial controller gallery/navigation is supplied by Nexus. Share/Guide capture
  bindings from upstream are not included in this first headless engine version.

No upstream branding, logos or implied endorsement are used. Nexus Replay is
developed and supported by the Nexus project.

## Build and run

Windows x64, Qt 6.8.3 Core/Gui, C++20 MinGW 13.1 or a compatible compiler, CMake/Ninja.

```powershell
cmake -S plugins/nexus-replay -B out/replay -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH=C:/Qt/6.8.3/mingw_64
cmake --build out/replay
out/replay/NexusReplay.exe --self-test
out/replay/NexusReplay.exe --data C:/NexusReplayData --captures C:/NexusCaptures
```

Send one UTF-8 JSON object per line through stdin, at most 64 KiB. Stdout contains
only protocol replies/events; Qt diagnostics go to stderr. `hello` reports protocol
1 and capabilities. `status` reports actual worker state: 0 stopped, 1 starting,
2 recording, 3 ready, 4 failed. Every command includes a string `requestId`.

- `start-buffer`: `pid`, `title`, `executable`, optional `seconds` (30/60/180/300),
  `width` (1280/1920), `fps` (30/60), `audio` (boolean). Targets only windows of that
  process or descendants. Receipt is an `ack`; `buffer-state` confirms actual work.
- `stop-buffer`: stop recording. Captures already saved remain untouched.
- `save-replay` or `screenshot`: require a recording buffer and reject concurrent
  save requests. Only `saved` with a real final path confirms a published file;
  `error` means the operation did not succeed.
- `shutdown`: orderly worker cleanup and exit. Closing stdin also exits.

Nexus installs the versioned package only after explicit opt-in and checksum
verification. Duration/quality limit the rolling disk buffer; first-run defaults
are 30 seconds, 720p, 30 FPS. Recording is per game session, not automatic desktop
recording. GPU/driver/fullscreen compatibility still requires hardware validation.
