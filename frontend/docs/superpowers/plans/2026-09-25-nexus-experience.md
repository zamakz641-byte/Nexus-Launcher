# Nexus Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not dispatch subagents unless the user requests them.

**Goal:** Donner à Nexus une bibliothèque personnelle modifiable, des couvertures fiables, une configuration SteamGridDB sûre et une ambiance sonore/animée plus forte.

**Architecture:** Electron possède la liste autorisée des jeux et dossiers ainsi que les secrets ; le preload expose des actions métier étroites. Le client React affiche la bibliothèque agrégée et orchestre les aperçus, les préférences et les animations. Le backend actuel de `vite.config.mjs` fournit le scanner et les métadonnées, progressivement extraits en modules ciblés.

**Tech Stack:** Electron 44, React 19, TypeScript, Zustand, Motion 13, Vite 6, Vitest et Playwright.

**Spec:** `docs/superpowers/specs/2026-09-25-nexus-experience-design.md`

## Global Constraints

- Préserver `nexus://app/`, l'IPC isolé, `sandbox: true`, le lancement natif et F11.
- Ne supprimer aucun dossier, jeu ou ancien média sans permission explicite ; « Retirer de Nexus » n'efface que l'inscription.
- Garder `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs` et `tests/sites-worker.test.mjs` fonctionnels.
- Ne jamais recopier la clé API fournie dans la conversation dans un fichier, test, commande, capture, log ou réponse.
- Aucun nouveau SFX n'est activé avant écoute et choix explicite de l'utilisateur ; vérifier la licence de chaque fichier retenu.
- Préserver FR/EN, focus manette/clavier, thème Solaris, mouvement réduit, 1920×1080 et 640×720.
- Ce dossier ne contient pas de dépôt Git : sauvegarder les livrables dans le workspace et vérifier les changements par tests/captures ; ne pas annoncer de commits.

**Outils déjà présents :** le connecteur Runway est accessible et peut proposer son ou vidéo ; Higgsfield n'apparaît pas dans les outils actuellement appelables. Le paquet `motion` est installé et déjà utilisé par l'onboarding et le lancement. Un plugin disponible n'ajoute pas automatiquement une animation à l'interface : les composants doivent intégrer et synchroniser ses sorties.

## Review Focus

1. Deux dossiers ayant un sous-dossier de même nom produisent deux jeux distincts ; test dans la tâche 2.
2. Un dossier disparu ou illisible n'efface pas les autres sources ; test dans la tâche 2.
3. Un chemin `.exe` transmis directement par le renderer, ou un lien symbolique sortant d'une racine, est refusé ; test dans la tâche 3.
4. Une clé invalide ou indisponible ne passe jamais au renderer et laisse les couvertures existantes utilisables ; test dans la tâche 4.
5. Une image absente et un son désactivé ne bloquent ni le focus ni le lancement ; tests dans les tâches 5 à 7.

## Carte des fichiers

| Domaine | Fichiers à créer ou modifier | Rôle |
| --- | --- | --- |
| Registre local | `electron/libraryRegistry.mjs`, `electron/main.mjs`, `electron/preload.cjs`, `src/vite-env.d.ts` | Sources, jeux manuels, persistance, dialogues et IPC autorisé |
| Scan et lancement | `vite.config.mjs`, `src/services/libraryClient.ts`, `src/services/launcherClient.ts`, `src/state/useNexusStore.ts`, `src/types.ts`, `src/App.tsx` | Agrégation, identités stables, validation et rafraîchissement |
| Interfaces d'ajout | `src/screens/SettingsScreen.tsx`, `src/screens/LibraryScreen.tsx`, `src/components/AddGameDialog.tsx`, `src/styles.css`, `src/polish.css`, `src/i18n.ts` | Ajouter dossier ou jeu, examiner, corriger et retirer |
| Clé et médias | `electron/secretStore.mjs`, `vite.config.mjs`, `src/screens/SettingsScreen.tsx`, `src/services/libraryClient.ts`, `src/utils/imageFallback.ts` | Secret chiffré, validation, correspondances et priorités d'art |
| Ambiance et SFX | `src/components/GameRail.tsx`, `src/screens/LibraryScreen.tsx`, `src/App.tsx`, `src/audio/sfx.ts`, `artifacts/audio/`, `public/assets/sfx/` | Aperçu stable, planche d'écoute et sons approuvés |
| Cinématiques | `src/components/Onboarding.tsx`, `src/components/StartupSequence.tsx`, `src/components/LaunchSequence.tsx`, `src/motion/transitions.ts`, `src/polish.css` | Storyboard, séquences d'entrée et de lancement |
| Vérification | `tests/`, `scripts/app-qa-local.mjs`, `scripts/electron-smoke.mjs`, `scripts/record-demo.mjs`, `package.json`, `AGENTS.md` | Tests, captures, build et décisions durables |

