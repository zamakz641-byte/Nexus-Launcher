<div align="center">

<img src="frontend/public/assets/brand/nexus-mark.png" alt="Nexus Launcher" width="88" />

# Nexus Launcher

**Your PC game library, in one cinematic space.**  
**Tous vos jeux PC dans un espace cinématique.**

[English](#english) · [Français](#français) · [Download V2.2.1](https://github.com/zamakz641-byte/Nexus-Launcher/releases/tag/v2.2.1)

<img src="frontend/docs/screenshots/home.png" alt="Nexus Launcher home screen" width="100%" />

</div>

## English

Nexus Launcher is a Windows desktop app for browsing and launching games from a visual, controller-friendly library. It finds installed Steam and Epic games, and lets you add any other Windows game by choosing its `.exe` file.

### Highlights

- **One library:** scan connected drives for Steam and Epic installations, add game folders, or pick an individual executable.
- **Game details:** fetch available Steam metadata, artwork, and trailers; correct a game's title to search again.
- **Personal controls:** choose covers and backgrounds, set a SteamGridDB API key in the desktop app, and switch between French and English.
- **Made for the couch:** keyboard and controller navigation, a cinematic home screen, and the restrained “Minimal · tactile” sound set.
- **Playtime:** tracks sessions launched through Nexus. Historical Steam playtime is displayed after account synchronization; Epic playtime is not imported.

<table><tr><td width="50%"><img src="frontend/docs/screenshots/library.png" alt="Landscape game library" /></td><td width="50%"><img src="frontend/docs/screenshots/settings.png" alt="Library settings and game sources" /></td></tr></table>

### Download and install

1. Open the [V2.2.1 release](https://github.com/zamakz641-byte/Nexus-Launcher/releases/tag/v2.2.1).
2. Choose **Setup.exe** for an installer or **Portable.exe** to run without installation. Both are for **Windows x64**.
3. On first launch, choose your games folder in the native picker, use automatic Steam/Epic discovery, or explicitly set up later. Add more sources in **Settings → Libraries**.

The V2.2 binaries are not code signed; Windows may show a publisher warning. Nexus does not remove game files when you remove an entry from its library.

### Build from source

Requires Node.js and npm on Windows.

After `npm ci`, double-click [`LANCER_NEXUS.cmd`](LANCER_NEXUS.cmd) to build and open the current app. Run `frontend/scripts/create-shortcut.ps1` to add a desktop shortcut.

```powershell
cd frontend
npm ci
npm run typecheck
npm test
npm run build
npm run desktop
```

To build the Windows executables locally:

```powershell
npm run dist:win
```

The current app lives in `frontend/`: React UI in `frontend/src`, desktop services in `frontend/backend`, tests in `frontend/tests`, and release builds in `frontend/release` (ignored by Git). Local settings and game registrations stay in the user's application data directory. Do not commit `.env.local` or API keys.

The earlier Python/pywebview edition is preserved in [`archive/legacy-python-v1.7`](archive/legacy-python-v1.7). Published binaries live on the [GitHub Releases page](https://github.com/zamakz641-byte/Nexus-Launcher/releases); see [`releases/README.md`](releases/README.md) for the local release layout.

### Audio credit

“Minimal · tactile” interface cues use selections from **Universal UI Soundpack** by **Nathan Gibson**, licensed under **CC BY 4.0**. The attribution and license are bundled in [`frontend/public/audio/nathan-gibson/LICENSE.txt`](frontend/public/audio/nathan-gibson/LICENSE.txt).

---

## Français

### Current source improvements / Améliorations des sources actuelles

Artwork now persists offline, refresh is available throughout the app (button or F5), and holding a ready game launches it. The desktop app minimizes during tracked sessions and returns afterward. Steam achievements use real account data with explicit API and privacy requirements. See [reliability, verification and sync roadmap](docs/RELIABILITY-AND-SYNC.md) for behavior and limits. The V2.2 installers include these improvements.

Les images sont conservées hors ligne, l’actualisation est accessible partout (bouton ou F5) et un appui long lance le jeu choisi. Nexus se réduit pendant les sessions suivies et revient à leur fermeture. Les succès Steam utilisent les données réelles du compte après configuration. Voir [les détails et limites](docs/RELIABILITY-AND-SYNC.md). Les installateurs V2.2 incluent ces améliorations.

Nexus Launcher est une application Windows pour parcourir et lancer vos jeux dans une bibliothèque visuelle adaptée au clavier et à la manette. Elle détecte les jeux Steam et Epic installés et permet d’ajouter n’importe quel jeu Windows en sélectionnant son fichier `.exe`.

### Fonctionnalités

- **Une seule bibliothèque :** analyse des lecteurs connectés, ajout de dossiers et sélection directe d’un exécutable.
- **Fiches de jeu :** métadonnées Steam disponibles, jaquettes et bandes-annonces ; un titre corrigé relance la recherche.
- **Personnalisation :** choix des images, clé SteamGridDB dans l’application de bureau et interface en français ou en anglais.
- **Navigation salon :** clavier, manette, accueil cinématique et sons discrets « Minimal · tactile ».
- **Temps de jeu :** suivi des sessions lancées depuis Nexus. Les heures historiques Steam sont affichées après synchronisation du compte ; les heures Epic ne sont pas importées.

### Télécharger

1. Ouvrez la [release V2.2.1](https://github.com/zamakz641-byte/Nexus-Launcher/releases/tag/v2.2.1).
2. Choisissez **Setup.exe** pour l’installation ou **Portable.exe** pour lancer Nexus sans installation. Les deux versions sont pour **Windows x64**.
3. Au premier démarrage, choisissez le dossier de vos jeux dans l’explorateur. Vous pouvez aussi utiliser Steam/Epic ou configurer plus tard. Ajoutez ensuite des sources dans **Paramètres → Bibliothèques**.

Les exécutables V2.2 ne sont pas signés ; Windows peut afficher un avertissement d’éditeur inconnu. Retirer un jeu de Nexus ne supprime jamais ses fichiers.

### Développement

Les commandes de construction et de test figurent dans la section [Build from source](#build-from-source). Conservez les clés API dans l’application ou dans un environnement local, jamais dans le dépôt.

Après `npm ci`, double-cliquez sur [`LANCER_NEXUS.cmd`](LANCER_NEXUS.cmd) pour construire et ouvrir la version actuelle. Le script `frontend/scripts/create-shortcut.ps1` crée un raccourci sur le Bureau.

L’ancienne édition Python/pywebview est conservée dans [`archive/legacy-python-v1.7`](archive/legacy-python-v1.7). Le projet actif se trouve dans `frontend/` : interface dans `src/`, services de bureau dans `backend/`. Les exécutables publiés sont sur [GitHub Releases](https://github.com/zamakz641-byte/Nexus-Launcher/releases).



## V2.2: Media & achievements / Médias et succès

Clearer artwork, a calm HD slideshow, multiple Steam trailers, screenshot galleries and real Steam achievements with encrypted credentials.

Des fonds plus clairs, un diaporama HD, plusieurs trailers Steam, une galerie de captures et des succès Steam réels avec identifiants chiffrés.

[Behavior and limitations / Fonctionnement et limites](docs/MEDIA-AND-ACHIEVEMENTS.md)

### Account connections in the development source / Comptes dans la version de développement

**Settings → Accounts** provides Steam, Epic Games and GOG connection buttons and owned-library browsing. Steam supplies playtime and achievements when game details are accessible. Epic/GOG owned-library connections use the community desktop protocols implemented by Legendary/GOGDL; achievements and cloud saves are not synchronized. Live authenticated Epic/GOG sign-in still needs user verification. The browser preview cannot connect accounts: use the desktop app. These latest source changes are not yet in the published V2.2 executable.

**Paramètres → Comptes** regroupe les boutons Steam, Epic Games et GOG et les bibliothèques possédées. Steam fournit aussi le temps de jeu et les succès accessibles. Les connexions Epic/GOG restent à vérifier avec des comptes réels ; leurs succès et sauvegardes ne sont pas synchronisés. Ces changements du code source ne sont pas encore inclus dans l’exécutable V2.2 publié.

See [account behavior and verification](docs/MEDIA-AND-ACHIEVEMENTS.md).

### Steam browser connection

The current source opens Steam sign-in in Chrome using your existing session. After confirming the official Steam page, Nexus links your profile. Library, Steam playtime and achievements require a Steam Web API key; SteamGridDB only supplies artwork. See the [UX audit and improvement priorities](docs/UX-AUDIT-2026-10-04.md). Included in the V2.2.0 release.

### V2.2 connected accounts / Comptes reliés

Steam, Epic and GOG account controls live in **Settings → Accounts**. Steam opens Chrome; Epic and GOG use an isolated sign-in window. Owned libraries stay separate from locally detected installation status. [Release notes](frontend/RELEASE_NOTES.md) · [Launch kit / Kit de lancement](docs/LAUNCH-KIT.md).


### Steam Achievement Notifier companion (V2.2.1)

Settings / Accounts / Steam includes an optional [Steam Achievement Notifier](https://github.com/SteamAchievementNotifier/SteamAchievementNotifier) companion. Download and install SAN from its official releases, click Detect (or choose the installed SAN executable), then enable startup before Steam games. SAN provides its own live notifications without an API key, with animations, themes and sounds configured in SAN. Steam must be running and signed in. Nexus avoids duplicate notifications when SAN launches successfully; its built-in fallback checks Steam every 30 seconds during tracked sessions. Windowed/borderless modes are recommended; exclusive fullscreen may hide notifications.

SAN remains separate and is not bundled. Historical playtime and achievement lists inside Nexus still require Steam Web API synchronization. Linking a profile alone does not activate that synchronization.

Dans Paramètres / Comptes / Steam, téléchargez et installez SAN depuis sa page officielle, puis Détecter ou Choisir SAN (.exe). Activez son lancement avant les jeux Steam. Les thèmes, animations et sons se règlent dans SAN. Ses notifications en direct ne demandent pas de clé API ; les heures et l'historique dans Nexus nécessitent toujours la synchronisation Steam. SAN reste une application séparée.
