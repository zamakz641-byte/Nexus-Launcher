import React, { useState, useEffect } from 'react';
import { Game } from '../types/game';
import { Square, Timer, Activity } from './UiIcon';

interface ActivePlayingBarProps {
  game: Game | null;
  startTime: number | null;
  onStop: () => void;
}

export const ActivePlayingBar: React.FC<ActivePlayingBarProps> = ({
  game,
  startTime,
  onStop,
}) => {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const totalSec = Math.floor((Date.now() - startTime) / 1000);
      const hrs = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      setElapsed(
        `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  if (!game || !startTime) return null;

  return (
    <div
      id="active-playing-bar"
      className="fixed bottom-10 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-2xl border border-amber-300/30 bg-[#07111b]/95 px-5 py-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_25px_rgba(251,191,36,0.15)] animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={game.coverImage}
            alt={game.title}
            className="h-9 w-9 rounded-lg border border-white/15 object-cover"
          />
          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#07111b]">
            <Activity className="h-2 w-2 text-black animate-pulse" />
          </span>
        </div>

        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-extrabold uppercase tracking-wider text-emerald-400">
              Session en cours
            </span>
          </div>
          <div className="text-[11px] font-bold text-white">{game.title}</div>
        </div>
      </div>

      <div className="h-6 w-px bg-white/10" />

      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-amber-200">
        <Timer className="h-3.5 w-3.5 text-amber-400" />
        <span>{elapsed}</span>
      </div>

      <button
        onClick={onStop}
        className="flex items-center gap-1.5 rounded-xl border border-rose-400/30 bg-rose-500/15 px-3.5 py-1.5 text-[10px] font-bold text-rose-300 transition-colors hover:bg-rose-500/25 active:scale-95"
      >
        <Square className="h-3 w-3 fill-current" />
        <span>Arrêter la session</span>
      </button>
    </div>
  );
};