---

### Task 1: Baseline et contrat de bibliothèque

**Files:** Modify `scripts/app-qa-local.mjs`; create `tests/library-contract.test.mjs`; inspect `vite.config.mjs`, `electron/main.mjs`, `src/App.tsx`.

**Interfaces:** Définir `LibraryRegistryV1 = { version: 1, roots: LibraryRoot[], manualGames: ManualGame[], excludedPaths: string[], overrides: Record<string, GameOverride> }`. `LibraryRoot = { id: string, path: string, enabled: boolean }`, `ManualGame = { id: string, executablePath: string, title: string }` et `GameOverride = { title?: string, executablePath?: string, steamAppId?: number, steamGridGameId?: number, gridArtwork?: string, heroArtwork?: string, logoArtwork?: string }`.

- [ ] Capturer avant modification Home, Library, Settings, première ouverture, lancement et retour d'erreur avec les scripts QA existants. Noter les durées et collisions visuelles.
- [ ] Écrire des tests du contrat qui attendent plusieurs racines, un `.exe` seul, une inscription durable et aucune suppression du disque ; les faire échouer face au modèle à racine unique.
- [ ] Fixer les identifiants de jeu à partir du chemin canonique avec un hachage court, tout en conservant une table d'alias pour les anciens liens `local-<slug>` issus du dossier initial.
- [ ] Vérifier `npm run typecheck`, `npm test`, `npm run qa:local` comme point de comparaison. Aucun média nouveau n'est nécessaire pour cette tâche.

### Task 2: Ajouter des dossiers et des jeux manuellement

**Files:** Create `electron/libraryRegistry.mjs`, `src/components/AddGameDialog.tsx`; modify `electron/main.mjs`, `electron/preload.cjs`, `src/vite-env.d.ts`, `vite.config.mjs`, `src/services/libraryClient.ts`, `src/state/useNexusStore.ts`, `src/types.ts`, `src/App.tsx`, `src/screens/SettingsScreen.tsx`, `src/screens/LibraryScreen.tsx`, `src/i18n.ts`, `package.json`; create `tests/library-registry.test.mjs`.

**Interfaces:** `LibrarySnapshot = { roots: LibraryRoot[], games: Game[], scanErrors: Record<string, string> }`. `listLibrary(): Promise<LibrarySnapshot>`, `addLibraryFolder(): Promise<LibrarySnapshot>`, `addGameExecutable(): Promise<LibrarySnapshot>`, `removeLibraryEntry(id: string): Promise<LibrarySnapshot>`, `scanLibrary(sourceId?: string, force?: boolean): Promise<LibrarySnapshot>`. Le preload n'accepte pas un chemin inventé par le renderer pour l'inscription ; le dialogue natif retourne le choix au processus principal.

