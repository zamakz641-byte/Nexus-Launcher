# Nexus experience QA — 2026-09-25

## Implemented

- Electron library registry in `userData`: multiple collections, direct game folders, individual executables, duplicate detection, versioned persistence and per-source scan errors. Removing an entry changes only the registry.
- Stable game IDs from canonical paths, with legacy local IDs accepted by the detail route.
- Native launch resolves an ID from the registry and checks the current real path, registered source, extension and scan signature. Local artwork requests check registered roots or copied overrides.
- SteamGridDB Settings field and encrypted `safeStorage` persistence. IPC status includes only configured/availability/check state. The supplied chat key was not copied into code or scripts and was not used for QA.
- Manual title, executable and three artwork roles in game detail. Native dialogs choose files; artwork is size/type checked and copied into `userData`.
- Delayed hover preview, four-step onboarding with library import and FR/EN text, launch phases driven by visual completion with an upper timeout.
- Three CC0 sound families in `artifacts/audio/audition/index.html`, with source/licence details. Product SFX stay unchanged pending listener choice.

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | 8 backend tests and Vitest suite passed |
| `npm run qa:local` | Passed at 1920×1080 and 640×720, no recorded failures |
| `npm run build` | Passed; Sites files prepared |
| `npm run test:sites` | 4 tests passed |
| `node scripts/electron-smoke.mjs` | `nexus://app/`, preload isolation, 1 root / 8 games, forged launch rejected |
| `node scripts/audition-smoke.mjs` | 4 families and 21 playable cues loaded |
| `npx electron-builder --win dir --x64` | Packaging stalled after `packaging` without output for several minutes; interrupted. Existing `release/win-unpacked` is not claimed as the new build. |

Captures: `artifacts/qa/local/`. Listening board: `artifacts/audio/audition/index.html`.

## Remaining validation

- Native dialogs for adding two new folders, a manual executable and three cover overrides need an interactive Windows pass with user-selected paths.
- SteamGridDB key validation needs a user-entered key in the Settings field; no secret was used in automated tests beyond dummy values.
- Launch animation has not been filmed over a real game process. Existing native smoke does not start a game.
- Packaged Windows output needs a successful fresh packaging run.
- SFX replacement awaits the user's listening choice. Playnite/Steam media were treated as style references, not redistributable audio.
