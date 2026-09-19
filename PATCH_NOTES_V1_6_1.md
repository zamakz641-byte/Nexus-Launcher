# Nexus Launcher v1.6.1 - Windows bridge hotfix

## Correctif critique
- Corrige le crash/hang du premier lancement sous Windows avec pywebview 6.2.1.
- Symptomes corriges : `pty.Empty.Empty...`, `maximum recursion depth exceeded`, fenetre `Python ne repond pas`, puis `Le pont pywebview n'est pas pret`.
- Cause : pywebview 6.2.1 inspecte recursivement les attributs publics de l'objet `js_api`. Nexus exposait par erreur ses objets runtime (`window`, `storage`, `jobs`, `launcher`) comme attributs publics. Une fois la fenetre WinForms/WebView2 attachee, l'inspection pouvait descendre dans les objets natifs jusqu'a epuiser la recursion Python.
- Tous les objets d'etat runtime sont maintenant prives (`_window`, `_storage`, `_jobs`, `_launcher`). Seules les methodes API prevues pour le frontend sont exposees.
- Ajout d'un test de regression pour interdire le retour de cet accident.

Aucune donnee utilisateur ni bibliotheque n'est supprimee par ce correctif.
