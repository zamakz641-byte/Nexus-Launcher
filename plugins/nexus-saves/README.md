# Nexus Saves · 0.1.1

An optional Windows save backup engine for Nexus Launcher. It uses Ludusavi's
MIT library at commit `70f4abb31497fa5ed9b0d24098200f3662d6fda9`, with
`default-features = false`: no Iced desktop UI, image renderer or file dialogs.

## In Nexus

Install from Plugins, choose a destination, then open **Saves** on a game.
Exact title or verified Steam AppID matching locates supported save files and
Windows registry entries using the Ludusavi manifest. Unknown games remain unknown.
Keep up to five full versions; optionally back up after games launched through
Nexus exit. Restoration requires confirmation and first protects current data in
the separate `Recovery` layout. Disable/uninstall retains backups and preferences.

You can choose a folder managed by an existing cloud client. Nexus reports local
backup success only; this version does not authenticate cloud providers or verify
uploads. No RAM suspend or cross-device conflict resolution is included.

## Build

Rust stable, Windows x64 MSVC: `cargo test` then `cargo build --release`.
`package.ps1` includes only the executable, notices and dependency license report.
The release includes corresponding source and the resolved Cargo lockfile.

Protocol 1: one JSON command on stdin, one bounded JSON reply on stdout. The
Electron backend supplies validated game identity and destination; the renderer
cannot execute paths or download arbitrary extensions.

Credits: [Ludusavi](https://github.com/mtkennerly/ludusavi) and
[Ludusavi Manifest](https://github.com/mtkennerly/ludusavi-manifest), Matthew T. Kennerly.
The manifest is derived from PCGamingWiki save-location data.
