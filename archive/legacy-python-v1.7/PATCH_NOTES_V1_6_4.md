# Nexus Launcher v1.6.4 — Boot Stability + Motion Pass

## Ce qui change

Le startup n'est plus seulement une animation chronométrée. Il devient une vraie barrière de démarrage : Nexus reste entièrement masqué tant que le backend, le pont pywebview, React et les médias critiques du premier écran ne sont pas réellement prêts.

### Séquence de boot

1. Le shell de startup brut est le tout premier rendu de `index.html`.
2. Le snapshot HTTP peut charger la bibliothèque rapidement, mais il ne peut plus déclarer Nexus prêt avant que `window.pywebview.api` soit appelable.
3. React attend les polices, précharge les médias critiques du premier jeu et attend deux frames de rendu stables.
4. Le startup respecte au minimum 4,6 s de présence, puis 760 ms de stabilisation après le signal `ready`.
5. L'interface est peinte 560 ms derrière le startup encore opaque avant le fondu final. Il n'existe donc pas de frame volontairement noire entre les deux surfaces.
6. Si le backend échoue, le startup reste visible avec un diagnostic et des actions de récupération au lieu de révéler une interface cassée.

### Motion design

- halo et anneaux concentriques ;
- grille perspective ;
- rubans lumineux ;
- particules et horizon animé ;
- entrée du logo/wordmark et sortie cinématique ;
- animations limitées à `transform` et `opacity` pour rester légères dans WebView2 ;
- aucun framework d'animation externe requis avant le chargement de l'application.

### Autres ruptures corrigées

- le bootstrap HTTP ne peut plus gagner la course contre le pont natif ;
- un événement `game-started` tardif ne peut plus activer `nexus-sleep` pendant le boot ;
- un échec natif ne force plus `ready=true` ;
- ErrorBoundary peut forcer l'affichage du mode Recovery ;
- la classe temporaire `nexus-app-underlay` est retirée après le handoff ;
- le serveur local et SQLite sont nettoyés même si pywebview plante ;
- les événements WebView `before_show`, `loaded`, `shown` et `closing` sont maintenant journalisés dans `logs/nexus.log` pour diagnostiquer un éventuel écran noir natif Windows.
