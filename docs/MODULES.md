# Nexus modules — V2.4 Capture Update

## Implemented architecture

```text
frontend/backend/
├── core/moduleHost.mjs       EventBus + ModuleHost
├── modules/
│   ├── achievements.mjs      Steam/SAN lifecycle adapter
│   ├── gameActivity.mjs      Nexus session journal
│   └── capture.mjs           Explicit PNG capture and read-only media index
├── overlay/notifications.mjs Notification presentation subscriber
├── steamLocal.mjs            Read-only Steam client cache provider
├── sanInstaller.mjs          Optional verified companion installer
├── gamehqCompanion.mjs       Optional recorder lifecycle and installation detection
├── gamehqPipe.mjs            Capability-negotiated local GameHQ protocol
├── captureMedia.mjs          Authorized image/video streaming with Range support
└── main.mjs                 Electron/IPC, authorized launches, lifecycle events
```

The backend registers trusted internal modules at startup. Each module receives
`start({on, publish})` and may implement `stop()`. `on` registers subscriptions owned
by that module; shutdown removes them and drains queued work. Each module handles
events in order. Listener failures mark the module degraded without rejecting
other listeners or game launch. `getModuleStatus` is read-only diagnostic IPC.
This is an internal module system, not a public plugin loader or a sandbox for
third-party executable code.

Payloads are cloned and deeply frozen. Do not await an event from inside a handler
when it has another listener in the same module: the serialized queue would wait
on itself. Secondary notifications use `void publish(...)`. The renderer cannot
publish core events. Native operations remain behind validated main-process IPC.

| Event | Producer / payload | Current consumers |
|---|---|---|
| GameStarted | Core after successful spawn: sessionId, gameId, title, game, startedAt, locale, notificationProvider | GameActivity, Achievements, Capture |
| GameStopped | Core after process tree ends: sessionId, stoppedAt, monotonic durationSeconds | GameActivity, Achievements, Capture |
| AchievementUnlocked | Verified achievement adapter: achievement and game context | Notification overlay |
| ActivityChanged | Journal write completed: gameId | Read-only UI refresh |
| ScreenshotRequested | Internal capture hook; current trusted IPC/shortcut invokes Capture directly | Capture |
| CaptureSaved | Capture after a successful PNG write: id, kind, gameId, gameTitle, locale | Native notification and gallery refresh |
| ControllerConnected | Reserved; no producer yet | Future controller adapters |
| GameSuspended, GameResumed | Reserved; no producer yet | Future compatibility-gated suspension |

SAN presents its own notifications. The built-in monitor rejects cached Steam
results and does not derive live unlocks from them. SAN does not yet publish unlocks
back into this bus. Nexus cannot claim per-session trophy counts or complete live
in-app synchronization.

## Activity and Steam data

`game-activity.json` stores at most 2,000 sessions with atomic serialized writes.
Recent sessions appear in game details; read-only IPC returns at most ten. Duration
uses the actual process session and a monotonic clock. Existing Nexus playtime is
preserved. Closing Nexus while a game runs leaves an interrupted session on restart,
with unknown duration. Games launched outside Nexus are not tracked.

Steam local profile data, playtime and available achievement highlights come from
Steam's cache. It may be old, incomplete or unavailable. Missing data never becomes
zero unlocks. Unknown cached AppIDs do not clutter the Accounts library; their
playtime remains available for recognized local games. Steam and Nexus totals stay
separate and must never be added together.

## Roadmap and research

### Capture shipped in V2.4

Native capture is explicitly invoked and writes PNGs under Videos/Nexus, grouped by
the current Nexus session. Ctrl+Shift+F8 works while Nexus runs; registration status
is available through IPC. Capture drains pending image writes before shutdown.
Imported media is read-only, favorites live in Nexus preferences, and the gallery
never uploads files. Media requests authorize only indexed IDs and recheck realpaths.
Scanning skips symlinks, visits at most 10,000 entries to depth four, and returns the
500 newest images/videos. Clips stream from disk with byte-range support.

Nexus Replay replaces the external companion in V2.4. The launcher hosts a bounded GitHub plugin installer, per-file SHA256 verification and a standalone JSON-line runtime. The optional GPL-3.0 engine lives in plugins/nexus-replay and publishes its own binary/source releases. Runtime states report actual capture readiness; pending exports drain before exit. No Qt or recording binaries belong in the base app. SAN remains an independent companion until its source and license are reviewed separately.
