import i18n from "i18next";
import { mediaCopy } from "./media/i18n";
import { libraryCopy } from "./libraryI18n";
import { initReactI18next } from "react-i18next";

const fr = {
  nav: { home: "Accueil", library: "Bibliothèque", search: "Recherche", settings: "Paramètres", downloads: "Téléchargements" },
  action: { play: "Jouer", configure: "Configurer", install: "Installer", more: "Plus d’options", close: "Fermer", holdToPlay: "Maintenir pour jouer", refresh: "Actualiser les jeux et les images (F5)" },
  system: { theme: "Thème", language: "Langue", profile: "Profil", player: "Joueur", settings: "Paramètres", obsidienne: "Obsidienne", solaris: "Solaris", online: "En ligne" },
  hints: { title: "Commandes", enter: "Entrée", escape: "Échap", select: "Sélectionner", back: "Retour", navigate: "Naviguer", tabs: "Changer d’onglet" },
  launch: { title: "Jeu lancé", description: "{{game}} a été transmis au lanceur système local.", success: "Exécutable démarré" },
  status: { installed: "Installé", notInstalled: "Non installé", ready: "Prêt à jouer", configure: "À configurer" },
  library: {
    kicker: "COLLECTION PERSONNELLE", title: "Bibliothèque", detected: "{{count}} jeux détectés", enriching: "enrichissement des métadonnées…",
    detected_one: "{{count}} jeu détecté", detected_other: "{{count}} jeux détectés", readyCount_one: "{{count}} prêt", readyCount_other: "{{count}} prêts", readyOnly: "Prêts à jouer", allGames: "Tous les jeux", openDetails: "Ouvrir la fiche",
    emptyReady: "Aucun jeu prêt à jouer.", empty: "Aucun jeu détecté.", unavailable: "Bibliothèque indisponible", unavailableSource: "Source non accessible",
    unavailableHint: "Le dossier {{root}} n’est pas accessible. Reconnectez le lecteur ou ajoutez un autre dossier.", gameFolder: "dossier de jeux",
    retry: "Réessayer", addFolder: "Ajouter un dossier", add: "Ajouter", refreshMetadata: "Actualiser les métadonnées", trailer: "Bande-annonce", trailerAvailable: "Bande-annonce disponible",
    emptyLocal: "Aucun jeu local détecté. Lancez une analyse depuis Paramètres.", loading: "Chargement des jeux et métadonnées…", scanError: "Analyse impossible"
  },
  search: {
    kicker: "EXPLORER", title: "Recherche", description: "Retrouvez vos jeux ou explorez le catalogue officiel Steam.",
    library: "Bibliothèque", steamCatalog: "Catalogue Steam", localPlaceholder: "Titre, genre, studio…", steamPlaceholder: "Rechercher sur Steam…",
    clear: "Effacer la recherche", scope: "Source de recherche", input: "Rechercher un jeu", localCount_one: "{{count}} résultat local", localCount_other: "{{count}} résultats locaux", official: "Catalogue officiel", steamCount_one: "{{count}} résultat Steam", steamCount_other: "{{count}} résultats Steam",
    forQuery: "pour « {{query}} »", wholeCollection: "toute votre collection", local: "Local", ready: "Prêt", configure: "À configurer",
    noLocal: "Aucun jeu local trouvé", noLocalHint: "Essayez un titre, un genre ou le nom d’un studio.",
    explore: "Explorez le catalogue Steam", exploreHint: "Saisissez au moins deux caractères. Les achats et installations restent gérés par Steam.",
    steamError: "Steam ne répond pas", steamErrorHint: "La recherche externe a échoué. Votre bibliothèque locale reste disponible.", retry: "Réessayer",
    noSteam: "Aucun résultat Steam", noSteamHint: "Vérifiez l’orthographe ou essayez un titre plus court.", controller: "Manette", score: "Score {{score}}"
  },
  settings: {
    kicker: "CENTRE DE CONTRÔLE", title: "Paramètres", description: "Sources, médias et comportement de votre Nexus.", sources: "{{count}}/3 sources disponibles",
    interface: "Interface", accounts: "Comptes", accountsHeader: "Vos comptes, vos bibliothèques", libraries: "Bibliothèques", metadata: "Métadonnées", media: "Médias & trailers", downloads: "Téléchargements", play: "Jeu", accessibility: "Accessibilité",
    libraryHeader: "Votre bibliothèque locale", metadataHeader: "Choisir les meilleures données", mediaHeader: "Façonner l’expérience cinématique", genericHeader: "Configurer votre expérience",
    themeTitle: "Thème visuel", themeDesc: "Couleurs, géométrie et traitement des surfaces.", languageTitle: "Langue", languageDesc: "L’interface s’adapte immédiatement.",
    replay: "Rejouer l’introduction Nexus", localFolder: "Dossier local", change: "Changer", analyze: "Analyser tous les disques", analyzing: "Analyse…",
    executables: "Exécutables détectés", executableDesc_one: "{{count}} jeu peut être lancé directement depuis Nexus.", executableDesc_other: "{{count}} jeux peuvent être lancés directement depuis Nexus.",
    localMetadata: "Métadonnées locales", refresh: "Actualiser", steamStore: "Steam Store", steamStoreDesc: "Titres, descriptions, genres, studios, dates et trailers.",
    steamGrid: "SteamGridDB", steamGridDesc: "Grilles, héros et logos haute qualité chargés côté serveur.", active: "ACTIF", unavailable: "INDISPONIBLE", configured: "CONFIGURÉ", missingKey: "CLÉ MANQUANTE",
    trailers: "Trailers disponibles", trailersDesc: "{{count}} médias vidéo fournis par les catalogues détectés.", artwork: "Illustrations",
    artworkDesc: "SteamGridDB fournit automatiquement la meilleure grille et le meilleur hero disponibles.", auto: "AUTO",
    activeLibrary: "Bibliothèque active", transfers: "Transferts actifs", transfersDesc: "Nexus ne télécharge actuellement aucun fichier.", remoteArtwork: "Illustrations distantes",
    remoteArtworkDesc: "Les médias sont servis par leurs fournisseurs et ne sont pas simulés localement.", online: "EN LIGNE", local: "LOCAL",
    launchable: "Jeux lançables", launchableDesc: "{{count}} exécutables validés dans {{root}}.", needConfig: "Jeux à configurer", needConfigDesc: "{{count}} dossiers nécessitent la sélection d’un exécutable principal.",
    motion: "Préférence de mouvement système", motionDesc: "Nexus respecte automatiquement le réglage d’accessibilité du système.", reduced: "RÉDUIT", standard: "STANDARD",
    focus: "Focus clavier et manette", focusDesc: "Chaque contrôle conserve un indicateur lumineux visible.", controller: "Manette", controllerDesc: "Détection automatique via l’API Gamepad du navigateur.",
    sections: "Sections des paramètres", personalSources: "Sources personnelles", addCollection: "Ajouter une collection", addGameFolder: "Ajouter un dossier de jeu", addGame: "Ajouter un jeu (.exe)",
    gameFolder: "Dossier de jeu", collection: "Collection", removeFromNexus: "Retirer de Nexus", correctGameName: "VÉRIFIEZ LE NOM DU JEU", findMetadata: "Enregistrer et chercher les métadonnées", localPath: "Chemin du jeu ou du dossier", localPathHint: "C:\\Jeux\\Mon jeu ou D:\\Jeux\\jeu.exe", storeDiscovery: "Jeux Steam et Epic", storeDiscoveryDesc: "Recherche sur les lecteurs connectés ; mise à jour automatique au branchement.", autoDetected: "détecté automatiquement", localGamesFrom: "{{count}} jeux issus de {{root}}", localRoot: "la bibliothèque", loadingConfig: "Chargement de la configuration locale…",
    steamGridKey: "Votre clé SteamGridDB", steamGridKeyInput: "Clé API SteamGridDB", apiKey: "Clé API", encryptedKey: "Saisie chiffrée dans le profil local.", keyConfigured: "Configurée · {{status}}", replace: "Remplacer", save: "Enregistrer", remove: "Retirer",
    keyInvalid: "Clé refusée par SteamGridDB.", keyOffline: "Clé enregistrée ; vérification réseau indisponible.", keySaved: "Clé vérifiée et enregistrée.", keyRemoved: "Clé retirée.", checkValid: "vérifiée", checkInvalid: "invalide", checkOffline: "non vérifiée hors ligne", checkNever: "non vérifiée", saveError: "Enregistrement impossible", removeError: "Retrait impossible", addError: "Ajout impossible", scanError: "Analyse locale impossible",
    volume: "Volume global", volumeDesc: "Niveau de sortie des sons Nexus.", uiSounds: "Effets sonores UI", uiSoundsDesc: "Feedback de navigation et d’action.", uiVolume: "Volume des effets UI", mute: "Couper le son", muteDesc: "Désactiver tous les sons de l’interface.", muted: "SON COUPÉ", unmuted: "SON ACTIF", soundCredits: "Crédits sonores", soundStyle: "MINIMAL · TACTILE"
  },
  downloads: {
    kicker: "GESTIONNAIRE DE TRANSFERTS", title: "Téléchargements", description: "Une file claire pour les installations et imports autorisés.",
    scanning: "Analyse en cours", available: "Système disponible", activeQueue: "File active", zeroTransfer: "0 transfert", detected: "Bibliothèque détectée",
    localGames: "{{count}} jeux locaux", location: "Emplacement", queue: "FILE D’ATTENTE", activeTransfers: "Transferts actifs", empty: "Votre file est vide",
    emptyHint: "Les téléchargements HTTPS d’éditeurs et les torrents légalement distribués apparaîtront ici avec leur vitesse, progression et destination.",
    authorized: "Sources autorisées uniquement", extensions: "EXTENSIONS", sources: "Sources de bibliothèque", active: "ACTIF", ready: "PRÊT",
    localLibrary: "BIBLIOTHÈQUE LOCALE", readyToPlay: "Prêts à jouer", executableFound: "Exécutable détecté", executableConfirm: "Exécutable à confirmer",
    localGames_one: "{{count}} jeu local", localGames_other: "{{count}} jeux locaux", transfers_one: "{{count}} transfert", transfers_other: "{{count}} transferts",
    extensionLocalName: "Bibliothèque locale", extensionLocalDesc: "Analyse les dossiers choisis et détecte les exécutables.", extensionSteamName: "Steam officiel", extensionSteamDesc: "Recherche, métadonnées et liens vers les fiches du magasin.", extensionDirectName: "Lien direct autorisé", extensionDirectDesc: "Prévu pour les fichiers HTTPS fournis par un éditeur ou un projet open source.", extensionTorrentName: "Torrent autorisé", extensionTorrentDesc: "Prévu pour importer un .torrent ou magnet dont vous possédez les droits."
  },
  detail: {
    back: "Retour à la bibliothèque", ready: "Prêt à jouer", configRequired: "Configuration requise", trailer: "Voir le trailer",
    quickInfo: "Informations rapides", playtime: "Temps de jeu", nexusPlaytime: "Temps joué via Nexus", playtimeValue: "{{hours}} h {{minutes}} min", lastPlayed: "Dernière partie", achievements: "Succès", community: "Score communauté", modified: "Dossier modifié",
    overview: "Aperçu", media: "Médias", about: "À PROPOS", developer: "Développeur", publisher: "Éditeur", release: "Sortie",
    rating: "Classification", metadata: "Métadonnées", executable: "Exécutable", completed: "{{count}}% terminés", unlocked: "{{unlocked}} succès déverrouillés sur {{total}}",
    source: "Source : {{source}}", tabs: "Sections de la fiche jeu", achievementsTab: "Succès", installRequired: "Installation requise", notSpecified: "Non renseigné", loading: "Analyse de la bibliothèque locale…", updateSuccess: "Fiche mise à jour.", updateError: "Modification impossible",
    customize: "PERSONNALISER", gameTitle: "Titre du jeu", saveTitle: "Enregistrer le titre", chooseExecutable: "Choisir l’exécutable", chooseCover: "Choisir une jaquette", chooseBackground: "Choisir un fond", chooseLogo: "Choisir un logo"
  },
  home: { metadata: "Métadonnées du jeu", localReady: "Installation locale détectée et prête à jouer.", localConfigure: "Jeu local détecté. Exécutable principal à confirmer.", previous: "Jeu précédent", next: "Jeu suivant", noSelected: "Aucun jeu sélectionné", launchError: "Lancement impossible", loadingSpace: "Chargement de l’espace…", scanning: "Analyse de votre bibliothèque…", preparing: "PRÉPARATION", opening: "OUVERTURE DU JEU", failed: "LANCEMENT IMPOSSIBLE", startupSound: "Activer le son", startupCollection: "COLLECTION", startupSession: "OUVERTURE DE SESSION", startupLibrary: "VOTRE BIBLIOTHÈQUE", playSession: "SESSION DE JEU" },
  trailer: { preview: "Aperçu cinématique de {{game}}", videoUnavailable: "Lecture vidéo indisponible", none: "Aucune bande-annonce disponible", label: "BANDE-ANNONCE", notProvided: "Média non fourni par la source" },
  onboarding: {
    folderHero: "Où sont\nvos jeux ?", folderDesc: "Choisissez le dossier qui contient vos jeux. Nexus l’enregistre, recherche les exécutables et récupère les images disponibles. Steam et Epic sont aussi détectés automatiquement.", chooseFolder: "Choisir mon dossier de jeux", scanning: "Analyse du dossier…", later: "Configurer plus tard", useStores: "Utiliser mes jeux Steam et Epic", folderReady_one: "Dossier enregistré · {{count}} jeu dans la bibliothèque", folderReady_other: "Dossier enregistré · {{count}} jeux dans la bibliothèque", autoReady_one: "Détection automatique sélectionnée · {{count}} jeu disponible", autoReady_other: "Détection automatique sélectionnée · {{count}} jeux disponibles",
    label: "Introduction Nexus", skip: "Passer", version: "NEXUS LAUNCHER V2", hero: "Votre univers.\nUn seul passage.", heroDesc: "Une expérience PC pensée comme une console premium, fluide à la manette et entièrement personnalisable.",
    yours: "VOTRE NEXUS", languageHero: "Une interface qui\nparle votre langage.", languageDesc: "Choisissez une langue et une atmosphère. Vous pourrez tout modifier plus tard.",
    control: "PRENEZ LE CONTRÔLE", controlHero: "Tout est à\nportée de pouce.", controlDesc: "Déplacez-vous avec la croix directionnelle ou le clavier. Le focus restera toujours visible.",
    library: "VOTRE COLLECTION", libraryHero: "Vos jeux.\nVotre Nexus.", libraryDesc: "Ajoutez un dossier de jeux maintenant, ou continuez et faites-le plus tard dans les paramètres.", addFolder: "Ajouter un dossier", libraryUpdated: "Bibliothèque mise à jour.",
    language: "Langue", theme: "Thème", continue: "Continuer", enter: "Entrer dans Nexus", step: "Étape {{current}} sur {{total}}"
  }
};

