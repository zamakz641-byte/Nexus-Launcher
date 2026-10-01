# Nexus Launcher — UI polish pass (2026-09-16)

## Interface
- Direction visuelle console premium plus cohérente et moins « dashboard web ».
- Sidebar plus compacte avec le vrai logo PNG Nexus et indicateur actif lié à l’accent global.
- Topbar flottante affinée, contrôles regroupés et meilleure hiérarchie.
- Hero agrandi et stabilisé : artwork rendu en background CSS, logo jeu plus présent, overlays allégés.
- Rail de jeux plus lisible, cartes plus grandes, focus sélectionné plus net et accent-thème dynamique.
- Dashboard, Bibliothèque, Collections, Succès, Statistiques et Paramètres vérifiés par captures réelles Chromium.
- Footer manette transformé en barre flottante discrète.
- Suppression du serif forcé sur tous les titres ; titres principaux en Segoe UI Variable.

## Interaction & audio
- L’accent global de Paramètres pilote maintenant réellement le chrome UI.
- La couleur propre au jeu reste indépendante pour le Hero.
- Hover SFX léger ajouté uniquement à la souris ; le focus manette garde son système dédié.
- Les sound packs existants restent compatibles.

## Correctifs
- Correction TypeScript : GameRail accepte désormais PlayStation, Xbox et Switch.
- Réparation de l’encodage UTF-8 français après la passe d’édition.
- Hero WebView2 rendu plus fiable grâce aux couches CSS plutôt qu’un grand élément image animé.

## Validation
- `npm run lint` : OK, 0 erreur TypeScript.
- `npm run build` : OK, build Vite production.
- Démarrage pywebview/WebView2 : cycle `before_show -> shown -> loaded` confirmé.
- Tests pytest non exécutés : pytest n’est pas installé dans les environnements Python présents.

Backup avant passe : `C:\Users\USER\Downloads\Compressed\NexusLauncher_v1.6.7_backup_before_ui_polish`.