- [ ] Écrire les tests du registre avec dossiers temporaires : migration de `nexus.library.root.v1`, deux racines dont les jeux portent le même nom, dossier de jeu direct, `.exe` isolé, doublon de chemin, dossier manquant et persistance après nouvelle instance. Vérifier que la suppression d'une entrée conserve le fichier source.
- [ ] Faire échouer ces tests, puis créer un registre JSON versionné dans `app.getPath("userData")`. Écrire par remplacement atomique et ne modifier que l'inscription Nexus. Sur la première migration, montrer l'ancien chemin lu dans `localStorage` et demander de le rechoisir par dialogue natif avant d'autoriser son scan ; inscrire `F:\Games` automatiquement seulement s'il existe et qu'aucune autre source n'a été choisie.
- [ ] Adapter le scanner à un dossier racine et à un dossier de jeu direct ; agréger les résultats sans remplacer les jeux des autres sources. Conserver un état de scan et d'erreur par source.
- [ ] Ajouter dans Paramètres les actions « Ajouter un dossier », « Ajouter un jeu (.exe) », « Analyser » et « Retirer de Nexus », puis un point d'entrée « Ajouter » dans Bibliothèque. Afficher le chemin, la source et l'état ; permettre de corriger titre et exécutable dans la fiche.
- [ ] Vérifier l'ajout et le redémarrage dans Electron, puis `npm run typecheck`, `npm test`, `npm run qa:local`, `npm run build`, `npm run test:sites` et une capture 1920×1080/640×720. Le build inclut explicitement `electron/libraryRegistry.mjs`.

### Task 3: Fermer la frontière de lancement et des fichiers locaux

**Files:** Modify `electron/main.mjs`, `electron/preload.cjs`, `vite.config.mjs`, `src/services/launcherClient.ts`, `src/vite-env.d.ts`; create `tests/launch-authorization.test.mjs`.

**Interfaces:** `launchGame(gameId: string): Promise<LaunchResult>` remplace `launchGame(executablePath, root)`. Le processus principal résout `gameId` via le registre, puis vérifie `realpath` et l'extension `.exe` avant `spawn`.

- [ ] Écrire les tests de refus : identifiant inconnu, chemin forgé dans le renderer, exécutable changé depuis le scan, lien symbolique sortant, fichier non `.exe`. Écrire le test positif d'un exécutable inscrit explicitement.
- [ ] Faire échouer les tests, puis supprimer l'autorité donnée au paramètre `root` fourni par le renderer. Pour l'image locale, autoriser seulement une source inscrite ou un fichier média choisi via dialogue.
- [ ] Conserver la branche Vite de développement derrière le même contrat d'identifiant, avec registre local de test, et garder le lancement natif dans Electron.
- [ ] Exécuter les tests d'autorisation et le smoke Electron ; vérifier F11 et `nexus://app/`.

### Task 4: Clé SteamGridDB saisie dans les Paramètres

**Files:** Create `electron/secretStore.mjs`, `tests/steamgrid-secret.test.mjs`; modify `electron/main.mjs`, `electron/preload.cjs`, `src/vite-env.d.ts`, `vite.config.mjs`, `src/services/libraryClient.ts`, `src/screens/SettingsScreen.tsx`, `src/i18n.ts`.

**Interfaces:** `SteamGridStatus = { configured: boolean; storageAvailable: boolean; lastCheck: "unknown" | "valid" | "invalid" | "offline" }`. `getSteamGridStatus(): Promise<SteamGridStatus>`, `saveSteamGridKey(value: string): Promise<SteamGridStatus>`, `clearSteamGridKey(): Promise<SteamGridStatus>`. Aucune méthode ne retourne la clé.

