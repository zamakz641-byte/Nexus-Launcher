# Nexus Launcher — bibliothèque, médias et ambiance

## Intention

Nexus doit se comporter comme une bibliothèque personnelle que le joueur compose lui-même, avec une présentation cinématique cohérente de l'accueil aux réglages et jusqu'au lancement. La référence GameHub porte sur la hiérarchie, le rythme et la lisibilité à la manette. Nexus conserve son identité, ses thèmes et ses icônes.

## Contraintes du projet

- Application Electron Windows sous `nexus://app/`, preload isolé, sandbox activée, lancement natif et F11 conservés.
- Le prototype Vite local et la sortie Sites continuent de compiler. Les opérations système et le stockage de secret restent propres à Electron ; le navigateur présente leur indisponibilité clairement.
- Aucun fichier ou dossier de jeu n'est modifié ni supprimé par la gestion de bibliothèque. Retirer un jeu de Nexus enlève seulement son inscription.
- La clé SteamGridDB fournie dans la conversation est un secret : elle n'apparaît ni dans ce document, ni dans le code, ni dans `localStorage`, ni dans les journaux, ni dans le bundle client. Sa saisie ultérieure se fait dans les Paramètres.
- Les nouveaux SFX restent des candidats écoutables jusqu'au choix explicite de l'utilisateur. Les anciens restent jouables. La licence doit être vérifiée fichier par fichier avant intégration.
- Les animations fréquentes privilégient `transform` et `opacity`, visent 60 FPS et respectent `prefers-reduced-motion`. Les séquences de démarrage, onboarding et lancement sont interruptibles ou limitées dans le temps.
- Les interfaces françaises et anglaises, la navigation clavier/manette, le focus visible et les formats 1920×1080 et 640×720 restent pris en charge.

## Bibliothèque personnelle

Le joueur peut ajouter plusieurs dossiers racines sans remplacer les précédents. Un dossier peut contenir des sous-dossiers de jeux ou être lui-même un dossier de jeu. Le joueur peut aussi choisir un `.exe` individuel ; Nexus crée alors une fiche modifiable. À la première exécution, Nexus présente l'ancien dossier unique enregistré et invite à le rechoisir dans le dialogue natif avant de l'inscrire ; `F:\Games` est proposé automatiquement seulement s'il existe et qu'aucune source n'a été choisie. Les ajouts, les renommages, les préférences média et les exclusions persistent dans un fichier de configuration versionné sous `app.getPath("userData")`.

La liste de dossiers indique chemin, disponibilité, date du dernier scan, nombre de jeux et erreur éventuelle. L'analyse d'un dossier défaillant ne masque pas les autres. Les doublons sont détectés après résolution canonique des chemins Windows. Le joueur peut choisir l'exécutable principal, modifier le titre et associer une entrée Steam/SteamGridDB à une fiche. « Retirer de Nexus » n'efface rien sur le disque ; un scan suivant ne réimporte pas un jeu exclu tant que l'exclusion est active.

Le processus principal valide chaque chemin reçu par IPC. Il n'autorise le lancement que d'un exécutable inscrit, choisi explicitement ou détecté sous une racine inscrite. La lecture des images locales suit la même liste de racines/fichiers autorisés. Les liens symboliques et chemins réels sont vérifiés avant ouverture.

## SteamGridDB et couvertures

Les Paramètres présentent un champ masqué « Clé API SteamGridDB », les actions Enregistrer, Tester, Remplacer et Retirer, ainsi qu'un état sans révéler la clé. Electron conserve une valeur chiffrée via `safeStorage` dans `userData`; seul le processus principal effectue les requêtes. Si le chiffrement n'est pas disponible, l'interface le signale et ne persiste pas la clé en clair. Une variable d'environnement peut rester utile en développement mais ne remplace pas le réglage utilisateur.

La récupération distingue couverture horizontale 16:9, fond héro et logo. L'ordre est : choix manuel du joueur, SteamGridDB validé, média officiel Steam, image locale, visuel Nexus. Les jeux ajoutés sont cherchés dans le catalogue au-delà de la petite table d'identifiants actuellement codée en dur ; seule une correspondance de titre normalisé exacte peut être appliquée automatiquement. Les correspondances incertaines demandent une sélection manuelle ; aucun art d'un autre jeu n'est utilisé. Changer la clé, la correspondance ou un média invalide seulement le cache concerné et actualise les fiches.

Au focus manette/clavier, l'aperçu visuel change immédiatement ; au survol souris, un délai bref évite le clignotement. Le fond charge l'image suivante avant le fondu, garde l'ancienne ou un dégradé pendant le chargement, et ne montre jamais une zone blanche. Le traitement de couleur et la lisibilité du texte s'adaptent à l'image ; la disposition des cartes reste stable.

## Son et mouvement

Une planche d'écoute compare, à volume normalisé, les six fonctions `move`, `confirm`, `back`, `tab`, `launch`, `startup` avec deux ou trois familles cohérentes et une option silencieuse. Chaque candidat montre sa provenance, sa licence et son éventuelle attribution. Les sons Runway déjà rejetés et les Kenney déjà rejetés ne reviennent pas par défaut. Les candidats PlayniteSound/ES-DE restent hors de l'application tant que leurs droits par fichier ne sont pas confirmés. Une proposition Runway nouvelle n'est faite que si son timbre est distinct et après écoute des sources existantes. Le choix de l'utilisateur précède tout remplacement.

L'onboarding raconte quatre temps : apparition du symbole Nexus, langue et ambiance, ajout de la première source, geste manette et entrée dans la bibliothèque. Les transitions sont plus composées mais l'utilisateur peut passer immédiatement. Les réglages permettent de rejouer le parcours. Au lancement d'un jeu, la carte sélectionnée devient l'origine visuelle d'une transition vers un écran plein format avec logo/nom, impulsion de lumière et retour propre en cas d'échec. La séquence ne retarde pas artificiellement l'ouverture de l'exécutable. Une ressource vidéo créée avec Runway ou Higgsfield peut servir à une rare cinématique d'accueil après validation visuelle ; la navigation et le lancement reposent sur les animations temps réel de Motion afin de rester rapides et accessibles.

## Résultat vérifiable

1. Deux dossiers et un `.exe` ajouté seul restent présents après redémarrage ; rescanner l'un ne retire pas les jeux des autres.
2. Retirer une fiche ne supprime aucun fichier ; un exécutable non inscrit ne se lance pas via IPC.
3. La clé saisie dans les Paramètres survit au redémarrage de manière chiffrée et ne figure dans aucune réponse IPC, capture, log ou sortie compilée.
4. Un jeu sans correspondance, sans réseau ou sans jaquette garde une carte et un fond utilisables. Les choix manuels persistent.
5. Les six SFX approuvés sont cohérents, écoutables avant activation et ajustables en volume ; les sons rejetés restent écartés.
6. L'onboarding et le lancement sont visibles, skippables quand approprié, sans blocage du lancement natif ; le mode mouvement réduit a une alternative lisible.
7. Les contrôles locaux, la compilation, les tests, les captures desktop/étroites et le smoke Electron passent après chaque lot.
