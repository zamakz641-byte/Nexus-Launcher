# Performance and debugging — 2026-10-01

Measured against the local Vite preview in headless Chrome at 1920 × 1080. These are diagnostic measurements, not a frame rate benchmark.

| Check | Before | After |
| --- | ---: | ---: |
| Idle `getGamepads()` calls per second, no controller | 11–33 | 2–4 |
| Initial `/api/library/scan` requests in React development mode | 2 | 1 |
| `dist/client` size | 22,565,412 bytes | 8,478,228 bytes |

The idle controller loop now checks four times per second and wakes immediately on `gamepadconnected`. Disconnect clears held button state so a reconnected controller registers a fresh press. The initial system and library requests are shared between React Strict Mode effect passes. Repeated selected game and input mode assignments no longer notify every store subscriber.

Six unreferenced demo images moved from `public/assets/games` to `docs/demo-artwork`, keeping them in Git while removing 14,087,184 bytes from the production client. Library hover no longer starts an extra image preload for every pointer crossing, and game artwork uses asynchronous decoding.

Verification: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:sites`, `node scripts/electron-smoke.mjs`, the controller QA, and `npm run qa:performance` all completed successfully. The performance QA accepts `NEXUS_QA_URL` when the preview is not on port 4173.
