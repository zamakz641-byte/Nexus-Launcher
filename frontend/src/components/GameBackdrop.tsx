import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { Game } from '../types';
import { useNexusStore } from '../state/useNexusStore';
import { TrailerPlayer } from './TrailerDialog';

const brand = '/assets/brand/nexus-mark.png';
export function GameBackdrop({ game, paused, allowVideo }: { game?: Game; paused: boolean; allowVideo: boolean }) {
  const preferences = useNexusStore(state => state.mediaPreferences);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState<{ url: string; gameId: string }>({ url: brand, gameId: '' });
  const [videoReady, setVideoReady] = useState(false);
  const [failedVideo, setFailedVideo] = useState('');
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const update = () => setBlocked(document.hidden || Boolean(document.querySelector('[role="dialog"], [role="menu"]')));
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', update);
    update();
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);
  const gameId = game?.id || '';
  const candidatesKey = JSON.stringify([...new Set([game?.heroArtwork, ...(game?.backgroundGallery || []), ...(game?.heroArtworkFallbacks || []), game?.artwork, brand].filter(Boolean))]);
  const galleryKey = JSON.stringify([...new Set([game?.heroArtwork, ...(game?.backgroundGallery || [])].filter(Boolean))]);
  const videoUrl = game?.trailers?.[0]?.url || game?.trailer.url;
  useEffect(() => {
    let cancelled = false;
    let image: HTMLImageElement | undefined;
    const candidates = JSON.parse(candidatesKey) as string[];
    const next = (index: number) => {
      if (cancelled || index >= candidates.length) return;
      image = new Image();
      image.onload = () => { if (!cancelled) setVisible({ url: candidates[index], gameId }); };
      image.onerror = () => next(index + 1);
      image.src = candidates[index];
    };
    next(0);
    return () => { cancelled = true; if (image) { image.onload = null; image.onerror = null; } };
  }, [gameId, candidatesKey]);
  useEffect(() => {
    if (paused || blocked || reduced || !preferences.slideshow || videoReady || visible.gameId !== gameId) return;
    const gallery = JSON.parse(galleryKey) as string[];
    if (gallery.length < 2) return;
    let cancelled = false;
    let image: HTMLImageElement | undefined;
    const timer = window.setTimeout(() => {
      if (document.hidden || document.querySelector('[role="dialog"], [role="menu"]')) return;
      let index = gallery.indexOf(visible.url);
      let attempted = 0;
      const next = () => {
        if (cancelled || ++attempted >= gallery.length) return;
        index = (index + 1) % gallery.length;
        image = new Image();
        image.onload = () => {
          if (cancelled) return;
          if (image!.naturalWidth < 1280) { next(); return; }
          setVisible({ url: gallery[index], gameId });
        };
        image.onerror = next;
        image.src = gallery[index];
      };
      next();
    }, preferences.interval * 1000);
    return () => { cancelled = true; clearTimeout(timer); if (image) { image.onload = null; image.onerror = null; } };
  }, [galleryKey, gameId, visible, paused, blocked, reduced, preferences.slideshow, preferences.interval, videoReady]);
  useEffect(() => {
    setVideoReady(false);
    if (!allowVideo || paused || blocked || reduced || !preferences.previewVideo || !videoUrl || failedVideo === videoUrl) return;
    const timer = window.setTimeout(() => {
      if (!document.hidden && !document.querySelector('[role="dialog"], [role="menu"]')) setVideoReady(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [gameId, videoUrl, allowVideo, paused, blocked, reduced, preferences.previewVideo, failedVideo]);
  useEffect(() => {
    const suspend = () => { if (document.hidden) setVideoReady(false); };
    document.addEventListener('visibilitychange', suspend);
    return () => document.removeEventListener('visibilitychange', suspend);
  }, []);
  return <div className="media-backdrop" aria-hidden="true">
    <AnimatePresence initial={false}>
      <motion.img className="media-backdrop__image" key={visible.url} src={visible.url} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .65 }} data-brand={visible.url === brand} />
    </AnimatePresence>
    {videoReady && videoUrl ? <div className="media-backdrop__video"><TrailerPlayer url={videoUrl} poster={visible.url} preview onFailure={() => { setFailedVideo(videoUrl); setVideoReady(false); }} /></div> : null}
    <div className="media-backdrop__grade" />
  </div>;
}
