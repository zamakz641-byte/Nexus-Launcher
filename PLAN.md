# Plan de finition — Nexus Launcher 1.7

## Direction

Transformer la base 1.6.7 en lanceur Windows cinématique et stable : navigation immédiate, hiérarchie lisible à distance, identité bleu nuit/cyan/or, et transitions qui expliquent les changements d’état.

## Livraison

1. Consolider le shell, la navigation clavier/manette et le mode de prévisualisation.
2. Recomposer l’accueil autour d’un hero asymétrique, d’un rail horizontal et d’une grille éditoriale dense.
3. Introduire GSAP pour les transitions de vues et Remotion Player pour la séquence de lancement.
4. Respecter le mouvement réduit, le contraste, les focus visibles et le budget GPU de WebView2.
5. Vérifier TypeScript, tests Python, build Vite, QA visuelle, puis générer l’exécutable Windows.
6. Publier le code et l’exécutable dans le dépôt GitHub public du compte `zamakz641-byte`.

## Critères de fin

- Aucun écran noir au démarrage ou au retour d’un jeu.
- Navigation complète à la souris, au clavier et à la manette.
- Animations interrompables et désactivables.
- EXE autonome produit par PyInstaller.
- `design-qa.md` terminé avec `final result: passed`.