- [ ] Tester clé vide, clé invalide, absence de réseau, redémarrage, retrait et indisponibilité de `safeStorage`. Inspecter les charges IPC pour prouver qu'aucune réponse ne contient la valeur.
- [ ] Faire échouer les tests, puis chiffrer la clé dans `userData` depuis le processus principal. Tester la valeur par une requête légère à l'API SteamGridDB ; effacer les caches SGDB et Steam fusionnés lors d'un remplacement.
- [ ] Ajouter dans « Métadonnées » un champ `type="password"`, Enregistrer, Tester, Remplacer et Retirer ; afficher seulement le statut. Ne jamais écrire la clé dans `localStorage`, `VITE_*`, les logs ni la documentation.
- [ ] Vérifier avec une clé factice dans les tests et une saisie manuelle locale dans Electron. Le paramètre d'environnement existant reste un secours de développement. Ne pas utiliser la clé collée dans le chat dans les scripts de QA.

### Task 5: Correspondance et comportement des couvertures

**Files:** Modify `vite.config.mjs`, `src/services/libraryClient.ts`, `src/state/useNexusStore.ts`, `src/App.tsx`, `src/components/GameRail.tsx`, `src/screens/LibraryScreen.tsx`, `src/screens/SettingsScreen.tsx`, `src/utils/imageFallback.ts`, `src/polish.css`; create `tests/artwork-selection.test.mjs`.

**Interfaces:** `GameOverride` contient `steamAppId?`, `steamGridGameId?`, `gridArtwork?`, `heroArtwork?`, `logoArtwork?`. `resolveArtwork(game, overrides)` applique l'ordre : choix manuel → SteamGridDB → Steam → image locale → Nexus.

- [ ] Tester la priorité des cinq sources, l'absence de réseau, l'image cassée, deux jeux de nom voisin et une correspondance manuelle qui persiste. Refuser une correspondance automatique ambiguë.
- [ ] Faire échouer les tests ; étendre la recherche de métadonnées au-delà de la table `steamAppIds` actuelle. Appliquer automatiquement seulement une égalité de titre normalisé ; sinon proposer plusieurs résultats à confirmer. Permettre le choix d'une jaquette, d'un fond et d'un logo distincts, et l'import d'une image locale depuis un dialogue natif. Vérifier type et taille avant copie dans `userData`.
- [ ] Introduire un état d'aperçu distinct de la sélection durable : focus immédiat, survol temporisé, retour à la sélection au départ du pointeur. Précharger le fond suivant ; garder le fond précédent ou un dégradé pendant son chargement, puis fondre en 250–400 ms.
- [ ] Vérifier visuellement des jeux avec jaquette, sans jaquette, avec longue étiquette, en Solaris et en mouvement réduit. Capturer Home, Bibliothèque, Recherche et détail ; mesurer absence de saut de carte et de zone blanche.

### Task 6: Planche d'écoute et décision SFX

**Files:** Modify `artifacts/audio/` and `scripts/audit-audio-candidates.mjs`; create `artifacts/audio/audition/README.md` et une planche d'écoute locale ; après choix seulement, modify `src/audio/sfx.ts`, `src/screens/SettingsScreen.tsx`, `public/assets/sfx/`, `src/i18n.ts`; create `tests/sfx-routing.test.ts`.

**Interfaces:** Conserver `sfx.play(cue: SfxCue)` avec les six noms actuels. Le moteur choisi charge des échantillons décodés une fois, garde un cooldown pour `move`, applique les volumes existants et permet le mute sans latence de navigation.

- [ ] Rechercher deux ou trois familles de vrais sons de menu cohérents, prioritairement sous licence de réutilisation vérifiable. Pour chaque fichier : URL source, auteur, licence, attribution, durée, pic et rôle Nexus. Écarter les sons déjà rejetés.
- [ ] Normaliser le niveau d'écoute et produire une comparaison A/B par fonction, incluant les sons actuels. La planche d'écoute reste distincte du bundle produit.
- [ ] Présenter les candidats à l'utilisateur et recueillir son choix. Ce point est une condition réelle : ne pas remplacer les SFX avant la sélection.
- [ ] Après choix, copier uniquement les fichiers autorisés et leurs crédits dans l'application ; tester ordre, volume, mute, spam de focus, démarrage et lancement. Garder les anciens en repli en cas de décodage raté.

### Task 7: Onboarding et lancement cinématiques

