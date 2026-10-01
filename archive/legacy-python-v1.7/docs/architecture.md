# Architecture Nexus

## Frontend

Le frontend React n'a aucune responsabilité système directe. Il affiche l'état et passe par le bridge `window.pywebview.api` pour toute opération native. Les sections restent séparées en composants/vues afin d'éviter un fichier monolithique.

## Backend natif

`NexusApi` expose une surface réduite au frontend : scan, import, bibliothèque, sessions, paramètres, lancement et gestion de fenêtre. Les téléchargements se font dans des jobs worker afin de ne jamais bloquer l'UI.

## Persistance

SQLite est configuré en WAL. Les jeux sont persistés comme documents JSON, les sessions sont relationnelles pour permettre les agrégations statistiques. Les médias sont stockés par `game-id` dans le profil local.

## Import et enrichissement

`GameEnricher` persiste le jeu après chaque étape importante. SteamGridDB est utilisé pour les illustrations lorsque sa clé est présente. Steam Store fournit les métadonnées et trailers. Pour un import manuel/Epic/GOG, Nexus ne rattache automatiquement un Steam AppID que si la correspondance de titre dépasse un seuil strict.

## Lancement

Le frontend joue la séquence Nexus, puis appelle le backend. Le backend lance l'URI Steam ou le `.exe`, surveille le processus et enregistre la session à sa fermeture. Le mode faible impact masque l'interface et dépriorise le host/WebView2.
