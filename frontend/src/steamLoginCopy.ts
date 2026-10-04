export const steamLoginCopy = {
  fr: {
    browser: 'Continuer avec Steam dans mon navigateur',
    intro: 'Nexus ouvre Chrome et réutilise votre session Steam. Validez votre profil sur le site officiel, puis revenez ici.',
    wait: 'En attente de validation dans le navigateur…', cancel: 'Annuler', linked: 'Profil Steam relié', syncReady: 'Synchronisation activée',
    syncTitle: 'Bibliothèque, temps de jeu et succès',
    difference: 'Les images et les métadonnées restent disponibles sans compte. Les données de votre compte nécessitent une clé Steam Web API, différente de SteamGridDB.',
    manual: 'Saisir le profil manuellement', cancelled: 'Connexion annulée.', timeout: 'La validation a expiré. Réessayez.',
    'browser-error': 'Chrome n’a pas pu être ouvert. Réessayez ou utilisez la saisie manuelle.',
    'connection-in-progress': 'Une connexion est déjà en cours.', 'invalid-auth': 'Steam n’a pas validé cette connexion.'
  },
  en: {
    browser: 'Continue with Steam in my browser',
    intro: 'Nexus opens Chrome and reuses your Steam session. Confirm your profile on the official site, then return here.',
    wait: 'Waiting for confirmation in your browser…', cancel: 'Cancel', linked: 'Steam profile linked', syncReady: 'Synchronization enabled',
    syncTitle: 'Library, playtime and achievements',
    difference: 'Artwork and catalog metadata remain available without an account. Your account data requires a Steam Web API key, separate from SteamGridDB.',
    manual: 'Enter profile manually', cancelled: 'Connection cancelled.', timeout: 'Confirmation timed out. Try again.',
    'browser-error': 'Chrome could not open. Try again or enter your profile manually.',
    'connection-in-progress': 'A connection is already in progress.', 'invalid-auth': 'Steam did not validate this connection.'
  }
} as const;
