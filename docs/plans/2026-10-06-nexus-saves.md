# Nexus Saves — optional continuity plugin

## Execution record

- Native library pinned to Ludusavi commit 70f4abb31497fa5ed9b0d24098200f3662d6fda9.
- Backend, independent plugin policy, trusted IPC and compact console glass UI implemented.
- Review fixed launch reservations, teardown serialization, recovery of absent
  live saves, and settling subprocess failures only after confirmed exit.
- Separate Recovery layout avoids pruning the selected backup during protection.
- Verification: 111 Node tests + 38 React/utility tests passed; TypeScript passed.
- Visual fixture QA passed in FR/EN at 1920×1080 and 640×720, with no horizontal
  overflow, restore confirmation and Escape focus restoration.
- Windows native fixture backup/restore passed CI. Dependency license collection
  needs cargo-about's explicit cli feature; collector pinned to version 0.9.2.
- Cloud syncing remains owned by an existing client. This is not provider OAuth
  or confirmed upload status. Games outside Nexus must be closed by the user.
- Packaging/publication verification is performed after the above checks.

The user approved optional Nexus plugins downloaded from this repository, with
integrated console glass controls and no upstream application window. The next
roadmap module is save protection after Capture and GameActivity.

## Outcome

- A small native Nexus Saves tool links the immutable Ludusavi MIT library with
  `default-features = false`: no Iced GUI, renderer, dialog framework or updater.
- A second independently versioned plugin installs through the existing bounded
  GitHub downloader. Replay preferences and binaries must remain independent.
- The user chooses a backup destination in the native folder picker. Nexus writes
  only into its `Nexus Saves` child directory. A cloud client's sync status is
  unknown: the UI says local backup, never claims a confirmed cloud upload.
- Game details expose detected saves, backup now, version history and explicit
  restore confirmation. Match exact title or verified Steam ID automatically;
  unknown games remain unknown, and no operation falls back to all games.
- Optional backup after a tracked game exits. Restore is blocked while the game
  runs. Before a restore, protect the current saves with a fresh backup; a failed
  protection or restore must remain an error.
- FR/EN copy, compact glass cards, readable modal, controller focus restoration.

## Tasks

1. Pin upstream commit/license and implement bounded standalone JSON commands
   using Ludusavi's public API. Configure private data, 5 full versions, no cloud
   subprocesses and no store screenshots. Test with synthetic saves only.
2. Generalize PluginManager with two hardcoded trusted native policies, separate
   registries, exact entry/license/archive validation; keep existing Replay paths.
3. Implement SavesModule: bounded native subprocess, approved destination,
   manifest cache, exact mapping, preview, backup, version list, restore token,
   automatic exit opt-in and shutdown drain. Never log save contents.
4. Connect trusted IPC and real game sessions; add reusable glass plugin controls
   and per-game Save dialog without adding another global navigation item.
5. Test independent plugin state, failed/empty/partial saves, restore while running,
   stale tokens, interrupted shutdown and preservation before restore.
6. Build/publish plugin and source with measured sizes and preserved MIT notices.
   Verify fixture backup/restore, then publish launcher patch with bilingual notes.

## Initial limits

Native cloud provider authentication/rclone, conflict resolution between devices,
custom save rules and RAM suspension belong to later work. Choosing an existing
OneDrive/Dropbox folder delegates upload to that client's own synchronization.
