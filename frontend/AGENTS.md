# Prototype Instructions

## Current desktop direction (2026-09-24)

- Nexus Launcher remains an Electron desktop app using `nexus://app/`, isolated preload IPC, sandboxing, native game launch, local library discovery, controller navigation, and F11 fullscreen. The older root `ARCHITECTURE.md` Tauri proposal is historical.
- Motion should feel directional, quick, restrained, and responsive under repeated controller input. Preserve the L1/R1 edge detection and cooldown behavior; a held bumper changes section once.
- Keep the dark cinematic Nexus identity, 16:9 cards, clear controller focus, and accessible reduced-motion behavior. Target smooth 60 FPS using transform and opacity for frequent animations.
- The user now cites the mobile GameHub landscape interface and icons as the visual reference. On wide desktop layouts, use a centered top icon navigation above the game artwork, while retaining Nexus branding, original icon assets, and controller focus behavior. The compact side rail remains the fallback below 1200px, and the bottom dock remains for narrow layouts.
- Carry the GameHub reference through interior screens: settings use a spacious two-column selector and open control rows, while library and discovery let game art lead. Keep a restrained blue-night atmosphere in Obsidienne and preserve the separate Solaris theme, readable focus, and clear source/status information.
- The user wants to add several game folders and individual executables, choose/correct covers, and enter their own SteamGridDB key in Settings. Keep the key out of source, frontend storage, logs, and screenshots. Removing a game from Nexus must never remove its files.
- Adding one game opens the native Windows `.exe` picker in both Electron and the local Vite preview. Infer an editable title from the executable or enclosing game folder, save corrections, then refresh metadata using the corrected title. Do not require manual path entry in Settings.
- Discover installed Steam and Epic titles from their local manifests across connected drives, allow a manual rescan, and refresh when drives or manifests change. Display recorded playtime honestly as time tracked from launches through Nexus; do not imply it includes earlier Steam or Epic sessions.
- The user finds the current onboarding and game-launch animation too slight. Plan a visible, skippable, controller-friendly cinematic sequence and verify it in Electron, including reduced-motion behavior and launch failures.
- New UI sounds remain separate audition candidates until the user can listen to and approve them. Do not replace the current cues automatically. The user rejected both the Runway and Kenney selections. Look for professionally designed, coherent launcher or console-style packs with verified per-asset reuse terms; Playnite ecosystem sounds are a reference. Do not assume an open-source application's code license covers its bundled audio.
- The user also rejected the first Joth, fvcalderan, and Robin Lamb audition as too arcade/retro. Favor understated, modern, short and soft console-menu cues; prioritize the repeated navigation sound. Keep any new pack in a separate audition until the user chooses a direction.
- The user selected the "Minimal · tactile" audition family for production UI sounds. Credit Nathan Gibson (Universal UI Soundpack, CC BY 4.0) with the bundled audio. They also want the large glass frame behind Home game covers removed, a less text-heavy artwork-led Library, visible metadata loading, and playable trailers where the catalog provides them.
- Home navigation should be fast and legible with keyboard and controller: one selected game tile in the Tab order, left/right wrapping without skipped games during repeated input, up/down moving one zone at a time between global navigation, primary action, and game rail. Keep subdued previous/next pointer controls and a position indicator below the wide Home rail.
- The Home rail shows each real game once in its actual order. The first selected tile must visibly start near the left edge of the wide rail, with no large spacer before it; the last tile reaches the right end. Do not add repeated cover tiles before the first game or after the last; the wrap happens only when moving past the actual endpoint.
- French and English UI copy must come from shared i18n keys across Home, Library, Search, Settings, Downloads, game details, onboarding, and dialogs. Switching language updates visible labels, accessibility text, and localized game fields immediately, persists on reload, and tolerates English text expansion on narrow screens. Use plural forms for game/result counts.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Nexus V2 durable decisions