**Files:** Modify `src/components/Onboarding.tsx`, `src/components/StartupSequence.tsx`, `src/components/LaunchSequence.tsx`, `src/App.tsx`, `src/motion/transitions.ts`, `src/polish.css`, `src/i18n.ts`, `scripts/record-demo.mjs`; create `tests/launch-sequence.test.tsx`.

**Interfaces:** `LaunchSequence` reçoit `{ game, phase: "enter" | "launching" | "error" }`. `App.launch()` déclenche le lancement natif à l'arrivée d'une phase visuelle brève, sans `delay(760)` fixe ; la fermeture dépend du résultat IPC et d'une durée visuelle maximale.

- [ ] Capturer l'onboarding et un lancement Electron actuels en vidéo et vérifier si la séquence existante est invisible, trop courte ou cachée par la fenêtre du jeu. Ce diagnostic décide du réglage précis.
- [ ] Écrire les tests de skip, de progression au clavier/manette, de retour sur erreur et du mode mouvement réduit. Vérifier qu'un double appui ne lance le jeu qu'une fois.
- [ ] Créer le storyboard à quatre temps du spec. Décliner les transitions en Motion temps réel : logo et halo, choix, découverte de la bibliothèque, geste manette, puis entrée dans Home. Faire de l'ajout de source une action utilisable, skippable et rejouable.
- [ ] Relier la carte sélectionnée à la transition de lancement : expansion, fond préchargé, logo/nom, impulsion, puis lancement. En cas d'échec, afficher une erreur lisible et rendre le focus au jeu. Limiter le temps de la séquence.
- [ ] N'utiliser une vidéo Runway/Higgsfield qu'après choix d'un storyboard précis et vérification de l'accès/coût du service. Aucun clip externe ne bloque la navigation ni ne remplace le moteur Motion interactif ; prévoir une image fixe si la vidéo ne charge pas.
- [ ] Capturer 1920×1080 et 640×720, tester `prefers-reduced-motion`, plusieurs appuis rapides et le smoke Electron. Inspecter la vidéo à vitesse normale et les logs sans clé.

### Task 8: Intégration, recette et livraison

**Files:** Modify `scripts/app-qa-local.mjs`, `scripts/electron-smoke.mjs`, `AGENTS.md`; create `docs/qa/nexus-experience-2026-09.md`.

- [ ] Jouer le parcours réel : premier démarrage → ajouter deux dossiers et un `.exe` → choisir une couverture → entrer une clé via Paramètres → scanner → naviguer à la manette → lancer → redémarrer → retrouver les trois sources.
- [ ] Vérifier retrait sans suppression, dossiers indisponibles, erreurs API, hors ligne, sons muets, mouvement réduit, thème Solaris et largeur étroite.
- [ ] Exécuter `npm run typecheck`, `npm test`, `npm run qa:local`, `npm run build`, `npm run test:sites`, `node scripts/electron-smoke.mjs` et la validation du paquet Windows. Arrêter les vérifications optionnelles quand les risques concrets sont couverts.
- [ ] Consigner captures, vidéo de lancement, résultats et limites dans le rapport QA ; mettre les nouvelles décisions durables dans `AGENTS.md`.

## Ordre et jalons

1. **Bibliothèque utilisable** : tâches 1–3. Le joueur peut ajouter et conserver ses jeux ; le lancement reste sûr.
2. **Médias personnels** : tâches 4–5. La clé et les couvertures fonctionnent avec repli local.
3. **Ambiance validée** : tâches 6–7. Le son est choisi après écoute et les animations sont visibles dans Electron.
4. **Version livrable** : tâche 8. Captures, parcours, build et paquet validés.

La tâche 6 dépend d'un choix utilisateur sur les sons ; les autres tâches peuvent avancer sans attendre ce choix. La clé API déjà collée dans la conversation n'est pas intégrée par ce plan et devra être saisie dans le futur champ sécurisé.
