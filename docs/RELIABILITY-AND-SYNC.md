# Reliability and real account sync

## Available now

- A refresh control is available in the persistent navigation. F5 and Library refresh retry artwork and rescan metadata without reloading the application.
- Successfully downloaded images persist across restarts, with a 256 MB disk budget and a 32 MB memory budget. Offline refresh retains the last successful image. Failed downloads are not cached; concurrent requests share one download.
- Cached metadata survives an unavailable catalog during refresh. Changing a corrected title still requests a new catalog match.
- Hold a ready game for 650 ms using pointer, Enter/Space or controller A to launch it. A progress line signals the hold. Moving the pointer or losing focus cancels it; release after a hold never launches twice. A short activation keeps selection/details behavior.
- Electron minimizes after a successful executable spawn, follows the initial process and discovered descendants, restores after the session, and records Nexus playtime. The browser preview cannot minimize a desktop application.
- Dialog navigation stays within the dialog; native menus and range controls retain their own arrow behavior. Lost focus is recovered after keyboard/controller route transitions.

## Limits to verify with individual games

Some games hand execution to an already running Steam/Epic/third-party client. Their real process may not descend from the executable Nexus started. Very short bootstrap processes can also end before the first Windows process snapshot. These need store-specific running-state adapters; the current tracker does not promise universal detection. Elevated games may hide process information. A surviving helper process may prolong a tracked session. Windows process polling is every 1.5 seconds, so return is not instantaneous. Unavailable process snapshots are retried; automatic return waits for a successful snapshot rather than assuming a game has closed.

The V2.0 installers include these changes and the folder-first setup flow. Source changes after a release still require a new build before they appear in an installed executable.

## Recommended next improvements, using real data

1. **Steam account connection.** Store SteamID64 and a Steam Web API key securely in Electron's encrypted secret storage. SteamGridDB keys only identify artwork access, not Steam accounts. Do not commit either key or send account secrets to the renderer.
2. **Achievement sync.** Combine `ISteamUserStats/GetPlayerAchievements` (actual unlock flags/timestamps) and `GetSchemaForGame` (labels/icons). Refresh after the game closes, with a delayed retry to allow Steam to publish updates. Record provider and last-success time; retain cached results offline and distinguish private/unavailable from zero achievements. Only show a new-achievement notification after comparing two successful snapshots for the same SteamID and AppID.
3. **Historical Steam playtime.** Import `IPlayerService/GetOwnedGames` and `GetRecentlyPlayedGames` when the player's privacy settings allow them. Keep Steam totals separate from Nexus-recorded session time; adding both would double-count.
4. **Session recap.** Show real session duration and newly synchronized achievements on return, with a clear pending/offline status. No synthetic achievement or fabricated cloud-sync indicator.
5. **Store launch adapters.** Use each store's supported launch mechanism and running-state signals, while retaining manually chosen executables for standalone games. Test handoff, failed launch, crash and multiple sessions before claiming full support.

Official API references: [Steam user statistics](https://partner.steamgames.com/doc/webapi/ISteamUserStats), [Steam player service](https://partner.steamgames.com/doc/webapi/IPlayerService).

## Verification

`npm test`, `npm run typecheck`, `npm run build`, and `npm run qa:reliability` (default server `http://127.0.0.1:13293`, override `NEXUS_QA_URL`). The reliability browser test mocks catalog/launch responses and simulates image failure/recovery plus keyboard, pointer and controller holds; it never starts a user's game.

The native session check (`scripts/qa-desktop-session.mjs`) compiles an ignored `artifacts/qa/session/GameFixture.exe` Windows fixture using the installed .NET Framework compiler: its parent exits after 2 seconds while its child runs for 4.5 seconds. The test temporarily registers only this fixture, checks minimize/wait/restore, and removes its library entry in `finally`.
