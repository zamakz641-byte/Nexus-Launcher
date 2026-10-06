# Nexus optional plugins implementation plan

**Goal:** Download optional Nexus extensions from the user's GitHub releases without
bundling their native dependencies in the launcher. Keep all ordinary controls in
the existing console liquid glass UI.

**Architecture:** A trusted plugin catalog describes versions, download size,
permissions and license. The host installs a bounded, verified package atomically
under user data, starts an optional native executable through a documented JSON
protocol and disables/removes only files owned by the plugin. Native engines are
separate, independently runnable tools; no downloaded JavaScript enters Electron.

**Tech stack:** Electron/Node host, React FR/EN UI, C++20/Qt Core+Gui/Windows WGC and
Media Foundation for a GPL-3.0-only Nexus Replay engine derived from GameHQ 0.7.9.

## Durable user decisions

- User explicitly replaces the external GameHQ installer approach with a Nexus
  extension derived from understood upstream code, downloaded from their GitHub.
- Preserve original console/glass atmosphere. Avoid a second application's gallery,
  branding, installer, themes, settings window or lengthy onboarding explanations.
- Show actual download and installed sizes. Do not promise a reduction before
  measuring the built package. Optional dependencies stay out of the base app.
- Reuse only necessary capture/encoding primitives with preserved notices and
  published corresponding source. Do not relabel the GPL engine as MIT.
- The same host/catalog contract serves later modules; each upstream license and
  provider is assessed independently. Do not pretend future modules are installed.

## Tasks and verification

- [ ] Extract the headless WGC/Media Foundation worker and dependencies into the GPL
  engine directory. Document upstream immutable commit and all modifications.
- [ ] Implement an independently runnable, bounded JSON protocol with hello/status,
  explicit start/stop recording, screenshot/replay save and real result events.
- [ ] Build a Windows GitHub workflow producing the engine package, exact sources,
  manifest with SHA256 and measured sizes, using only required Qt dependencies.
- [ ] Implement plugin catalog/download/install/disable/remove with native-process
  isolation, trusted URLs, checksum verification, entry allowlists and atomic state.
- [ ] Connect real game sessions to the engine after explicit user opt-in. Default
  to 30 seconds/720p/30fps, bounded settings, honest availability/error/buffer states.
- [ ] Replace companion setup UI with compact glass plugin controls and integrate
  capture/settings in Nexus. Maintain FR/EN/controller/modal navigation.
- [ ] Test download integrity, archive traversal, shutdown, no opt-in/no process,
  protocol timeouts, honest UI states and native image/video paths.
- [ ] Review, publish source/plugin builds, verify CI and measured artifacts, then
  publish the launcher release. Hardware replay validation remains clearly marked.

## Removed scope

No unmodified GameHQ installer in the normal Capture flow. No GameHQ QML gallery,
SQLite library, updater, own themes or Qt Multimedia/FFmpeg playback in the plugin:
Nexus already supplies the gallery/player/update flow. Do not install SAN or other
modules under a new name without separately reviewing their source and license.
