# Nexus modules — V2.3 Player Update

## Implemented architecture

```text
frontend/backend/
├── core/moduleHost.mjs       EventBus + ModuleHost
├── modules/
│   ├── achievements.mjs      Steam/SAN lifecycle adapter
│   └── gameActivity.mjs      Nexus session journal
├── overlay/notifications.mjs Notification presentation subscriber
├── steamLocal.mjs            Read-only Steam client cache provider
├── sanInstaller.mjs          Optional verified companion installer
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
| GameStarted | Core after successful spawn: sessionId, gameId, title, game, startedAt, locale, notificationProvider | GameActivity, Achievements |
| GameStopped | Core after process tree ends: sessionId, stoppedAt, monotonic durationSeconds | GameActivity, Achievements |
| AchievementUnlocked | Verified achievement adapter: achievement and game context | Notification overlay |
| ActivityChanged | Journal write completed: gameId | Read-only UI refresh |
| ControllerConnected, ScreenshotRequested | Reserved; no producer yet | Future controller/capture adapters |
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

These are planned integrations, not shipped controls:

| Stage | Deliverables | Approach |
|---|---|---|
| V2.3 Player | Module foundation, sessions, cached Steam progress, optional SAN setup | Own implementation; real SAN/game unlock validation still needed |
| V2.4 Console | Capture, screenshots, replay, gallery, Quick Menu and audio | [GameHQ](https://github.com/UnderFusion/GameHQ) offers controller capture/replay and a borderless overlay. GPL-3.0; evaluate a separate companion/API or original implementation before reuse |
| V2.5 Continuity | Versioned backups, cloud sync, controller profiles, limited suspension | [Ludusavi](https://github.com/mtkennerly/ludusavi), MIT, is a CLI candidate. Preview backups before writes; confirm destructive restores; keep cloud credentials outside renderer |
| V3 Platform | Plugins, phone remote, Discord, HLTB, compatibility, mods and additional store achievements | Separate capabilities, authentication and compatibility tests per provider |

[GameActivity](https://github.com/Lacro59/playnite-gameactivity-plugin) and
[SuccessStory](https://github.com/Lacro59/playnite-successstory-plugin) are research
references. No source or assets from these projects were copied. FPS, temperatures,
rarity, completion estimates and save state require real providers.

Quick Resume Lite would retain supported games in RAM. It must not promise SSD
restoration or support for online/anti-cheat games. Replay recording must be opt-in
and bounded in memory/disk use. A future remote API needs explicit authenticated
pairing, not an unauthenticated launch endpoint.
