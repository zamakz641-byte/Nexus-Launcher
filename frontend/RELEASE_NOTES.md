# Nexus Launcher V2.0

## English

- **First launch asks for your games folder.** Open the native folder picker, save a collection and scan it. You can explicitly choose automatic Steam/Epic discovery or set up later. Canceling the picker never validates an import.
- **More reliable artwork.** Use actual Steam background URLs, retain images offline and fall back across providers before showing the Nexus emblem. Steam installations with unavailable catalog details can still use artwork from their known AppID.
- **Refresh anywhere.** Use the navigation refresh button or F5 to retry images and metadata.
- **Hold to play.** Hold a ready Home/Library game with pointer, Enter/Space or controller A. Short activation keeps selection/details behavior.
- **Desktop session return.** Nexus minimizes after a successful game start, follows discovered child processes, records Nexus session time and returns when the tracked session ends.
- **Controller navigation fixes.** Native menus, volume sliders, focus recovery and dialogs behave consistently.
- **Local console startup films.** French and English Flow/Veo intros follow the interface language, respect volume and reduced motion, and can be skipped.

### Downloads

- **Nexus-Launcher-Setup-2.0.0-x64.exe** — installer for Windows x64.
- **Nexus-Launcher-Portable-2.0.0-x64.exe** — portable application for Windows x64.
- **SHA256SUMS.txt** — checksums for both executables.

The executables are unsigned. Removing a library entry never deletes game files. Historical Steam playtime and account achievements are not yet synchronized; SteamGridDB keys only provide artwork. A game handing execution to an already running external store client may require a dedicated adapter for accurate session return. See [reliability and account-sync roadmap](https://github.com/zamakz641-byte/Nexus-Launcher/blob/main/docs/RELIABILITY-AND-SYNC.md).

## Français

Au premier démarrage, Nexus demande **le dossier de vos jeux** et ouvre l’explorateur pour le choisir. Le dossier est enregistré et analysé ; vous pouvez aussi choisir explicitement la détection Steam/Epic ou configurer plus tard.

Cette V2.0 comprend les corrections des jaquettes et fonds, le cache hors ligne, l’actualisation via le bouton ou F5, le lancement par appui long, la réduction et le retour de Nexus pendant les sessions suivies, les améliorations de navigation et les intros locales FR/EN.

Choisissez **Setup** pour installer ou **Portable** pour lancer sans installation. Les deux versions ciblent Windows x64 et ne sont pas signées. Les succès Steam synchronisés et les heures historiques restent une prochaine étape ; aucun progrès fictif n’est affiché.
