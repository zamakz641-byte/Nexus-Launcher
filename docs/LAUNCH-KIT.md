# Nexus Launcher — kit de lancement V2.2

## Positionnement

**FR : Votre bibliothèque PC, une expérience console.**

**EN: Your PC library. A console-like experience.**

Nexus est un launcher Windows open source avec une interface cinématique, navigation manette, ajout d’exécutables et découverte Steam/Epic. La V2.2 permet de relier les comptes Steam, Epic et GOG pour consulter les bibliothèques possédées ; Steam peut aussi synchroniser les heures et succès après configuration. Ne pas présenter les connexions comme une installation automatique de tous les jeux, ni promettre des succès Epic/GOG ou des sauvegardes cloud.

## Objectif des 14 premiers jours

Recruter 20 testeurs sur des PC différents, obtenir 10 retours détaillés et identifier les trois problèmes les plus fréquents. Ce sont des objectifs de lancement, pas des résultats déjà atteints. Mesurer les téléchargements de chaque asset GitHub, les retours et les bugs reproduits ; les téléchargements ne représentent pas des utilisateurs actifs uniques.

| Quand | Action | Livrable |
| --- | --- | --- |
| J1–J2 | Montrer l’app en fonctionnement, préparer les fichiers et les limites | Démo 30 s, 3 captures propres, release, notes FR/EN |
| J3–J5 | Inviter un petit groupe de testeurs déjà intéressés par le jeu PC au salon | 5 à 10 installations accompagnées, retours premier lancement |
| J6–J8 | Publier une page itch.io dans la catégorie appropriée aux outils | EXE directement hébergés, cover, description exacte, langues et devlog |
| J9–J11 | Présenter une démo aux communautés PC/manette qui autorisent les projets personnels | Un message adapté par communauté, réponse aux questions et bugs |
| J12–J14 | Proposer un essai à quelques petits créateurs PC/handheld | Message personnalisé, vidéo courte, lien release et limites |

## Démo courte : script de capture

Utiliser des jeux réellement possédés, masquer les chemins personnels et ne montrer aucune clé API.

- 0–3 s : accroche « Et si ton PC avait une interface de console ? », puis l’accueil réel.
- 3–9 s : navigation manette entre trois jaquettes, mouvement des fonds et sélection.
- 9–16 s : ajout d’un `.exe`, correction du titre puis fiche et médias.
- 16–23 s : appui long → lancement d’un jeu réel, Nexus réduit, retour après fermeture.
- 23–30 s : bibliothèque, écran Comptes, logo et « Nexus Launcher V2.2 — Windows x64 — lien GitHub ».

Ne pas consacrer toute la démo à l’intro. Montrer le bénéfice utilisable rapidement. Préparer une version paysage pour YouTube/GitHub et une version verticale dont le cadrage conserve les commandes importantes.

## Message de présentation FR — brouillon à publier

> J’ai développé Nexus Launcher, une application Windows open source qui donne à une bibliothèque PC une interface de console : jaquettes, fonds animés, navigation manette et lancement des jeux.
>
> La V2.2 ajoute la connexion Steam via votre navigateur, les comptes Epic/GOG et une bibliothèque plus lisible. Vous pouvez aussi ajouter directement vos jeux par leur fichier `.exe`.
>
> Je cherche des testeurs sur des configurations différentes, surtout pour le premier démarrage, la découverte des jeux et la navigation manette. Les EXE sont non signés ; les succès Steam demandent une configuration API. Epic/GOG ne synchronisent pas les succès ni les sauvegardes cloud.
>
> Télécharger et consulter les sources : https://github.com/zamakz641-byte/Nexus-Launcher/releases/tag/v2.2.0
>
> Si vous testez : indiquez votre version de Windows, la manette utilisée et le premier problème rencontré. Ne partagez pas de clés, mots de passe ou logs contenant des données privées.

## English announcement — draft

> I’m building Nexus Launcher, an open-source Windows app that brings a console-like interface to your PC game library: artwork, controller navigation and game launching.
>
> V2.2 adds Steam sign-in through your browser, Epic/GOG accounts and a cleaner library. You can also add Windows games by choosing their `.exe`.
>
> I’m looking for testers with different PCs and controllers, especially for first-run setup, game discovery and navigation. Builds are unsigned. Steam achievements require API setup; Epic/GOG achievements and cloud saves are not supported.
>
> Downloads and source: https://github.com/zamakz641-byte/Nexus-Launcher/releases/tag/v2.2.0
>
> Feedback welcome: your Windows version, controller and the first issue you hit. Please don’t post credentials or private logs.

## Message créateur — brouillon, à personnaliser

> Bonjour [prénom], j’ai vu votre vidéo sur [vidéo précise]. Je développe Nexus Launcher, un launcher Windows open source pensé pour naviguer à la manette depuis le canapé. La V2.2 vient de sortir. Si le sujet vous intéresse, voici une démo courte et les EXE : [liens]. Une revue honnête, y compris des limites, m’aiderait à améliorer l’app. Aucun compte ni partenariat n’est nécessaire pour tester les jeux locaux.

## Où publier et comment

- **GitHub** : release claire, captures, problème reproduisible via Issues. Utiliser toujours le nom complet « Nexus Launcher » pour éviter la confusion avec d’autres produits Nexus.
- **itch.io** : uploader directement les fichiers, ajouter une cover et une description exacte ; publier un devlog à chaque mise à jour utile. La documentation exige une page publique, une cover et un contenu téléchargeable pour l’indexation ; l’apparition dans la recherche n’est pas garantie immédiatement. [Indexation](https://itch.io/docs/creators/getting-indexed), [qualité des pages](https://itch.io/docs/creators/quality-guidelines).
- **YouTube Shorts, TikTok et communautés Discord PC/manette** : proposer une démonstration réelle et un lien unique. Ce choix est une recommandation pour tester l’intérêt, pas une promesse de visibilité.
- **Reddit** : vérifier les règles et les fils de promotion de la communauté avant chaque publication. r/playnite demande des sujets directement liés à Playnite : éviter d’y déposer une publicité pour Nexus. r/pcgaming a des règles spécifiques pour les développeurs, à revérifier auprès de la modération pour un outil/launcher. [Règles Playnite](https://www.reddit.com/r/playnite/comments/l4m8lr/read_first_rules_basic_info_and_useful_links/), [directives développeurs PCGaming](https://www.reddit.com/r/pcgaming/comments/1skd0if/rules_refresh_developer_guidelines/).

## Questions à poser aux testeurs

1. Avez-vous réussi à ajouter et lancer votre premier jeu ?
2. Une cover ou un fond manque-t-il ? Pour quel titre et quel fournisseur ?
3. Pouvez-vous atteindre chaque commande avec votre manette ?
4. La connexion à votre compte revient-elle correctement dans Nexus ?
5. Quel écran vous semble le moins clair ?

Commencer par ces retours avant d’investir dans des publicités payantes. Aucun message de ce kit n’a été envoyé automatiquement.
