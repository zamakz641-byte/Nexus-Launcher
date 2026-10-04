<div align="center">

<img src="frontend/public/assets/brand/nexus-mark.png" alt="Nexus Launcher" width="88" />

# Nexus Launcher

**Your PC game library, in one cinematic space.**  
**Tous vos jeux PC dans un espace cinématique.**

[English](#english) · [Français](#français) · [Download V2.1](https://github.com/zamakz641-byte/Nexus-Launcher/releases/tag/v2.1.0)

<img src="frontend/docs/screenshots/home.png" alt="Nexus Launcher home screen" width="100%" />

</div>

## English

Nexus Launcher is a Windows desktop app for browsing and launching games from a visual, controller-friendly library. It finds installed Steam and Epic games, and lets you add any other Windows game by choosing its `.exe` file.

### Highlights

- **One library:** scan connected drives for Steam and Epic installations, add game folders, or pick an individual executable.
- **Game details:** fetch available Steam metadata, artwork, and trailers; correct a game's title to search again.
- **Personal controls:** choose covers and backgrounds, set a SteamGridDB API key in the desktop app, and switch between French and English.
- **Made for the couch:** keyboard and controller navigation, a cinematic home screen, and the restrained “Minimal · tactile” sound set.
- **Playtime:** tracks sessions launched through Nexus. Earlier time played in Steam or Epic is not imported.

<table><tr><td width="50%"><img src="frontend/docs/screenshots/library.png" alt="Landscape game library" /></td><td width="50%"><img src="frontend/docs/screenshots/settings.png" alt="Library settings and game sources" /></td></tr></table>

### Download and install

1. Open the [V2.1 release](https://github.com/zamakz641-byte/Nexus-Launcher/releases/tag/v2.1.0).
2. Choose **Setup.exe** for an installer or **Portable.exe** to run without installation. Both are for **Windows x64**.
3. On first launch, choose your games folder in the native picker, use automatic Steam/Epic discovery, or explicitly set up later. Add more sources in **Settings → Libraries**.

The V2.1 binaries are not code signed; Windows may show a publisher warning. Nexus does not remove game files when you remove an entry from its library.

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

Artwork now persists offline, refresh is available throughout the app (button or F5), and holding a ready game launches it. The desktop app minimizes during tracked sessions and returns afterward. Account achievement sync is planned with real Steam data and explicit account requirements. See [reliability, verification and sync roadmap](docs/RELIABILITY-AND-SYNC.md) for behavior and limits. The V2.1 installers include these improvements.

Les images sont conservées hors ligne, l’actualisation est accessible partout (bouton ou F5) et un appui long lance le jeu choisi. Nexus se réduit pendant les sessions suivies et revient à leur fermeture. Les succès synchronisés sont prévus via les données réelles du compte Steam. Voir [les détails et limites](docs/RELIABILITY-AND-SYNC.md). Les installateurs V2.1 incluent ces améliorations.

Nexus Launcher est une application Windows pour parcourir et lancer vos jeux dans une bibliothèque visuelle adaptée au clavier et à la manette. Elle détecte les jeux Steam et Epic installés et permet d’ajouter n’importe quel jeu Windows en sélectionnant son fichier `.exe`.

### Fonctionnalités

- **Une seule bibliothèque :** analyse des lecteurs connectés, ajout de dossiers et sélection directe d’un exécutable.
- **Fiches de jeu :** métadonnées Steam disponibles, jaquettes et bandes-annonces ; un titre corrigé relance la recherche.
- **Personnalisation :** choix des images, clé SteamGridDB dans l’application de bureau et interface en français ou en anglais.
- **Navigation salon :** clavier, manette, accueil cinématique et sons discrets « Minimal · tactile ».
- **Temps de jeu :** suivi des sessions lancées depuis Nexus. Les heures déjà jouées sur Steam ou Epic ne sont pas importées.

### Télécharger

1. Ouvrez la [release V2.1](https://github.com/zamakz641-byte/Nexus-Launcher/releases/tag/v2.1.0).
2. Choisissez **Setup.exe** pour l’installation ou **Portable.exe** pour lancer Nexus sans installation. Les deux versions sont pour **Windows x64**.
3. Au premier démarrage, choisissez le dossier de vos jeux dans l’explorateur. Vous pouvez aussi utiliser Steam/Epic ou configurer plus tard. Ajoutez ensuite des sources dans **Paramètres → Bibliothèques**.

Les exécutables V2.1 ne sont pas signés ; Windows peut afficher un avertissement d’éditeur inconnu. Retirer un jeu de Nexus ne supprime jamais ses fichiers.

### Développement

Les commandes de construction et de test figurent dans la section [Build from source](#build-from-source). Conservez les clés API dans l’application ou dans un environnement local, jamais dans le dépôt.

Après `npm ci`, double-cliquez sur [`LANCER_NEXUS.cmd`](LANCER_NEXUS.cmd) pour construire et ouvrir la version actuelle. Le script `frontend/scripts/create-shortcut.ps1` crée un raccourci sur le Bureau.

L’ancienne édition Python/pywebview est conservée dans [`archive/legacy-python-v1.7`](archive/legacy-python-v1.7). Le projet actif se trouve dans `frontend/` : interface dans `src/`, services de bureau dans `backend/`. Les exécutables publiés sont sur [GitHub Releases](https://github.com/zamakz641-byte/Nexus-Launcher/releases).



## V2.1: Media & achievements / Médias et succès

Clearer artwork, a calm HD slideshow, multiple Steam trailers, screenshot galleries and real Steam achievements with encrypted credentials.

Des fonds plus clairs, un diaporama HD, plusieurs trailers Steam, une galerie de captures et des succès Steam réels avec identifiants chiffrés.

[Behavior and limitations / Fonctionnement et limites](docs/MEDIA-AND-ACHIEVEMENTS.md)
