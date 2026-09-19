import React, { useEffect, useState } from 'react';

export type ControllerKind = 'playstation' | 'xbox' | 'switch';
export type FaceGlyph = 'confirm' | 'back' | 'details' | 'search';

function detectControllerKind(): ControllerKind {
  if (!navigator.getGamepads) return 'xbox';
  const id = [...navigator.getGamepads()].find((pad) => pad?.connected)?.id?.toLowerCase() || '';
  if (/dualsense|dualshock|wireless controller|sony|054c/.test(id)) return 'playstation';
  if (/nintendo|switch|joy-con|pro controller|057e/.test(id)) return 'switch';
  return 'xbox';
}

export function useControllerKind(): ControllerKind {
  const [kind, setKind] = useState<ControllerKind>(() => detectControllerKind());
  useEffect(() => {
    const update = () => setKind(detectControllerKind());
    update();
    window.addEventListener('gamepadconnected', update);
    window.addEventListener('gamepaddisconnected', update);
    const timer = window.setInterval(update, 2800);
    return () => {
      window.removeEventListener('gamepadconnected', update);
      window.removeEventListener('gamepaddisconnected', update);
      window.clearInterval(timer);
    };
  }, []);
  return kind;
}

const faceFiles: Record<ControllerKind, Record<FaceGlyph, string>> = {
  playstation: { confirm: 'cross', back: 'circle', details: 'square', search: 'triangle' },
  xbox: { confirm: 'a', back: 'b', details: 'x', search: 'y' },
  switch: { confirm: 'a', back: 'b', details: 'x', search: 'y' },
};

export function ControllerGlyph({ face, kind, size = 18, className = '' }: { face: FaceGlyph; kind: ControllerKind; size?: number; className?: string }) {
  const folder = kind === 'playstation' ? 'ps' : kind === 'switch' ? 'switch' : 'xbox';
  const file = faceFiles[kind][face];
  return (
    <img
      src={`/icons/controller/${folder}/${file}.png`}
      width={size}
      height={size}
      draggable={false}
      aria-hidden="true"
      alt=""
      className={`inline-block shrink-0 object-contain ${className}`}
    />
  );
}

export function ShoulderGlyph({ side, kind, className = '' }: { side: 'left' | 'right'; kind: ControllerKind; className?: string }) {
  const folder = kind === 'playstation' ? 'ps' : 'xbox';
  const file = kind === 'playstation' ? (side === 'left' ? 'l1' : 'r1') : (side === 'left' ? 'lb' : 'rb');
  return (
    <img
      src={`/icons/controller/${folder}/${file}.png`}
      draggable={false}
      aria-hidden="true"
      alt=""
      className={`inline-block h-5 w-auto shrink-0 object-contain ${className}`}
    />
  );
}

export const ControllerShoulder = ShoulderGlyph;
