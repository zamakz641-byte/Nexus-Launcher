# Nexus v1.6.6 — Sound Extension Hardening

- Extension `.nxsfx` = données uniquement, jamais Python/JS exécutable.
- Refus des exécutables et types de fichiers non autorisés.
- Refus du path traversal, des liens symboliques et des doublons de noms.
- Limites sur le nombre de fichiers, la taille totale, la taille par fichier et le ratio de compression.
- Vérification de la signature/header WAV, OGG, MP3 et M4A au lieu de faire confiance à l'extension du nom.
- Maximum de six couches audio par cue.
- Exemple `Nexus_Nova_Console.nxsfx` original inclus.
- Builder local pour créer un `.nxsfx` à partir de sons fournis par l'utilisateur.
