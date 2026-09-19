# Nexus Launcher Mega Patch V2.3

## Correctifs principaux

- Navigation manette déterministe : gauche/droite sur le rail reste sur les covers.
- Suppression du fallback DOM qui envoyait le focus dans une section sans rapport.
- Les groupes horizontaux (Hero, actions, édition de nom) restent dans leur rangée.
- Le focus ne change plus `position:absolute` en `position:relative` : les boutons X ne se téléportent plus.
- Les boutons X sont retirés de la navigation spatiale : Cercle/B reste le retour universel.
- Chargement de bibliothèque indépendant du bridge pywebview grâce à `/__nexus_bootstrap__.json`.
- Cache localStorage de démarrage comme filet de sécurité, SQLite reste la source de vérité.
- Retry du bridge pywebview et préchauffage en arrière-plan.
- Les lancements suivants évitent `npm run build` si l'interface est déjà à jour.

## Validation

- 24 tests backend.
- `python -m compileall backend` OK.
- Analyse syntaxique TS/TSX via TypeScript 5.8 OK.
