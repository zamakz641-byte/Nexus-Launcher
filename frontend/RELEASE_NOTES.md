# Nexus Launcher V2.5 · Saves & Continuity

## Français

- Nexus Saves : plugin natif optionnel basé sur la bibliothèque MIT Ludusavi, sans son interface et sans alourdir le launcher avec le moteur.
- Destination au choix dans l’explorateur, jusqu’à cinq versions complètes, fichiers et entrées de registre pris en charge.
- Sauvegarder, analyser et restaurer depuis la fiche du jeu. Restauration confirmée avec protection de l’état actuel dans Recovery.
- Récupération possible lorsque les fichiers actuels ont disparu. Les échecs partiels bloquent la restauration.
- Sauvegarde automatique après la fermeture d’un jeu lancé par Nexus, sur activation volontaire.
- Plugins en verre, français/anglais, tailles vérifiées, activation et désinstallation indépendantes. Les sauvegardes et médias sont conservés.
- Verrou entre lancement du jeu et opérations de sauvegarde, annulation du téléchargement et arrêt propre du moteur.
- Les erreurs de sauvegarde automatique sont visibles dans la fiche du plugin.

Un dossier synchronisé par votre client cloud peut servir de destination. Nexus confirme la copie locale, pas l’envoi au cloud. Les jeux doivent être reconnus dans le catalogue Ludusavi ; les jeux lancés hors de Nexus ne sont pas détectés comme sessions actives. Fermez-les avant de sauvegarder ou restaurer. Pas de connexion directe aux fournisseurs cloud ni de suspension en mémoire dans cette version.

## English

- Nexus Saves: optional native plugin using Ludusavi's MIT library without its desktop UI or engine binaries in the base launcher.
- Choose your destination with the file explorer; retain up to five full versions of supported files and registry data.
- Scan, back up and restore from game details. Confirmed restore first protects current data in the separate Recovery layout.
- Recover deleted live saves; partial protection errors prevent restoration.
- Opt-in automatic backup after a game launched through Nexus closes.
- Console glass plugin controls, English/French, verified sizes and independent activation/uninstall. Backups and media are preserved.
- Save operations and game launch are mutually excluded; downloading can be cancelled and owned engine processes drain before shutdown.
- Automatic backup errors are visible in the plugin card.

An existing cloud client folder can be a destination. Nexus confirms local copies, not cloud uploads. Games need a matching Ludusavi catalog entry. Games started outside Nexus are not detected as active sessions; close them before save operations. Direct cloud-provider sign-in and RAM suspend are not included.

---

# Nexus Launcher V2.4 · Capture & Plugins

## Français

- Galerie console en verre : captures, clips, favoris, dossiers personnels et lecteur vidéo à la manette.
- Capture explicite Ctrl + Maj + F8 intégrée, même sans plugin.
- Nexus Replay est un plugin indépendant téléchargé depuis notre GitHub. Installation vérifiée par SHA256, activation, désactivation et désinstallation dans Nexus. Les médias restent sur disque.
- Moteur natif dérivé de GameHQ sous GPL-3.0, sans galerie Qt, thèmes, updater ni interface séparée. Sources et notices disponibles avec le plugin.
- Premier profil : buffer 30 secondes, 720p, 30 fps, sans audio. Ctrl + Maj + F9 sauvegarde un clip réel pendant un jeu lancé par Nexus.
- Backend de bureau séparé de Vite ; les outils de développement ne sont plus distribués avec l’application.

La capture d’un jeu exige Windows et un GPU/encodeur compatibles. Plein écran exclusif, protections ou lanceurs intermédiaires peuvent limiter la détection et les notifications. Aucun enregistrement sans activation volontaire. Les bindings Share/Guide, l’audio, Quick Menu et les sauvegardes cloud sont à venir. Les EXE ne sont pas signés.

## English

- Console glass gallery: screenshots, clips, favorites, approved media folders and controller video playback.
- Explicit Ctrl + Shift + F8 screenshots work without a plugin.
- Nexus Replay is a separate optional GitHub download, with SHA256 checks, integrated enable/disable/uninstall and preserved media.
- GPL-3.0 native engine based on GameHQ, without a Qt gallery, themes, updater or separate UI. Corresponding source and notices accompany the plugin.
- Initial preset: 30 seconds / 720p / 30 fps, without audio. Ctrl + Shift + F9 saves a real replay during games launched through Nexus.
- Desktop backend no longer imports Vite; development tools are excluded from installed builds.

Windows capture needs a compatible GPU/encoder. Exclusive fullscreen, protected games and intermediate launchers can limit targeting or notifications. Recording requires opt-in. Share/Guide bindings, audio, Quick Menu and cloud saves remain future work. EXEs are unsigned.

[Plugin source](../plugins/nexus-replay) · [Upstream GameHQ](https://github.com/UnderFusion/GameHQ)
