<div align="center">
  <img src="docs/banner.svg" alt="Nexus PC Game Launcher" width="100%" />

  **Launcher PC cinématique, local-first, manette-first.**  
  Steam · Epic · GOG · EXE · SteamGridDB · trailers · succès Steam · extensions audio · faible impact en jeu.

  ![Windows](https://img.shields.io/badge/Windows-10%2F11-111827?logo=windows11&logoColor=white)
  ![Python](https://img.shields.io/badge/Python-3.12+-111827?logo=python&logoColor=white)
  ![pywebview](https://img.shields.io/badge/pywebview-6.2.1-111827)
  ![React](https://img.shields.io/badge/React-19-111827?logo=react&logoColor=61DAFB)
  ![Release](https://img.shields.io/badge/release-v1.7.0-D8B75C?labelColor=111827)
</div>

---

## Nexus 1.7

Nexus est un launcher Windows qui garde l'interface React/Tailwind dans **WebView2 via pywebview**, pendant que Python gère la bibliothèque, SQLite, les launchers, les téléchargements de médias et le suivi des processus. La 1.7 ajoute une direction visuelle cinématique, des transitions de vues GSAP et une séquence de lancement pilotée par Remotion Player.

### Bibliothèque réelle

- import `.exe` avec détection intelligente du nom et remontée des dossiers parents ;
- scan Steam, Epic Games et GOG ;
- identité corrigeable manuellement pour les titres ambigus ;
- SteamGridDB pour cover, Hero, logo et icône ;
- Steam Store pour description, genres, captures et trailer ;
- succès et rareté via Steam Web API lorsque le compte est configuré ;
- temps de jeu et sessions stockés localement dans SQLite.

### Interface console

- navigation manette spatiale dans les vues et modales ;
- **vrais PNG** pour les icônes d'interface et les prompts PlayStation/Xbox/Switch ;
- animation Nexus au démarrage du launcher, peinte avant React puis synchronisée avec le bootstrap natif ;
- animation Remotion indépendante lors du lancement d'un jeu, avec variante mouvement réduit ;
- Hero double-bufferisé et images voisines préchargées pour limiter les écrans noirs ;
- bouton **Quitter Nexus** disponible dans la topbar, sidebar et Paramètres.

## Extensions audio `.nxsfx`

La première API d'extension Nexus est volontairement limitée aux **sound packs data-only**. Une extension audio n'exécute ni Python ni JavaScript.

Un pack doit fournir **tous** les cues suivants :

```text
focus
confirm
back
launch
success
toggle
hover
wake
sleep
startup
```

S'il manque un fichier, si un chemin sort de l'archive, si le format est invalide ou si le pack dépasse les limites de taille, Nexus refuse l'installation.

Les extensions installées vivent dans :

```text
%LOCALAPPDATA%\NexusLauncher\extensions\soundpacks
```

Le format et le catalogue officiel sont documentés dans [`extensions/`](extensions/). Le catalogue du dépôt ne doit contenir que des assets **redistribuables**.

> Nexus ne distribue pas les sons propriétaires PlayStation, Xbox ou Nintendo. Un utilisateur peut importer localement un pack qu'il possède légalement ; les releases officielles Nexus n'embarquent pas de sons ripés d'un firmware ou d'une console.

Cinq profils légaux sont intégrés : **Nexus Console**, **Nexus Glass**, **Nexus Aether**, **Nexus Pulse** et **Nexus Arcade**. Ils utilisent le même jeu de one-shots CC0 Kenney, avec des enveloppes, gains, vitesses et séquences différentes. Les vrais packs propriétaires peuvent être importés localement en `.nxsfx`, mais ne sont jamais redistribués par Nexus.

## PNG UI assets

Le script `scripts/fetch_ui_assets.py` récupère et met en cache :

- les prompts manette PNG de **Meritite Union Input Prompts** (CC0) ;
- les PNG de **Material Icons** (Apache-2.0).

Les visibles de Nexus utilisent donc des fichiers raster réels plutôt que des paths SVG dessinés inline dans le code de l'application. Voir [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Faible impact pendant un jeu

Lorsque `Mode faible impact` est activé :

1. la séquence de lancement se termine ;
2. la fenêtre WebView est masquée ;
3. les animations et SFX sont suspendus ;
4. le backend passe en priorité réduite et les helpers WebView2 en Idle ;
5. aucun scan de bibliothèque ni téléchargement média n'est effectué ;
6. seul le suivi minimal du processus de jeu reste actif ;
7. le DOM est réveillé avant de réafficher la fenêtre à la fermeture du jeu.

L'objectif est un retour quasi immédiat au launcher sans garder une interface animée derrière le jeu.

## Pipeline médias

```text
Steam / Epic / GOG / EXE
           │
           ▼
    Library Provider
           │
           ▼
     Identity Resolver
      Steam / SGDB / IGDB
           │
           ▼
     Metadata Resolver
       ┌───┴───────────┐
       ▼               ▼
   Metadata          Media
 Steam / IGDB   SGDB / Steam / Epic
       │               │
       └───────┬───────┘
               ▼
         cache local Nexus
               ▼
             SQLite
```

Une image téléchargée est sauvegardée immédiatement. Les gros artworks sont redimensionnés pour éviter de demander à WebView2 de décoder inutilement des fonds 4K dans un menu.

## Clés API

| Service | Obligatoire | Utilisation |
|---|---:|---|
| SteamGridDB | Recommandé | Covers, Hero, logos, icônes |
| Steam Web API | Facultatif | Succès personnels Steam |
| SteamID64 | Facultatif | Association au profil pour les succès |
| Steam Store | Non | Métadonnées, captures et trailers publics |
| IGDB | Facultatif | Secours pour certains titres non-Steam |

## Architecture

```text
index.html             splash startup pré-React + handoff anti-écran noir
src/                     React + TypeScript + Tailwind
├── components/          Hero, rail, modales et launch overlay
├── views/               accueil, bibliothèque, collections, succès, stats, paramètres
├── services/            bridge natif, manette, analytics, sound-pack engine
└── store/               état de l'interface

backend/                 Python
├── api.py               bridge JS ↔ Python
├── extensions.py        validation / installation des .nxsfx
├── local_server.py      frontend + médias + assets extensions sur loopback
├── sources.py           Steam / Epic / GOG / EXE
├── providers.py         Steam / SteamGridDB / Steam Web API
├── launcher.py          lancement, UAC par jeu, suivi, faible impact
└── storage.py           SQLite + réglages + sessions

extensions/              catalogue et schéma des extensions Nexus
```

## Développement Windows

Prérequis : **Python 3.12+**, **Node.js 22+**, Microsoft Edge WebView2.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev_windows.ps1
```

Ou double-clique sur :

```text
LANCER_NEXUS.bat
```

Le script ne réinstalle pas les dépendances ni ne rebuild React à chaque lancement si rien n'a changé.

## Synchroniser ce dossier avec GitHub

Le dépôt GitHub a d'abord été initialisé avec un petit bootstrap. Si un clone local a été créé séparément, Git peut répondre `non-fast-forward` ou `refusing to merge unrelated histories`. Le script suivant rattache les deux historiques en gardant **les fichiers Nexus locaux** comme source de vérité :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\push_github.ps1
```

Ou double-clique sur `PUSH_GITHUB.bat`. Le script corrige `origin`, récupère `main`, fusionne l'ancien bootstrap si les historiques sont séparés, puis pousse la source complète.

## Build Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_windows.ps1
```

Sortie :

```text
build\release\NexusLauncher.exe
```

La GitHub Action Windows exécute les tests, le check TypeScript, Vite et PyInstaller avant de publier le binaire beta.

## Tests

```powershell
python -m pytest -q
npm run lint
npm run build
```

La 1.6 conserve et étend les tests pour les packs audio complets, les cues manquants, le path traversal et le registre d'extensions servi par le loopback Nexus.

## Vie privée

Nexus est **local-first**. Les jeux, sessions, médias, réglages et extensions sont stockés sous `%LOCALAPPDATA%\NexusLauncher`. Nexus n'a pas de compte maison et n'envoie pas de télémétrie à un serveur Nexus.

---

<div align="center">
  <sub>Nexus n'est affilié ni à Valve, SteamGridDB, Epic Games, GOG, Sony, Microsoft ni Nintendo. Les marques appartiennent à leurs propriétaires respectifs.</sub>
</div>

## Startup v1.6.4

Le premier affichage est un shell de boot indépendant de React. Nexus ne révèle l'interface qu'après disponibilité du pont pywebview, chargement de l'état React, préchargement des médias critiques et stabilisation du premier rendu. Une durée minimale de boot évite les flashes sur les machines rapides, tandis qu'un backend lent conserve le splash et affiche son état au lieu de produire un écran noir. Les étapes natives `before_show`, `loaded`, `shown` et `closing` sont enregistrées dans `logs/nexus.log`.
