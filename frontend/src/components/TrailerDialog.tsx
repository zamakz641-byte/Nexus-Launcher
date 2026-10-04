import * as Dialog from "@radix-ui/react-dialog";
import { FilmSlate, X } from "@phosphor-icons/react";
import type Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Game, Locale } from "../types";

interface TrailerDialogProps {
  game: Game;
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrailerPlayer({ url, poster, preview = false, onFailure }: { url: string; poster: string; preview?: boolean; onFailure?: () => void }) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const [retry, setRetry] = useState(0);
  const onFailureRef = useRef(onFailure);
  onFailureRef.current = onFailure;
  useEffect(() => { if (videoError) onFailureRef.current?.(); }, [videoError]);
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    setVideoError(false);
    if (!url.includes(".m3u8")) {
      video.src = url;
      return () => { video.removeAttribute("src"); video.load(); };
    }
    let cancelled = false;
    let hls: Hls | undefined;
    void import("hls.js").then(({ default: HlsPlayer }) => {
      if (cancelled) return;
      if (!HlsPlayer.isSupported()) {
        if (video.canPlayType("application/vnd.apple.mpegurl")) video.src = url;
        else setVideoError(true);
        return;
      }
      hls = new HlsPlayer({ enableWorker: true });
      hls.on(HlsPlayer.Events.ERROR, (_event, data) => { if (data.fatal) setVideoError(true); });
      hls.on(HlsPlayer.Events.MANIFEST_PARSED, () => { void video.play().catch(() => undefined); });
      hls.loadSource(url);
      hls.attachMedia(video);
    }).catch(() => { if (!cancelled) setVideoError(true); });
    return () => { cancelled = true; hls?.destroy(); video.removeAttribute("src"); video.load(); };
  }, [url, retry]);
  return <><video ref={videoRef} className="trailer-dialog__image" poster={poster} controls={!preview} autoPlay muted playsInline loop={preview} preload="metadata" onError={() => setVideoError(true)} />{videoError && !preview ? <div className="trailer-error" role="status"><FilmSlate size={34} /><p>{t("media.unavailable")}</p><button className="screen-tool" type="button" onClick={() => setRetry(value => value + 1)}>{t("media.retry")}</button></div> : null}</>;
}

export function TrailerDialog({ game, locale, open, onOpenChange }: TrailerDialogProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(0);
  useEffect(() => { setSelected(0); }, [game.id, open]);
  const trailers = game.trailers?.length ? game.trailers : game.trailer.url ? [{ id: 'primary', title: game.trailer.title, url: game.trailer.url, poster: game.heroArtwork }] : [];
  const active = trailers[selected] || trailers[0];
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="trailer-overlay" />
        <Dialog.Content className="trailer-dialog" aria-describedby="trailer-description">
          <Dialog.Title className="sr-only">{active?.title[locale] || game.trailer.title[locale]}</Dialog.Title>
          <Dialog.Description className="sr-only" id="trailer-description">{t("trailer.preview", { game: game.title })}</Dialog.Description>
          {active ? <TrailerPlayer key={active.id} url={active.url} poster={active.poster || game.heroArtwork || game.artwork} /> : <img className="trailer-dialog__image" src={game.heroArtwork ?? game.artwork} alt="" />}
          <div className="trailer-dialog__grade" />
          <div className="trailer-dialog__topline"><span>NEXUS CINEMA</span><Dialog.Close className="trailer-dialog__close" aria-label={t("action.close")}><X size={24} /></Dialog.Close></div>
          {!active ? <div className="trailer-dialog__toggle" aria-label={t("trailer.none")}><FilmSlate size={34} /></div> : null}
          {trailers.length > 1 ? <nav className="trailer-picker" aria-label={t('detail.media')}>{trailers.map((trailer, index) => <button className="screen-tool" type="button" aria-pressed={selected === index} key={trailer.id} onClick={() => setSelected(index)}>{trailer.title[locale]}</button>)}</nav> : null}
          <footer className="trailer-dialog__footer">
            <div><span className="screen-kicker">{t("trailer.label")}</span><strong>{active?.title[locale] || game.trailer.title[locale]}</strong><small>{game.title}</small></div>
            {!game.trailer.url ? <span className="trailer-dialog__time">{t("trailer.notProvided")}</span> : null}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
