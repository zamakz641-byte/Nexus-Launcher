# Nexus v1.6.7 — Startup Sound Sync

- Le cue `startup` du pack SFX sélectionné démarre maintenant dans le boot HTML, avant React.
- Nouveau endpoint local minimal `/__nexus_startup_sound__.json` pour le pack actif et le volume.
- Fallback automatique vers le moteur React si WebView2 bloque l’autoplay.
- Protection contre le double déclenchement du son de startup.
- Un échec de boot coupe immédiatement le son de démarrage.
- Le système reste compatible avec les extensions `.nxsfx` sécurisées de v1.6.6.
