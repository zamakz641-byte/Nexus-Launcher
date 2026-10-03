import { CheckCircle, CloudArrowDown, DownloadSimple, FolderOpen, GameController, HardDrive, LinkSimple, Magnet, PuzzlePiece, ShieldCheck, SpinnerGap } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { libraryExtensions, type ExtensionCapability } from "../extensions/catalog";
import { useLibraryGames } from "../hooks/useLibraryGames";
import { useNexusStore } from "../state/useNexusStore";
import { applyImageFallback } from "../utils/imageFallback";

const capabilityIcons: Record<ExtensionCapability, typeof PuzzlePiece> = {
  catalog: GameController,
  "direct-download": LinkSimple,
  "torrent-import": Magnet,
  "library-scan": FolderOpen,
};
const extensionKeys: Record<string, string> = { "local-library": "Local", "steam-catalog": "Steam", "direct-url": "Direct", "torrent-file": "Torrent" };

export function DownloadsScreen() {
  const { t } = useTranslation();
  const games = useLibraryGames();
  const localGames = games.filter((game) => game.discovered);
  const scanState = useNexusStore((state) => state.libraryScanState);
  const libraryRoot = useNexusStore((state) => state.libraryRoot);

  return (
    <section className="screen downloads-screen" aria-labelledby="downloads-title">
      <header className="screen-heading">
        <div><span className="screen-kicker">{t("downloads.kicker")}</span><h1 id="downloads-title">{t("downloads.title")}</h1><p>{t("downloads.description")}</p></div>
        <span className="downloads-state" data-active={scanState === "scanning"}>
          {scanState === "scanning" ? <SpinnerGap aria-hidden="true" size={18} /> : <CheckCircle aria-hidden="true" size={18} weight="fill" />}
          {t(scanState === "scanning" ? "downloads.scanning" : "downloads.available")}
        </span>
      </header>

      <div className="downloads-overview">
        <article><DownloadSimple aria-hidden="true" size={24} /><span><small>{t("downloads.activeQueue")}</small><strong>{t("downloads.transfers", { count: 0 })}</strong></span></article>
        <article><HardDrive aria-hidden="true" size={24} /><span><small>{t("downloads.detected")}</small><strong>{t("downloads.localGames", { count: localGames.length })}</strong></span></article>
        <article><FolderOpen aria-hidden="true" size={24} /><span><small>{t("downloads.location")}</small><strong title={libraryRoot}>{libraryRoot}</strong></span></article>
      </div>

      <div className="downloads-layout">
        <section className="downloads-queue" aria-labelledby="queue-title">
          <header><span className="screen-kicker">{t("downloads.queue")}</span><h2 id="queue-title">{t("downloads.activeTransfers")}</h2></header>
          <div className="downloads-empty">
            <span className="downloads-empty__icon"><CloudArrowDown aria-hidden="true" size={34} /></span>
            <strong>{t("downloads.empty")}</strong>
            <p>{t("downloads.emptyHint")}</p>
            <span><ShieldCheck aria-hidden="true" size={17} />{t("downloads.authorized")}</span>
          </div>
        </section>

        <section className="downloads-extensions" aria-labelledby="extensions-title">
          <header><span className="screen-kicker">{t("downloads.extensions")}</span><h2 id="extensions-title">{t("downloads.sources")}</h2></header>
          <div>
            {libraryExtensions.map((extension) => {
              const Icon = capabilityIcons[extension.capability];
              const key = extensionKeys[extension.id];
              return <article key={extension.id} data-status={extension.status}>
                <span className="downloads-extension__icon"><Icon aria-hidden="true" size={22} /></span>
                <span><strong>{key ? t(`downloads.extension${key}Name`) : extension.name}</strong><small>{key ? t(`downloads.extension${key}Desc`) : extension.description}</small></span>
                <b>{t(extension.status === "active" ? "downloads.active" : "downloads.ready")}</b>
              </article>;
            })}
          </div>
        </section>
      </div>

      <section className="downloads-history" aria-labelledby="imports-title">
        <header><span className="screen-kicker">{t("downloads.localLibrary")}</span><h2 id="imports-title">{t("downloads.readyToPlay")}</h2></header>
        <div>
          {localGames.map((game) => (
            <article key={game.id}>
              <img src={game.artwork} alt="" onError={(event) => applyImageFallback(event, [...(game.artworkFallbacks || []), game.heroArtwork])} />
              <span><strong>{game.title}</strong><small>{t(game.executablePath ? "downloads.executableFound" : "downloads.executableConfirm")}</small></span>
              <CheckCircle aria-hidden="true" size={21} weight="fill" />
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
