# Nexus Launcher 1.6 — Console polish & Git sync

## Audio

- 5 profils intégrés complets : Nexus Console, Glass, Aether, Pulse et Arcade.
- Tous utilisent des one-shots CC0 redistribuables.
- Les packs `.nxsfx` propriétaires restent importables localement, mais Nexus ne les redistribue pas.
- Une release Windows échoue désormais si le pack SFX intégré n'est pas complet.

## Icônes

- Les icônes d'interface restent de vrais PNG.
- Les prompts manette restent des PNG PlayStation/Xbox/Switch issus d'un pack CC0.
- La préparation des assets échoue maintenant si une icône attendue est réellement absente, au lieu de livrer une UI partiellement cassée.

## Startup & motion

- Startup Nexus enrichie d'un sweep lumineux et de micro-glints composités.
- Pas de blur plein écran ajouté : les transitions restent basées sur opacity/transform pour préserver WebView2.

## GitHub

- Ajout de `scripts/push_github.ps1` et `PUSH_GITHUB.bat`.
- Le script gère le cas où le dépôt GitHub bootstrap et le dossier local ont des historiques sans ancêtre commun.
- L'ancien `main` distant a été sauvegardé dans `backup/bootstrap-2026-09-16` avant toute synchronisation complète.
