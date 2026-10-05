# Nexus Launcher V2.2.1 — Steam progress & achievement notifications

## Français

- Intégration optionnelle de Steam Achievement Notifier (SAN) installé : détection, choix natif du .exe et lancement avant les jeux Steam. SAN gère ses notifications en direct sans clé API ; Nexus évite ses propres notifications en doublon. SAN se télécharge séparément depuis sa page officielle.

- Profil Steam relié : indication claire que la synchronisation nécessite encore une clé Steam Web API distincte de SteamGridDB.
- Temps Steam réel, y compris zéro, ou explication des données indisponibles avec actualisation manuelle.
- Notifications des nouveaux succès Steam pendant les jeux lancés depuis Nexus, réglage et aperçu de test. Les anciens succès ne sont pas rejoués.
- Vérification toutes les 30 secondes pendant la session, sous réserve du délai Steam. Arrêt à la fermeture du jeu et protection lors du changement de compte.
- Actualisation des succès et du temps Steam au retour du jeu.

### Installation et limites

Windows x64 : Setup ou Portable. Exécutables non signés. Activez la synchronisation dans Paramètres / Comptes / Steam et rendez les détails des jeux accessibles. Notifications prévues en mode fenêtré ou sans bordures ; le plein écran exclusif peut les masquer. Succès Epic/GOG non synchronisés. La connexion seule ne fournit pas les heures et succès. Tests avec fournisseurs contrôlés : validation sur votre compte réel encore nécessaire.

## English

- Optional installed Steam Achievement Notifier (SAN) companion: detection, native executable picker and startup before Steam games. SAN provides live notifications without an API key; Nexus suppresses duplicate notifications. Download SAN separately from its official release page.

- Linked Steam profiles clearly show that synchronization still needs a separate Steam Web API key.
- Real Steam playtime, including zero, or an actionable explanation with manual refresh.
- New Steam achievement notifications during games launched through Nexus, with a preference and labeled test preview. Existing unlocks are not replayed.
- Checks every 30 seconds during tracked sessions, subject to Steam reporting delays; stops on game exit and discards results after account changes.
- Refreshes Steam playtime and achievements on returning from a game.

### Installation and limitations

Windows x64: Setup or Portable. Unsigned builds. Enable synchronization in Settings / Accounts / Steam and allow access to game details. Notifications target windowed and borderless games; exclusive fullscreen may hide them. Epic/GOG achievements are not synchronized. Sign-in alone does not provide progress. Controlled-provider tests passed; real-account validation remains necessary.

---

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
