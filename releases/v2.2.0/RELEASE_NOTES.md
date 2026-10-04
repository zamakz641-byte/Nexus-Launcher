# Nexus Launcher V2.2.0 — Connected accounts & clearer navigation

## Français

- Connexion Steam dans Chrome avec votre session existante et validation sur le site officiel. Repli vers le navigateur par défaut si Chrome est absent.
- Section Comptes avec Steam, Epic et GOG : bibliothèques possédées, recherche, actualisation et cache hors ligne.
- Profil Steam relié sans demander la clé API au préalable. Synchronisation du temps Steam et des succès après configuration d’une clé Steam Web API et accès aux données du profil.
- Bibliothèque épurée : jaquettes 16:9, recherche, filtres de disponibilité et plateforme, tri et ajout natif d’exécutables/dossiers.
- Fiches avec cover, une seule description et personnalisation dans un dialogue. Surface opaque des dialogues et retour du focus corrigés.
- Actions Jouer visibles dans les fenêtres basses ; fiches, paramètres et téléchargements adaptés aux fenêtres moyennes.
- Sources réelles dans la recherche et écran de récupération en cas d’échec de chargement d’une page.
- Préserve les médias HD, trailers, images hors ligne, navigation manette et introduction FR/EN.

### Installation

Windows x64 : choisissez Setup pour installer ou Portable pour lancer sans installation. Au premier démarrage, Nexus demande votre dossier de jeux. Vos jeux ne sont jamais supprimés lorsque vous retirez une entrée de Nexus.

### Limites connues

Les exécutables ne sont pas signés. SteamGridDB fournit les images, pas les données de compte : celles-ci utilisent une clé Steam Web API distincte. Les succès/sauvegardes Epic et GOG et l’installation des jeux possédés depuis Nexus ne sont pas synchronisés. Un jeu possédé n’est pas marqué installé sans détection locale. Les flux de comptes sont vérifiés par tests contrôlés ; leur validation avec une session réelle reste nécessaire. La disponibilité des données dépend du fournisseur et des réglages de confidentialité.

## English

- Steam sign-in opens Chrome using your existing session and official Steam confirmation, with a default-browser fallback.
- Accounts section for Steam, Epic and GOG: owned libraries, search, refresh and offline cache.
- Link a Steam identity before providing an API key; enable historical Steam playtime and achievement sync with a separate Steam Web API key and accessible profile data.
- Cleaner 16:9 library with search, availability/platform filters, sorting and native executable/folder pickers.
- Artwork-led game details, one description, customization dialog, opaque readable dialogs and restored focus.
- Play controls remain visible in short windows; detail, settings and download layouts adapt to medium windows.
- Accurate source badges in search and a recovery screen when route loading fails.
- Retains HD media, trailers, offline artwork, controller navigation and FR/EN startup films.

### Installation and limitations

Windows x64: Setup installs the app; Portable runs without installation. First launch asks for your games folder. Removing a Nexus entry never deletes game files.

Builds are unsigned. SteamGridDB is for artwork; account progress needs a separate Steam Web API key. Epic/GOG achievements and cloud saves, and game installation from owned libraries, are not supported. Owned games are not shown as installed without local evidence. Account behavior is tested with controlled providers; real-session validation remains necessary. Provider availability and profile privacy affect synchronization.
