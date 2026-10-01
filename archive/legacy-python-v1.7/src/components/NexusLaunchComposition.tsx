import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Game } from '../types/game';
import { NexusMark } from './NexusMark';

export const NexusLaunchComposition: React.FC<{ game: Game }> = ({ game }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 18, stiffness: 95, mass: 0.9 }, durationInFrames: 28 });
  const reveal = interpolate(frame, [0, 20, durationInFrames - 18, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const worldScale = interpolate(frame, [0, durationInFrames], [1.07, 1.015]);
  const lineScale = interpolate(frame, [8, 42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const copyY = interpolate(frame, [18, 40], [18, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const accent = game.accentColor || '#66ddff';

  return (
    <AbsoluteFill className="nexus-remotion-stage" style={{ opacity: reveal, backgroundColor: '#01050a' }}>
      <AbsoluteFill style={{ transform: `scale(${worldScale})` }}>
        <img className="nexus-remotion-bg" src={game.heroImage || game.coverImage || '/art/nexus-aetherfall-hero.png'} alt="" />
      </AbsoluteFill>
      <AbsoluteFill className="nexus-remotion-shade" />
      <div className="nexus-remotion-gate" style={{ opacity: appear, transform: `translate(-50%, -50%) scale(${0.82 + appear * 0.18})`, borderColor: `${accent}55`, boxShadow: `0 0 90px ${accent}25, inset 0 0 45px ${accent}12` }} />
      <div className="nexus-remotion-axis" style={{ transform: `translate(-50%, -50%) scaleX(${lineScale})`, background: `linear-gradient(90deg, transparent, ${accent}, white, ${accent}, transparent)` }} />
      <div className="nexus-remotion-center" style={{ opacity: appear, transform: `translate(-50%, -50%) scale(${0.9 + appear * 0.1})` }}>
        <NexusMark className="nexus-remotion-mark" />
      </div>
      <div className="nexus-remotion-copy" style={{ opacity: appear, transform: `translate(-50%, ${copyY}px)` }}>
        <span>OUVERTURE DU MONDE</span>
        {game.logoUrl ? <img src={game.logoUrl} alt={game.title} /> : <h1>{game.title}</h1>}
        <p>La session est prête. Le Nexus s’efface.</p>
      </div>
      <div className="nexus-remotion-progress"><i style={{ transform: `scaleX(${frame / durationInFrames})`, background: accent }} /></div>
    </AbsoluteFill>
  );
};
