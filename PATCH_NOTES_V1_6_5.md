# Nexus Launcher v1.6.5 — Offline Asset Boot Fix

## Correctif critique
- Les 54 icônes UI PNG et les 16 prompts manette sont maintenant embarqués directement dans l'archive.
- Le premier lancement ne dépend plus de GitHub ni d'une connexion réseau pour préparer l'interface.
- `Database.png` et `ps/l1.png`, qui faisaient échouer v1.6.4, sont présents et validés dans le package.
- `fetch_ui_assets.py` devient un validateur/réparateur local : aucun `requests.get`, aucune URL distante.
- En développement, une icône cassée ne bloque plus le démarrage de Nexus.
- La build release reste stricte et vérifie que les 70 PNG sont bien valides.

## Validation
- 44/44 tests Python.
- `compileall` Python OK.
- Test de réparation offline réussi après suppression volontaire de `Database.png` et `ps/l1.png`.
- Validation de la signature PNG des 70 assets.
- Le boot synchronisé de v1.6.4 est conservé sans modification fonctionnelle.
