import React, { useEffect, useMemo, useRef } from 'react';
import { Player } from '@remotion/player';
import type { Game } from '../types/game';
import { X } from './UiIcon';
import { NexusLaunchComposition } from './NexusLaunchComposition';

interface LaunchOverlayProps {
  game: Game | null;
  durationMs?: number;
  onComplete: (id: string) => void;
  onCancel: () => void;
}

export const LaunchOverlay: React.FC<LaunchOverlayProps> = ({ game, durationMs = 3200, onComplete, onCancel }) => {
  const completedRef = useRef(false);
  const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [game?.id]);
  const fps = 30;
  const durationInFrames = Math.max(45, Math.round(Math.max(1600, durationMs) / 1000 * fps));

  useEffect(() => {
    completedRef.current = false;
    if (!game) return;
    const delay = reducedMotion ? 700 : Math.max(1600, durationMs);
    const timeout = window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete(game.id);
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [game, durationMs, onComplete, reducedMotion]);

  useEffect(() => {
    if (!game) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, onCancel]);

  if (!game) return null;

  return (
    <div id="nexus-launch-overlay" className="nexus-launch fixed inset-0 z-[120] overflow-hidden bg-[#010307] select-none" role="dialog" aria-modal="true" aria-label={`Lancement de ${game.title}`}>
      {reducedMotion ? (
        <div className="nexus-launch-reduced">
          <img src={game.heroImage || game.coverImage || '/art/nexus-aetherfall-hero.png'} alt="" />
          <div><span>OUVERTURE DU MONDE</span><h1>{game.title}</h1></div>
        </div>
      ) : (
        <Player
          component={NexusLaunchComposition}
          inputProps={{ game }}
          durationInFrames={durationInFrames}
          compositionWidth={1920}
          compositionHeight={1080}
          fps={fps}
          autoPlay
          loop={false}
          controls={false}
          acknowledgeRemotionLicense
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
        />
      )}
      <button onClick={onCancel} className="nexus-launch-cancel" aria-label="Annuler le lancement"><X className="h-4 w-4" /> Annuler</button>
    </div>
  );
};
