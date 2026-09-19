# Nexus Launcher — Design System

## Direction

Interface console/desktop cinématique, lisible à distance et centrée sur l’art des jeux. La navigation reste sobre ; les moments rares — démarrage, sélection et lancement — portent l’expression visuelle.

## Couleurs

| Rôle | Valeur |
|---|---|
| Fond principal | `#02070D` |
| Surface verre | `rgba(7, 17, 27, .84)` |
| Texte principal | `#F4F8FB` |
| Texte secondaire | `#9BABB9` |
| Cyan électrique | `#66DDFF` |
| Or Nexus | `#D7AD49` |
| Bordure | `rgba(159, 211, 242, .13)` |
| Danger | `#F26B7A` |

L’accent du jeu peut teinter le hero et la sélection, sans remplacer les couleurs sémantiques du shell.

## Typographie

- Famille : Geist Variable, embarquée dans l’application.
- Titres de jeu : graisse 420–500, capitales espacées, maximum deux lignes.
- Titres de section : graisse 580–650, casse naturelle.
- Corps : 14–16 px, interligne 1.55–1.7.
- Libellés techniques : 8–10 px, capitales et espacement modéré.

## Grille et rythme

- Grille principale : 12 colonnes.
- Marges desktop : `clamp(28px, 4vw, 68px)`.
- Échelle d’espacement : 4, 8, 16, 24, 32, 48, 64 px.
- Hero : 590–700 px selon la hauteur de fenêtre.
- Rails : cartes paysage 236 × 132 px.
- Grille éditoriale : 1.25fr + 1fr + 1fr, sans cellule vide.

## Mouvement

- Navigation : GSAP, entrée 420 ms, `power3.out`, opacity + translateY + blur.
- Interactions répétées : 180 ms maximum, sans animation au clavier.
- Lancement : composition Remotion 3.2 s, transform/opacity uniquement.
- Sorties plus discrètes que les entrées.
- Toutes les séquences ont une variante `prefers-reduced-motion` instantanée.
- Aucun pulse infini ni animation décorative qui réclame l’attention.

## Accessibilité et stabilité

- Contraste texte normal ≥ 4.5:1.
- Focus 2 px visible sur tous les contrôles.
- Cibles interactives ≥ 44 × 44 px.
- Navigation souris, clavier et manette.
- Pas de blur plein écran animé dans WebView2.
- Le mode faible impact suspend les animations pendant le jeu.
