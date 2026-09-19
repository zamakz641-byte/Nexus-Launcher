import type { LauncherSettings } from '../types/game';

export type Language = LauncherSettings['language'];

type Key =
  | 'home' | 'library' | 'collections' | 'achievements' | 'statistics' | 'settings'
  | 'addGame' | 'searchPlaceholder' | 'pressSearch' | 'online'
  | 'changeSection' | 'selectLaunch' | 'back' | 'details' | 'search'
  | 'ready' | 'buildLibrary' | 'emptyDescription' | 'scanLaunchers';

const STRINGS: Record<Language, Record<Key, string>> = {
  fr: {
    home: 'Accueil', library: 'Bibliothèque', collections: 'Collections', achievements: 'Succès', statistics: 'Statistiques', settings: 'Paramètres',
    addGame: 'Ajouter un jeu', searchPlaceholder: 'Rechercher un jeu, un genre, une collection…', pressSearch: 'Appuyez sur Ⓨ ou Ctrl K', online: 'En ligne',
    changeSection: 'Changer de section', selectLaunch: 'Sélectionner / Lancer', back: 'Retour', details: 'Détails', search: 'Recherche',
    ready: 'Nexus est prêt', buildLibrary: 'Construis ta bibliothèque', emptyDescription: 'Ajoute un exécutable ou scanne Steam, Epic et GOG. Nexus récupère ensuite les illustrations, métadonnées, trailers et captures disponibles.', scanLaunchers: 'Scanner les launchers',
  },
  en: {
    home: 'Home', library: 'Library', collections: 'Collections', achievements: 'Achievements', statistics: 'Statistics', settings: 'Settings',
    addGame: 'Add a game', searchPlaceholder: 'Search games, genres, collections…', pressSearch: 'Press Ⓨ or Ctrl K', online: 'Online',
    changeSection: 'Change section', selectLaunch: 'Select / Launch', back: 'Back', details: 'Details', search: 'Search',
    ready: 'Nexus is ready', buildLibrary: 'Build your library', emptyDescription: 'Add an executable or scan Steam, Epic and GOG. Nexus then fetches available artwork, metadata, trailers and screenshots.', scanLaunchers: 'Scan launchers',
  },
  es: {
    home: 'Inicio', library: 'Biblioteca', collections: 'Colecciones', achievements: 'Logros', statistics: 'Estadísticas', settings: 'Ajustes',
    addGame: 'Añadir un juego', searchPlaceholder: 'Buscar juego, género o colección…', pressSearch: 'Pulsa Ⓨ o Ctrl K', online: 'En línea',
    changeSection: 'Cambiar sección', selectLaunch: 'Seleccionar / Iniciar', back: 'Volver', details: 'Detalles', search: 'Buscar',
    ready: 'Nexus está listo', buildLibrary: 'Construye tu biblioteca', emptyDescription: 'Añade un ejecutable o escanea Steam, Epic y GOG. Nexus obtiene las ilustraciones, metadatos, tráilers y capturas disponibles.', scanLaunchers: 'Escanear launchers',
  },
};

export function tr(language: Language | undefined, key: Key): string {
  const lang = language && STRINGS[language] ? language : 'fr';
  return STRINGS[lang][key] || STRINGS.fr[key];
}

export function browserLocale(language: Language | undefined): string {
  return language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
}
