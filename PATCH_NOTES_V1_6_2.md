# Nexus Launcher v1.6.2 — First launch + Git push fix

## Corrigé

- `backend/main.py` n'accède plus à `api.storage` après la sécurisation pywebview de v1.6.1.
  Il utilise désormais le champ runtime privé `api._storage`, ce qui supprime l'`AttributeError` au démarrage.
- `scripts/push_github.ps1` ne lance plus `git remote get-url origin` lorsqu'`origin` n'existe pas.
  Sous Windows PowerShell 5.1, ce stderr était converti en `NativeCommandError` à cause de `$ErrorActionPreference = "Stop"`.
- Si `origin` est absent, il est ajouté automatiquement.
- Si Git n'a pas encore d'identité auteur, une identité GitHub noreply est configurée uniquement pour ce dépôt.
- Deux tests de régression couvrent exactement ces deux pannes.

## Lancement

Double-cliquer `LANCER_NEXUS.bat`.

## Push GitHub

Double-cliquer `PUSH_GITHUB.bat`. Le script ajoute/corrige `origin`, récupère `main`, fusionne l'ancien bootstrap distant si nécessaire puis pousse la source complète.