- The approved Home visual target is `../docs/assets/home-glass-approved.png`.
- Home uses a full-screen cinematic composition, a compact left-side system rail, and a low horizontal game rail.
- Game cards are predictable 16:9 rectangles with restrained corner radii. Their premium character comes from contextual glass, artwork, depth, and motion rather than unusual geometry or clipped silhouettes.
- Pointer hover and controller focus are distinct: hover provides a light lift and clarity increase; focus/selection expands the card, reveals playtime/cloud/progress metadata, and recolors its glass glow.
- The UI is multilingual from the foundation; French and English ship first, and layouts must tolerate text expansion and future RTL direction.
- Themes are validated semantic-token packages. They may transform colour, typography, geometry, focus, artwork treatment, icons, and motion, but not information architecture or navigation semantics.
- Use professional accessible primitives for complex controls, then style them as Nexus components. Never expose default component-library styling.
- Controller and keyboard focus are first-class and distinct from pointer hover.
- Keep the product zones clear: global navigation, selected-game context, actions, and collection rail.
- The first-run experience includes a cinematic, skippable animated onboarding with the Nexus emblem, language choice, and controller-first introduction.
- Game browsing must feel spatial and artwork-led rather than like a row of web cards. Focused artwork expands; neighbouring items recede without losing predictability.
- Primary actions use a compact premium command treatment rather than oversized generic pills.
- Home, Library, Search, and Settings share the same navigation, theme, focus, and localization contracts while keeping distinct screen compositions.
- The system shell is persistent: a compact glass rail on desktop and a bottom controller dock at widths up to 820px. No content may sit beneath either shell.
- The default local library root is `F:\Games`. Development mode scans it through the Vite-local API, excludes support/setup folders, detects likely executables and local artwork, and never launches a file outside that root.
- Local discovery must remain resilient: screens render curated games immediately, display scan state, and wait for discovery before resolving direct local-game URLs.
- For recognized local games, enrich titles, descriptions, genres, studios, dates and artwork from the public Steam catalog. Use the compact Steam header for 16:9 cards and the separate library hero/background for the full-screen media layer; never reuse an unrelated fallback image when a catalog match exists.
- Home typography must scale by title length and remain collision-free at short desktop heights as well as 640 × 720. Technical paths belong in details/settings, not in the cinematic Home hero.
- Motion weighting: Jakub Krehel for production polish, Emil Kowalski for frequent interactions, and Jhey Tompkins selectively for the rare onboarding sequence. All motion respects reduced-motion preferences.
- The interface must keep noticeably more breathing room at 1920×1080 and common laptop sizes: avoid compressed metadata, edge-to-edge card groups, and controls that visually collide. Prefer fewer, larger groups with at least 12–16px between adjacent interactive targets.
- Download-provider extensions are permitted only for authorized sources. The open-source extension API may support official stores, user-owned direct URLs, and lawful torrents, but the core project must not ship integrations dedicated to pirated game sources.

- Interior screens must inherit Home's cinematic language without becoming identical: use restrained glass surfaces, strong artwork, and fewer large groups instead of generic dashboard panels.
- Library uses a contextual selected-game preview plus a landscape 16:9 collection grid. Hover/focus updates the selected-game context and therefore the persistent media backdrop.
- Remote artwork is never a single point of failure. Game media must fall back through alternate artwork and finally the Nexus brand mark so a slow catalog cannot create blank UI.
- Keep deterministic local QA separate from optional external-network QA. `npm run qa:local` must cover Home, Library, Search, Settings, Downloads, and Game Detail at 1920×1080 and 640×720 without depending on Steam availability.
- Settings uses a two-panel control-center layout on desktop and a horizontally scrollable section strip above content on narrow screens. Never allow the desktop two-column layout to override the <=820px shell.

- Nexus V2.2 uses an adaptive per-game ambient backdrop so weak or dark local artwork still produces depth and hierarchy.
- Home keeps the hero compact enough to preserve artwork visibility; long titles and descriptions clamp before colliding with the game rail.
- The Home rail sits on a restrained glass shelf to visually anchor controller navigation without becoming a dashboard panel.
- Controller/keyboard spatial navigation wraps within an explicit focus group when no forward candidate exists.
- `npm run qa:local` remains the deterministic interaction/overflow smoke test; `npm run qa:capture` writes fresh desktop/narrow reference captures to `artifacts/qa/suite`.

- Startup feedback (2026-10-02): the user rejected giant letter panels as a console startup, while appreciating their motion as a separate study. Startup must return to Nexus glass materials and use an original spatial animated scene, with a short transition into the library. Do not reuse the typographic panel intro. Higgsfield must be checked for an actual connection before claiming it generated an asset.

- Startup film approved for integration (2026-10-03): bundle the user-supplied Flow/Veo French 8-second film with its logo, wordmark and slogan. Play through to its end, use its embedded audio respecting existing volume/mute settings, fade into Home, and retain keyboard/controller skip plus a static poster for reduced motion. An English film is pending; do not invent an English video or overlay duplicate branding. Preserve the procedural glass study as a separate prototype.

- English startup film supplied (2026-10-03): both Flow films are bundled locally; select the video and matching reduced-motion poster using the persisted FR/EN interface locale. The replay viewer embeds current sources and uses the development library profile; installed executables are separate builds.

- Reliability feedback (2026-10-03): keep successful remote artwork on disk and preserve catalog metadata during offline refresh. Offer global refresh/F5 and retain a retry path from fallback images. Long press on Home/Library games launches the exact pressed title with pointer, Enter/Space, or controller A; short activation keeps its usual selection/details behavior. Desktop minimizes only after a successful spawn and restores when the tracked game session ends. Keep controller focus inside dialogs/menus and recover focus when route content disappears. Achievements must come from an authenticated store account, with source and last-sync status; never manufacture unlocked progress.
