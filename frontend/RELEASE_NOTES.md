# Nexus Launcher V2.3.0 — Player Update

## Français

- Steam simplifié : ouvrir le client Steam et retrouver les heures et succès disponibles dans son cache local. Aucun SteamID ni clé API Steam à saisir.
- Panneau Steam compact en verre sombre, commandes lisibles et traductions FR/EN.
- Notifications optionnelles : un bouton ouvre Steam et installe SAN si nécessaire depuis sa release officielle, après vérification SHA256. Setup et le premier démarrage proposent aussi cette option. SAN conserve son installateur officiel et reste une application séparée avec ses propres réglages.
- Architecture Core / Modules / Overlay, bus d’événements, erreurs isolées et arrêt ordonné.
- Dernières sessions Nexus dans les fiches : dates et durées réelles, sessions interrompues sans durée inventée.

### Limites

Windows x64, Setup ou Portable, exécutables non signés. Le cache Steam peut être ancien et incomplet : la connexion ne garantit pas une liste complète de tous les succès. SAN assure ses notifications en direct avec Steam connecté ; validation sur un vrai déblocage encore nécessaire. Le plein écran exclusif peut masquer les overlays. Gérez les notifications SAN démarrées en dehors de Nexus dans SAN. Pas de succès Epic/GOG, capture/replay, cloud saves ou télémétrie matérielle dans cette version. Les temps Steam et Nexus restent distincts.

## English

- Simpler Steam setup: open Steam and read available playtime and achievement progress from its local cache. No SteamID or Steam API key entry.
- Compact dark glass Steam panel, readable controls and French/English translations.
- Optional notifications: one button opens Steam and, when needed, downloads the official SAN installer with SHA256 verification. Nexus Setup and first-run onboarding offer the same opt-in. SAN keeps its official installer and remains a separate app with its own customization.
- Core / Modules / Overlay architecture, isolated event listeners and orderly shutdown.
- Recent Nexus sessions in game details with actual dates/durations and explicit interrupted sessions.

### Limitations

Windows x64, unsigned Setup/Portable binaries. Steam cache may be old or incomplete; connecting does not guarantee a complete achievement list. SAN handles its own live notifications while Steam is signed in; a real unlock still needs user validation. Exclusive fullscreen may hide overlays. Manage SAN notifications started outside Nexus in SAN itself. No Epic/GOG achievements, capture/replay, cloud saves or hardware telemetry in this release. Steam and Nexus time stay separate.

[Module architecture and roadmap](../docs/MODULES.md)
