# Nexus media and achievements

## Media

The catalog preserves all official Steam trailers and full-resolution screenshots. Home backgrounds use a dedicated hero, additional SteamGridDB heroes and screenshots. The selected local background stays first. Alternate providers and the Nexus mark remain fallbacks.

Home waits for an image to load before fading; late responses for a previous game are ignored. The slideshow defaults to twelve seconds and skips images below 1280 pixels wide. It pauses for dialogs, menus, hidden windows, startup, launch and reduced motion. Brightness, dark overlay, interval and enabled state are persisted separately from credentials.

Home video previews are opt-in and muted. They start after three seconds without changing the selected game, use a single player and release playback when suspended. Full trailers have a picker, controls and retry. Screenshots have a keyboard/controller-friendly gallery. Manual trailer imports and YouTube links are not included in this release.

## Steam achievements

Settings → Metadata accepts a SteamID64 and a Steam Web API key. This key is different from SteamGridDB's artwork key. Credentials are validated with GetPlayerSummaries and encrypted by Electron safeStorage in the local user profile. No key is stored in renderer storage or returned by IPC.

The game detail Achievements tab joins GetPlayerAchievements unlocks to GetSchemaForGame localized names, descriptions and icons. Initial requests use a five-minute cache; Refresh explicitly synchronizes again. The persistent cache is scoped to account, AppID and language. Offline failures preserve the last successful snapshot, clearly labeled with its timestamp. Private profiles, unavailable data, disconnected accounts, network errors and zero unlocks remain distinct.

Only Steam is connected in this release. Installing a local executable does not prove ownership or provide achievement state. Games need a recognized Steam AppID and a Steam account with accessible game details. Notifications, historical Steam playtime, Epic and local Achievement Watcher adapters remain subsequent work.

## Verification

- Unit tests cover image races, slideshow pause, media preferences, all catalog media, encrypted account storage, private/offline states, caching and stale account/game requests.
- `node scripts/qa-media.mjs` verifies slideshow, persisted settings, galleries, trailer selection/retry and 1920/640 layouts using deterministic media.
- `node scripts/qa-steam-desktop.mjs` verifies the real Electron preload/IPC and encrypted storage availability using an isolated profile.
- Real account synchronization must be exercised with the user's credentials. No account results were fabricated for QA.

References: [Steam UserStats](https://partner.steamgames.com/doc/webapi/ISteamUserStats), [Playnite Achievements](https://github.com/justin-delano/PlayniteAchievements), [BackgroundChanger](https://github.com/Lacro59/playnite-backgroundchanger-plugin), [Extra Metadata Loader](https://github.com/darklinkpower/PlayniteExtensionsCollection/wiki/Extra-Metadata-Loader).
