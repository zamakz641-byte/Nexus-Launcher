export const accountsCopy = {
  fr: {
    title:'Comptes connectés', subtitle:'Retrouvez vos bibliothèques et votre progression.',
    steam:'Bibliothèque possédée, temps de jeu Steam et succès.', epic:'Bibliothèque possédée Epic. Les succès et les sauvegardes ne sont pas synchronisés.', gog:'Bibliothèque possédée GOG. Les succès et les sauvegardes ne sont pas synchronisés.',
    connect:'Connecter', manage:'Gérer le compte', disconnect:'Déconnecter', sync:'Actualiser', busy:'Connexion en cours…', connected:'Connecté', notConnected:'Non connecté', desktop:'La connexion aux comptes est disponible dans l’application Windows.',
    owned:'jeux possédés', search:'Rechercher dans ce compte', installed:'Installé dans Nexus', notInstalled:'Non détecté sur cet appareil', open:'Ouvrir la fiche', lastSync:'Dernière synchronisation', cached:'Données enregistrées', library:'Bibliothèque du compte', empty:'Aucun jeu dans cette bibliothèque.',
    unconfigured:'Connectez ce compte pour récupérer sa bibliothèque.', private:'Les détails des jeux Steam sont privés. Rendez-les publics pour les synchroniser.', offline:'Service inaccessible. Les dernières données restent disponibles.', error:'La synchronisation a échoué. Réessayez.',
    cancelled:'Connexion annulée.', timeout:'La connexion a expiré. Réessayez.', 'storage-unavailable':'Le stockage chiffré est indisponible.', 'invalid-provider':'Fournisseur invalide.', 'invalid-account':'Le compte n’a pas pu être vérifié.', 'invalid-auth':'La session a expiré. Reconnectez le compte.',
    loading:'Chargement de la bibliothèque…', choose:'Choisissez un compte', noResults:'Aucun jeu ne correspond.', close:'Fermer', customize:'Personnaliser', playtime:'Temps joué sur Steam', minutes:'min', settings:'Relier mes comptes', credentials:'Les identifiants sont chiffrés sur cet appareil. Votre mot de passe est saisi sur la page du fournisseur.',
  },
  en: {
    title:'Connected accounts', subtitle:'Find your libraries and your progress.',
    steam:'Owned library, Steam playtime and achievements.', epic:'Owned Epic library. Achievements and saves are not synchronized.', gog:'Owned GOG library. Achievements and saves are not synchronized.',
    connect:'Connect', manage:'Manage account', disconnect:'Disconnect', sync:'Refresh', busy:'Connecting…', connected:'Connected', notConnected:'Not connected', desktop:'Account connections are available in the Windows application.',
    owned:'owned games', search:'Search this account', installed:'Installed in Nexus', notInstalled:'Not detected on this device', open:'Open game details', lastSync:'Last synchronized', cached:'Saved data', library:'Account library', empty:'No games in this library.',
    unconfigured:'Connect this account to retrieve its library.', private:'Steam game details are private. Make them public to synchronize.', offline:'Service unreachable. Previous data remains available.', error:'Synchronization failed. Try again.',
    cancelled:'Connection cancelled.', timeout:'Connection timed out. Try again.', 'storage-unavailable':'Encrypted storage is unavailable.', 'invalid-provider':'Invalid provider.', 'invalid-account':'The account could not be verified.', 'invalid-auth':'The session expired. Reconnect this account.',
    loading:'Loading library…', choose:'Choose an account', noResults:'No matching games.', close:'Close', customize:'Customize', playtime:'Steam playtime', minutes:'min', settings:'Connect my accounts', credentials:'Credentials are encrypted on this device. Your password is entered on the provider’s page.',
  },
} as const;
