# Nexus Launcher v1.6.3 — Boot Sync Fix

## Problème corrigé
L'ancien splash était monté par React après le début du rendu de l'application. Sur Windows, cela pouvait produire la séquence incohérente : launcher visible -> animation startup -> écran noir/initialisation.

## Nouveau contrat de démarrage
1. WebView2 peint immédiatement le splash Nexus brut depuis `index.html`.
2. `#root` reste invisible pendant le bootstrap Python/React.
3. React charge la bibliothèque et les réglages derrière le splash.
4. Quand le premier bootstrap est résolu, React appelle `window.__nexusBootReady`.
5. Le splash respecte une durée minimale de 1,84 s, puis effectue un fondu vers l'application déjà prête.
6. Si le backend est lent, le splash reste visible avec un statut au lieu de produire un écran noir.
7. Si React plante, `ErrorBoundary` force l'affichage de Nexus Recovery.

## Validation effectuée
- `pytest`: 36/36.
- `compileall`: OK.
- Transpilation syntaxique des 29 fichiers TS/TSX: OK.
- Test E2E Chromium sous Xvfb :
  - backend rapide : startup visible, app cachée, puis handoff propre ;
  - backend lent : startup reste affichée, aucune apparition prématurée de l'app ;
  - startup désactivée : révélation immédiate après ready ;
  - backend bloqué : splash + message d'initialisation restent visibles, pas d'écran noir.

Le test Windows WebView2 natif reste à effectuer sur Windows, car l'environnement de validation ici est Linux.
