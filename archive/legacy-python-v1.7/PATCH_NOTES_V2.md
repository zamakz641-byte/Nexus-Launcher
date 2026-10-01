# Nexus Mega Patch V2 — 2026-09-15

## Ce patch corrige surtout les quatre points remontés après le premier test réel

### 1. Noms d’EXE intelligents
- Un EXE technique ne dicte plus automatiquement le nom du jeu.
- Nexus remonte l’arborescence et ignore les dossiers techniques courants : `Engine`, `Binaries`, `Win64`, `x64`, `bin`, `steamapps`, `common`, etc.
- Les suffixes d’EXE comme `Win64`, `Shipping`, `DX12` et `Launcher` sont retirés des candidats.
- Exemple validé : `Split Fiction/Engine/Binaries/Win64/SplitFiction-Win64-Shipping.exe` devient **Split Fiction** et la racine d’installation devient `Split Fiction`.
- Avant l’import, Nexus affiche le nom détecté, des suggestions issues des dossiers parents et un champ **Nom dans Nexus** modifiable.
- Après l’import, le nom peut être modifié depuis la fiche du jeu. Un nom personnalisé est verrouillé afin qu’un refresh Steam ne l’écrase pas.

### 2. Trailers qui ne disparaissent plus
- Le trailer direct Steam devient immédiatement lisible en streaming avant toute tentative de cache local.
- Si le téléchargement local échoue, Nexus garde le MP4 distant au lieu de vider le lecteur.
- Priorité : Steam/Epic → IGDB → recherche YouTube en dernier recours.
- Le fallback YouTube utilise `yt-dlp` uniquement pour rechercher un identifiant public ; Nexus ne télécharge pas la vidéo YouTube.
- La fiche affiche maintenant **Chercher le trailer** lorsque rien n’est lié au jeu.

### 3. Navigation manette réellement globale
- Navigation spatiale haut/bas/gauche/droite basée sur la position des contrôles, pas seulement sur leur ordre HTML.
- Le focus entre dans la modale active au lieu de rester derrière elle.
- Le sélecteur **Corriger l’identité / la version**, les candidats d’identité, l’éditeur de nom, les boutons de refresh/trailer, l’ajout de jeu et la recherche sont accessibles à la manette.
- `A` active le contrôle ciblé, `B` ferme la modale active, et le focus visuel Nexus est affiché sur les éléments non prévus à l’origine pour le clavier.
- Correction d’un cas où `A` sur un champ texte pouvait lancer le jeu sélectionné derrière une modale. Oui, l’interface avait brièvement inventé le bouton nucléaire.

### 4. SFX refaits
- Suppression du pack UI SFX précédent et de sa dépendance npm.
- Les sons de navigation utilisent maintenant de vrais fichiers WAV du pack **Kenney Interface Sounds** sous licence CC0.
- Pas d’oscillateur WebAudio, pas de bruit synthétisé maison, pas de son copié d’une PS5/Xbox.
- Navigation/focus volontairement très courte et discrète ; validation, retour, ouverture/fermeture et lancement ont des cues séparés.
- Le lancement utilise trois one-shots réels, espacés et plus sobres que l’ancienne superposition.
- `scripts/fetch_sfx.py` récupère automatiquement uniquement les 10 WAV nécessaires et les conserve localement.

## Compatibilité
Les données de bibliothèque restent dans `%LOCALAPPDATA%/NexusLauncher`. Le patch migre automatiquement l’ancien identifiant de pack `nexus-modern` vers `nexus-console`.

## Validation effectuée dans l’environnement de génération
- Tests Python backend : voir résultat `pytest` du patch.
- `python -m compileall` : validé.
- Syntaxe TS/TSX : validée par transpilation TypeScript hors `.d.ts`.
- Le build Vite complet dépend toujours de `npm install`, inaccessible depuis l’environnement de génération. Le script Windows l’effectue avant le lancement.
