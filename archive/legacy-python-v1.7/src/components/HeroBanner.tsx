import React, { useEffect, useRef, useState } from 'react';
import { Game } from '../types/game';
import { Play, Heart, Info } from './UiIcon';

interface HeroBannerProps {
  game: Game;
  onLaunch: () => void;
  onOpenDetails: () => void;
  onToggleFavorite: () => void;
  ambientMotion: boolean;
}

function useBufferedImage(src: string) {
  const [current, setCurrent] = useState(src);
  const [previous, setPrevious] = useState('');
  const tokenRef = useRef(0);
  const cleanupRef = useRef<number | null>(null);

  useEffect(() => {
    if (!src || src === current) return;
    const token = ++tokenRef.current;
    const image = new Image();
    image.decoding = 'async';
    image.src = src;

    const commit = () => {
      if (token !== tokenRef.current) return;
      if (cleanupRef.current) window.clearTimeout(cleanupRef.current);
      setPrevious(current);
      setCurrent(src);
      cleanupRef.current = window.setTimeout(() => setPrevious(''), 360);
    };

    const decode = image.decode?.();
    if (decode) decode.then(commit).catch(() => { image.onload = commit; });
    else image.onload = commit;

    return () => { image.onload = null; };
  }, [src, current]);

  useEffect(() => () => { if (cleanupRef.current) window.clearTimeout(cleanupRef.current); }, []);
  return { current, previous };
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ game, onLaunch, onOpenDetails, onToggleFavorite, ambientMotion }) => {
  const buffered = useBufferedImage(game.heroImage || game.coverImage || '/art/nexus-aetherfall-hero.png');

  return (
    <section id="nexus-hero-banner" className="relative w-full overflow-hidden select-none nexus-hero-surface" aria-labelledby="nexus-featured-title">
      <div className="nexus-hero-base absolute inset-0" />
      {buffered.previous && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-[center_34%]"
          style={{ backgroundImage: `url("${buffered.previous}")` }}
        />
      )}
      {buffered.current ? (
        <div
          key={buffered.current}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-cover bg-[center_34%] nexus-hero-image-enter ${ambientMotion ? 'nexus-hero-breathe' : ''}`}
          style={{ backgroundImage: `url("${buffered.current}")` }}
        />
      ) : null}

      <div className="nexus-hero-vignette pointer-events-none absolute inset-0" />
      <div className="nexus-hero-accent pointer-events-none absolute inset-0" style={{ ['--hero-accent' as string]: game.accentColor || '#66ddff' } as React.CSSProperties} />

      <div className="nexus-hero-content relative z-10 flex h-full flex-col justify-center">
        <div className="nexus-hero-copy max-w-6xl">
          <div className="nexus-hero-kicker">EN VEDETTE</div>
          <h1 id="nexus-featured-title">{game.title}</h1>
          <div className="nexus-hero-eyebrow" style={{ color: game.accentColor }}>{game.eyebrow || 'WORLDS PLAY TOGETHER'}</div>
          <p>{game.description || 'Explore un autre monde. Ton prochain départ t’attend.'}</p>

          <div data-controller-row="true" className="flex items-center gap-2.5">
            <button id="btn-hero-launch" data-controller-default="true" onClick={onLaunch}><Play className="h-4 w-4 fill-current"/><span>Jouer maintenant</span></button>
            <button id="btn-hero-details" onClick={onOpenDetails}><Info className="h-3.5 w-3.5"/><span>Voir les détails</span></button>
            <button id="btn-hero-favorite" onClick={onToggleFavorite} title={game.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} className={`flex h-[46px] w-[46px] items-center justify-center rounded-[14px] border transition-[transform,border-color,background-color,color] hover:-translate-y-px ${game.isFavorite ? 'border-rose-400/30 bg-rose-500/15 text-rose-300' : 'border-white/[0.1] bg-[#0c1825]/92 text-slate-400 hover:border-white/20 hover:text-white'}`}><Heart className={`h-4 w-4 ${game.isFavorite ? 'fill-current' : ''}`}/></button>
          </div>
        </div>
      </div>

      {game.quote && <div className="nexus-hero-quote pointer-events-none absolute hidden xl:block"><p>{game.quote}</p><span /></div>}
    </section>
  );
};