const en = {
  nav: { home: "Home", library: "Library", search: "Search", settings: "Settings", downloads: "Downloads" },
  action: { play: "Play", configure: "Configure", install: "Install", more: "More options", close: "Close", holdToPlay: "Hold to play", refresh: "Refresh games and artwork (F5)" },
  system: { theme: "Theme", language: "Language", profile: "Profile", player: "Player", settings: "Settings", obsidienne: "Obsidian", solaris: "Solaris", online: "Online" },
  hints: { title: "Controls", enter: "Enter", escape: "Esc", select: "Select", back: "Back", navigate: "Navigate", tabs: "Switch tabs" },
  launch: { title: "Game launched", description: "{{game}} was handed to the local system launcher.", success: "Executable started" },
  status: { installed: "Installed", notInstalled: "Not installed", ready: "Ready to play", configure: "Needs setup" },
  library: {
    kicker: "PERSONAL COLLECTION", title: "Library", detected: "{{count}} games detected", enriching: "enriching metadata…",
    detected_one: "{{count}} game detected", detected_other: "{{count}} games detected", readyCount_one: "{{count}} ready", readyCount_other: "{{count}} ready", readyOnly: "Ready to play", allGames: "All games", openDetails: "Open details",
    emptyReady: "No games are ready to play.", empty: "No games detected.", unavailable: "Library unavailable", unavailableSource: "Source unavailable",
    unavailableHint: "The {{root}} folder is unavailable. Reconnect the drive or add another folder.", gameFolder: "game",
    retry: "Retry", addFolder: "Add folder", add: "Add", refreshMetadata: "Refresh metadata", trailer: "Trailer", trailerAvailable: "Trailer available",
    emptyLocal: "No local games found. Start a scan from Settings.", loading: "Loading games and metadata…", scanError: "Scan failed"
  },
  search: {
    kicker: "EXPLORE", title: "Search", description: "Find your games or explore the official Steam catalog.",
    library: "Library", steamCatalog: "Steam Catalog", localPlaceholder: "Title, genre, studio…", steamPlaceholder: "Search Steam…",
    clear: "Clear search", scope: "Search source", input: "Search for a game", localCount_one: "{{count}} local result", localCount_other: "{{count}} local results", official: "Official catalog", steamCount_one: "{{count}} Steam result", steamCount_other: "{{count}} Steam results",
    forQuery: "for “{{query}}”", wholeCollection: "your entire collection", local: "Local", ready: "Ready", configure: "Needs setup",
    noLocal: "No local game found", noLocalHint: "Try a title, genre, or studio name.",
    explore: "Explore the Steam catalog", exploreHint: "Type at least two characters. Purchases and installs remain managed by Steam.",
    steamError: "Steam is not responding", steamErrorHint: "External search failed. Your local library is still available.", retry: "Retry",
    noSteam: "No Steam results", noSteamHint: "Check the spelling or try a shorter title.", controller: "Controller", score: "Score {{score}}"
  },
  settings: {
    kicker: "CONTROL CENTER", title: "Settings", description: "Sources, media, and behavior for your Nexus.", sources: "{{count}}/3 sources available",
    interface: "Interface", accounts: "Accounts", accountsHeader: "Your accounts, your libraries", libraries: "Libraries", metadata: "Metadata", media: "Media & trailers", downloads: "Downloads", play: "Gaming", accessibility: "Accessibility",
    libraryHeader: "Your local library", metadataHeader: "Choose the best data", mediaHeader: "Shape the cinematic experience", genericHeader: "Configure your experience",
    themeTitle: "Visual theme", themeDesc: "Colors, geometry, and surface treatment.", languageTitle: "Language", languageDesc: "The interface updates instantly.",
    replay: "Replay the Nexus introduction", localFolder: "Local folder", change: "Change", analyze: "Scan all drives", analyzing: "Scanning…",
    executables: "Detected executables", executableDesc_one: "{{count}} game can launch directly from Nexus.", executableDesc_other: "{{count}} games can launch directly from Nexus.",
    localMetadata: "Local metadata", refresh: "Refresh", steamStore: "Steam Store", steamStoreDesc: "Titles, descriptions, genres, studios, dates, and trailers.",
    steamGrid: "SteamGridDB", steamGridDesc: "High-quality grids, heroes, and logos loaded server-side.", active: "ACTIVE", unavailable: "UNAVAILABLE", configured: "CONFIGURED", missingKey: "KEY MISSING",
    trailers: "Available trailers", trailersDesc: "{{count}} video assets supplied by detected catalogs.", artwork: "Artwork",
    artworkDesc: "SteamGridDB automatically provides the best available grid and hero.", auto: "AUTO",
    activeLibrary: "Active library", transfers: "Active transfers", transfersDesc: "Nexus is not downloading any files right now.", remoteArtwork: "Remote artwork",
    remoteArtworkDesc: "Media is served by its providers and is not simulated locally.", online: "ONLINE", local: "LOCAL",
    launchable: "Launchable games", launchableDesc: "{{count}} validated executables in {{root}}.", needConfig: "Games needing setup", needConfigDesc: "{{count}} folders still need a primary executable.",
    motion: "System motion preference", motionDesc: "Nexus automatically respects the operating system accessibility preference.", reduced: "REDUCED", standard: "STANDARD",
    focus: "Keyboard & controller focus", focusDesc: "Every control keeps a visible focus indicator.", controller: "Controller", controllerDesc: "Automatic detection through the browser Gamepad API.",
    sections: "Settings sections", personalSources: "Personal sources", addCollection: "Add collection", addGameFolder: "Add game folder", addGame: "Add game (.exe)",
    gameFolder: "Game folder", collection: "Collection", removeFromNexus: "Remove from Nexus", correctGameName: "CHECK THE GAME NAME", findMetadata: "Save and find metadata", localPath: "Game or folder path", localPathHint: "C:\\Games\\My game or D:\\Games\\game.exe", storeDiscovery: "Steam and Epic games", storeDiscoveryDesc: "Scans connected drives and refreshes automatically when one is attached.", autoDetected: "detected automatically", localGamesFrom: "{{count}} games from {{root}}", localRoot: "the library", loadingConfig: "Loading local configuration…",
    steamGridKey: "Your SteamGridDB key", steamGridKeyInput: "SteamGridDB API key", apiKey: "API key", encryptedKey: "Stored encrypted in the local profile.", keyConfigured: "Configured · {{status}}", replace: "Replace", save: "Save", remove: "Remove",
    keyInvalid: "Key rejected by SteamGridDB.", keyOffline: "Key saved; network verification unavailable.", keySaved: "Key verified and saved.", keyRemoved: "Key removed.", checkValid: "verified", checkInvalid: "invalid", checkOffline: "not verified offline", checkNever: "not verified", saveError: "Could not save", removeError: "Could not remove", addError: "Could not add", scanError: "Local scan failed",
    volume: "Master volume", volumeDesc: "Output level for Nexus sounds.", uiSounds: "UI sound effects", uiSoundsDesc: "Navigation and action feedback.", uiVolume: "UI effects volume", mute: "Mute", muteDesc: "Disable all interface sounds.", muted: "MUTED", unmuted: "SOUND ON", soundCredits: "Sound credits", soundStyle: "MINIMAL · TACTILE"
  },
  downloads: {
    kicker: "TRANSFER MANAGER", title: "Downloads", description: "A clear queue for authorized installs and imports.",
    scanning: "Scanning", available: "System available", activeQueue: "Active queue", zeroTransfer: "0 transfers", detected: "Detected library",
    localGames: "{{count}} local games", location: "Location", queue: "QUEUE", activeTransfers: "Active transfers", empty: "Your queue is empty",
    emptyHint: "Publisher HTTPS downloads and legally distributed torrents will appear here with speed, progress, and destination.",
    authorized: "Authorized sources only", extensions: "EXTENSIONS", sources: "Library sources", active: "ACTIVE", ready: "READY",
    localLibrary: "LOCAL LIBRARY", readyToPlay: "Ready to play", executableFound: "Executable detected", executableConfirm: "Executable needs confirmation",
    localGames_one: "{{count}} local game", localGames_other: "{{count}} local games", transfers_one: "{{count}} transfer", transfers_other: "{{count}} transfers",
    extensionLocalName: "Local library", extensionLocalDesc: "Scans selected folders and detects executables.", extensionSteamName: "Official Steam", extensionSteamDesc: "Search, metadata, and store page links.", extensionDirectName: "Authorized direct link", extensionDirectDesc: "For HTTPS files supplied by a publisher or open-source project.", extensionTorrentName: "Authorized torrent", extensionTorrentDesc: "For importing a .torrent or magnet link you have the rights to use."
  },
  detail: {
    back: "Back to library", ready: "Ready to play", configRequired: "Setup required", trailer: "Watch trailer",
    quickInfo: "Quick information", playtime: "Playtime", nexusPlaytime: "Time played via Nexus", playtimeValue: "{{hours}} h {{minutes}} min", lastPlayed: "Last played", achievements: "Achievements", community: "Community score", modified: "Folder modified",
    overview: "Overview", media: "Media", about: "ABOUT", developer: "Developer", publisher: "Publisher", release: "Release",
    rating: "Rating", metadata: "Metadata", executable: "Executable", completed: "{{count}}% complete", unlocked: "{{unlocked}} achievements unlocked out of {{total}}",
    source: "Source: {{source}}", tabs: "Game detail sections", achievementsTab: "Achievements", installRequired: "Installation required", notSpecified: "Not specified", loading: "Scanning local library…", updateSuccess: "Game details updated.", updateError: "Could not update",
    customize: "CUSTOMIZE", gameTitle: "Game title", saveTitle: "Save title", chooseExecutable: "Choose executable", chooseCover: "Choose cover", chooseBackground: "Choose background", chooseLogo: "Choose logo"
  },
  home: { metadata: "Game metadata", localReady: "Local installation detected and ready to play.", localConfigure: "Local game found. Main executable needs confirmation.", previous: "Previous game", next: "Next game", noSelected: "No game selected", launchError: "Could not launch game", loadingSpace: "Loading workspace…", scanning: "Scanning your library…", preparing: "PREPARING", opening: "OPENING GAME", failed: "LAUNCH FAILED", startupSound: "Enable sound", startupCollection: "COLLECTION", startupSession: "OPENING SESSION", startupLibrary: "YOUR LIBRARY", playSession: "PLAY SESSION" },
  trailer: { preview: "Cinematic preview of {{game}}", videoUnavailable: "Video playback unavailable", none: "No trailer available", label: "TRAILER", notProvided: "Media not provided by the source" },
  onboarding: {
    folderHero: "Where are\nyour games?", folderDesc: "Choose the folder containing your games. Nexus saves it, finds executables and retrieves available artwork. Steam and Epic installations are also detected automatically.", chooseFolder: "Choose my games folder", scanning: "Scanning your folder…", later: "Set up later", useStores: "Use my Steam and Epic games", folderReady_one: "Folder saved · {{count}} game in your library", folderReady_other: "Folder saved · {{count}} games in your library", autoReady_one: "Automatic discovery selected · {{count}} game available", autoReady_other: "Automatic discovery selected · {{count}} games available",
    label: "Nexus introduction", skip: "Skip", version: "NEXUS LAUNCHER V2", hero: "Your universe.\nOne passage.", heroDesc: "A premium console-like PC experience, controller-first and fully customizable.",
    yours: "YOUR NEXUS", languageHero: "An interface that\nspeaks your language.", languageDesc: "Choose a language and atmosphere. You can change everything later.",
    control: "TAKE CONTROL", controlHero: "Everything is\nwithin thumb’s reach.", controlDesc: "Navigate with the D-pad or keyboard. Focus always remains visible.",
    library: "YOUR COLLECTION", libraryHero: "Your games.\nYour Nexus.", libraryDesc: "Add a game folder now, or continue and add one later in Settings.", addFolder: "Add a folder", libraryUpdated: "Library updated.",
    language: "Language", theme: "Theme", continue: "Continue", enter: "Enter Nexus", step: "Step {{current}} of {{total}}"
  }
};

const resources = { fr: { common: { ...fr, library: { ...fr.library, ...libraryCopy.fr }, media: mediaCopy.fr } }, en: { common: { ...en, library: { ...en.library, ...libraryCopy.en }, media: mediaCopy.en } } } as const;
const initialLocale = typeof localStorage !== "undefined" && localStorage.getItem("nexus.locale.v1") === "en" ? "en" : "fr";
void i18n.use(initReactI18next).init({ resources, lng: initialLocale, fallbackLng: "en", defaultNS: "common", interpolation: { escapeValue: false } });
if (typeof document !== "undefined") {
  document.documentElement.lang = initialLocale;
  document.documentElement.dir = i18n.dir(initialLocale);
}

export default i18n;
