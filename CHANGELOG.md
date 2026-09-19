## 1.6.7 — Startup Sound Sync
- SFX startup joué pendant le vrai boot HTML, avec le pack actif.
- Fallback React sans double lecture.
- Endpoint local minimal et sans cache pour le profil audio de démarrage.

# v1.6.3 — Startup synchronisé et anti-écran noir

- Le splash Nexus est désormais rendu dans `index.html` avant React et avant toute bibliothèque.
- Le launcher reste caché tant que le bootstrap natif n'a pas réellement résolu son premier état.
- La séquence ne disparaît plus sur un écran noir si le backend prend plus de temps que prévu.
- Handoff synchronisé startup -> application avec délai minimum console et fondu croisé.
- En cas de crash React, le mode Recovery force la sortie du splash au lieu de laisser un écran noir.
- Les assets `public/` participent maintenant au calcul de rebuild Windows.
- 36 tests Python + test E2E Chromium/Xvfb du contrat de démarrage.

---

# v1.6.2 — First launch + Git push hotfix

- Corrige le crash `AttributeError: NexusApi has no attribute storage` introduit par la sécurisation pywebview 6.2.1.
- Corrige `NativeCommandError: No such remote origin` sous Windows PowerShell 5.1.
- Ajoute automatiquement `origin` quand il manque et configure une identité Git locale de secours.
- Ajoute deux tests de régression dédiés.

# Changelog

## 1.5.0

- Added safe data-only `.nxsfx` sound-pack extensions with complete-cue validation.
- Added Nexus startup animation and startup SFX cue.
- Replaced visible Lucide vector icons with fetched PNG assets.
- Added real PNG PlayStation/Xbox/Switch controller prompts.
- Added Nexus Console / Nexus Glass legal built-in audio profiles.
- Added official repository extension catalog/schema.
- Preserved low-impact WebView2 sleep mode and added lightweight view transitions.

# 1.4.0 - Performance, console navigation & completion pass

- analysed a real 154 s Nexus session recording and removed the most expensive full-screen blur/filter paths
- double-buffered Hero artwork: the previous image stays visible until the next one has decoded, avoiding black flashes while browsing
- adjacent Hero preloading and 30 Hz controller polling; controller polling drops to a heartbeat while hidden/in-game
- local artwork is resized after download (Hero 1080p, covers 800x1200, screenshots 1600x900) to reduce WebView2 decode/VRAM spikes
- cache-busted local media URLs so a metadata refresh is visible immediately without disabling browser caching
- lightweight modals, launch sequence and dashboard; no full-screen backdrop-filter
- home rail cards polished and memoized, with PlayStation/Xbox-aware controller glyphs
- native PlayStation face-button shapes, L1/R1 hints and consistent controller focus
- real Steam achievement synchronisation, rarity, locked/unlocked icons and completion view
- collections are now interactive and controller-navigable instead of decorative-only cards
- quit controls in the top bar, sidebar and Settings, backed by a native pywebview close action
- renderer ErrorBoundary prevents a React render exception from leaving a permanent black screen
- Nexus DOM is awakened before the hidden WebView is shown after a game exits, reducing return-to-launcher black flashes
- development launcher now skips pip reinstall and React rebuild when inputs have not changed
- GitHub Windows release workflow fetches licensed SFX before build and publishes v1.4.0 beta

# 1.3.0 - Controller + persistent library hotfix

- Deterministic controller navigation and cover rail confinement.
- Fixed absolute close buttons moving when controller focus was applied.
- Added same-origin HTTP bootstrap endpoint for instant persisted library loading.
- Added warm library cache and native bridge retries.
- Skip redundant frontend rebuilds on unchanged launches.

# Changelog

## Mega Patch V2 — 2026-09-15

### Noms d’exécutables & édition manuelle
- Résolveur de nom renforcé : Nexus remonte les dossiers parents et ignore `Engine`, `Binaries`, `Win64`, `x64`, `bin`, `common`, etc.
- Les suffixes techniques `Win64`, `Shipping`, `DX12`, `Launcher` et similaires sont supprimés des noms d’EXE.
- Les petits codenames internes (`ASC`, `b1`, etc.) sont pénalisés lorsqu’un dossier parent descriptif existe.
- Exemple couvert par test : `Assassin's Creed Shadows/ASC/Engine/.../ASC-Win64-Shipping.exe` → **Assassin's Creed Shadows**.
- Ajout d’un écran de confirmation avant l’import manuel avec suggestions de noms.
- Le nom affiché peut être modifié depuis la fiche et verrouillé indépendamment de l’identité Steam/SteamGridDB.

### Trailers
- Le trailer direct Steam reste lisible en streaming même si sa mise en cache locale échoue.
- Ajout d’une recherche YouTube en dernier recours via `yt-dlp` pour récupérer uniquement l’identifiant/embed, sans télécharger la vidéo.
- Bouton **Chercher le trailer** dans la fiche lorsqu’aucun trailer n’est lié.

### Manette
- Nouvelle navigation spatiale basée sur la géométrie réelle des contrôles.
- Les modales deviennent des scopes de focus : détails, identité/version, ajout de jeu, recherche, éditeur de nom et boutons d’action sont navigables sans souris.
- `A` active le contrôle ciblé et `B` ferme le scope actif.
- Correction du lancement accidentel du jeu derrière une modale lorsqu’un champ texte était actif.

