# Nexus Extensions

Nexus 1.5 introduces its first extension surface: **complete sound packs**.

The extension loader is intentionally narrow and offline-friendly. Installed packs live in `%LOCALAPPDATA%\\NexusLauncher\\extensions\\soundpacks`, are served only through Nexus' loopback HTTP server, and cannot execute Python or JavaScript.

This keeps a sound extension as data, not code. A bad sound pack therefore cannot become a plugin with arbitrary machine access.

## Startup SFX (v1.6.7+)

Le cue `startup` du pack sélectionné peut être joué par l'écran de boot HTML avant le montage de React. Nexus lit uniquement un petit profil audio local (`/__nexus_startup_sound__.json`) puis retombe sur le moteur React si WebView2 refuse la lecture précoce. Cela évite un son de démarrage qui arrive après l'animation.
