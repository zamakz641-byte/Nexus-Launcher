# Nexus V2.3 — Player Update

User specification: modular Core / Modules / Overlay, then Achievements, Capture,
GameActivity and Cloud Saves, with a simple bilingual console interface.

## Scope and sequence

- [ ] Core event bus: immutable payloads, isolated listener failures, subscriptions
  cleaned on module shutdown, serialized delivery per module.
- [ ] Module host: explicit internal registration, lifecycle and health. No dynamic
  third-party code loading or unused feature switches.
- [ ] GameActivity: persist actual Nexus sessions, recover interrupted sessions
  without guessing duration, retain existing accumulated playtime, expose recent
  sessions in game details. Keep Steam totals separate.
- [ ] Achievements and notification overlay: subscribe to lifecycle events; keep
  Steam local progress and SAN optional setup behind the existing concise controls.
- [ ] Harden SAN checksum/cancellation and notification/onboarding state; verify
  FR/EN UI, real Electron IPC, tests, typecheck and installer compilation.
- [ ] Document integration contracts and the V2.4/V2.5/V3 roadmap; source review
  and release only after verification.

## Review focus

Duplicate process-exit events must not record twice. A failing optional listener
must not block other modules. Closing Nexus during a running game must not invent
an end time. Old Steam cache is partial, not live synchronization. Unchecking
notifications during download must cancel the pending opt-in.

Capture/replay, hardware telemetry, cloud restore, suspend/resume and mobile remote
are future modules with their own verification and permission boundaries. This
release must not claim that these features exist or show fabricated statistics.