### SFX
- Remplacement du pack précédent par **Kenney Interface Sounds** en WAV CC0.
- Suppression de la dépendance npm UI SFX précédente.
- Téléchargement automatique et cache local des 10 one-shots réellement utilisés via `scripts/fetch_sfx.py`, avec jsDelivr en secours.
- Aucun SFX procédural et aucun son propriétaire de console copié.

### Compatibilité & validation
- Migration transparente de `sfxPack: nexus-modern` vers `nexus-console`.
- Version applicative : **1.1.0**.
- 23 tests backend passent.
- `python -m compileall` validé.
- Syntaxe TS/TSX validée sur 27 fichiers.
- Le build Vite complet reste à exécuter sous Windows car le registre npm est inaccessible depuis l’environnement de génération.

## Mega Patch — 2026-09-15

### Identification & métadonnées
- Ajout d'un resolver d'identité inspiré de Playnite : la bibliothèque et les providers de métadonnées sont séparés.
- Recherche de candidats Steam et SteamGridDB avec score de confiance.
- Écran **Corriger l'identité / la version** avec titre, image, année, studio et score.
- Les noms issus des exécutables sont normalisés (`FIFA23` → `FIFA 23`, `motogp26 Win64 Shipping` → `motogp 26`).
- Un nom sans version qui possède des variantes annuelles, comme `eFootball`, n'est plus associé silencieusement au premier résultat. Nexus demande une sélection.
- L'identité choisie manuellement est verrouillée et réutilisée lors des rafraîchissements.
- Provenance et confiance des métadonnées enregistrées champ par champ.
- IGDB reste totalement optionnel.

### Médias & trailers
- SteamGridDB : cover, hero, logo et icône, téléchargés puis mis en cache localement.
- Steam Store : métadonnées officielles, screenshots et sélection intelligente du meilleur trailer.
- Trailer Steam direct mis en cache localement quand possible.
- Fallback IGDB/YouTube nocookie en streaming intégré lorsque configuré.
- Serveur média localhost same-origin avec support HTTP Range pour lecture/seek des trailers.

### Lancement & privilèges
- Nexus n'exige plus de privilèges administrateur globaux.
- Option **Lancer ce jeu en administrateur** par jeu.
- Fallback automatique vers l'UAC Windows uniquement quand le jeu renvoie `ERROR_ELEVATION_REQUIRED (740)`.
- Les URI Steam/launchers restent lancées normalement.

### Faible impact en jeu
- Fenêtre Nexus masquée après le lancement si l'option est activée.
- Animations/transitions UI suspendues pendant la partie.
- SFX stoppés pendant la partie.
- Processus Nexus en priorité Below Normal et processus WebView2 enfants en Idle.
- Aucun téléchargement/scan déclenché pendant la session.
- Surveillance de fin de processus à faible coût avec retour de la fenêtre avant le refresh des stats.
- Retour visuel visé en quelques centaines de millisecondes après fermeture d'un jeu suivi directement.

### Animation & SFX
- Nouvelle animation de lancement Nexus : hero, extinction UI, rubans lumineux, particules CSS, horizon flash, glyph Nexus puis logo du jeu.
- Les anciens sons synthétisés WebAudio sont remplacés par des one-shots audio réels.
- Mega Patch V2 utilise désormais Kenney Interface Sounds en WAV CC0 ; voir `THIRD_PARTY_NOTICES.md`.

### Langues
- Infrastructure i18n FR / EN / ES.
- Langue d'interface et langue des métadonnées séparées dans les paramètres.
- Steam/achievements suivent la langue de métadonnées lorsque disponible.

### Qualité
- 17 tests backend passent.
- Compilation Python validée.
- Vérification de syntaxe TS/TSX validée sur 27 fichiers hors déclarations `.d.ts`.
- Le build Vite complet n'a pas pu être exécuté dans l'environnement de génération car le registre npm y expire ; le script Windows effectue `npm install` puis `npm run build` avant lancement.

## 1.2.0 - Controller + trailer + rail hotfix
- Unification de la navigation manette en un seul focus spatial bleu/cyan.
- Les cartes du rail Home font maintenant partie de la navigation globale et sélectionnent le Hero au focus.
- La carte correspondant au Hero est automatiquement recentrée dans le rail horizontal.
- Cross/A active le contrôle actuellement focusé sur tous les écrans et modales ; détection PlayStation pour les hints ✕ ○ □ △.
- Les cartes Bibliothèque sont maintenant focusables à la manette ; leurs actions rapides apparaissent aussi au focus clavier/manette.
- Le trailer remplace sa miniature pendant la lecture au lieu d'ajouter un second lecteur en dessous.
- Circle/B ferme d'abord le lecteur trailer avant de fermer la fiche jeu.
- Le premier résultat du résolveur d'identité est sélectionnable directement à la manette.
- Renforcement du pont pywebview : revalidation de l'API live et fallback si bootstrap est momentanément indisponible.

## v1.6.5 — Offline Asset Boot Fix
- Bundle complet de 70 PNG essentiels dans la release.
- Suppression de toute dépendance réseau pour les icônes au premier lancement.
- Réparation locale non bloquante des PNG manquants/corrompus.
- Build release stricte sur l'intégrité des assets.

## v1.6.6
- Durcissement de l'installation des extensions audio `.nxsfx`.
- Validation des headers audio et blocage des archives à risque.
- Ajout d'un pack console original Nova et d'un builder de pack personnel.
