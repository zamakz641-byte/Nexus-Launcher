import React, { useState, useEffect } from 'react';
import { LauncherSettings } from '../types/game';
import { Search, Settings, Volume2, VolumeX, Power } from './UiIcon';
import { browserLocale, tr } from '../services/i18n';
import { ControllerGlyph, useControllerKind } from './ControllerGlyph';

interface TopbarProps {
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
  settings: LauncherSettings;
  onToggleSound: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenSearch,
  onOpenSettings,
  onQuit,
  settings,
  onToggleSound,
}) => {
  const controllerKind = useControllerKind();
  const [timeStr, setTimeStr] = useState(() => new Date().toLocaleTimeString(browserLocale(settings.language), { hour: '2-digit', minute: '2-digit' }));
  const [dateStr, setDateStr] = useState(() => new Date().toLocaleDateString(browserLocale(settings.language), { day: 'numeric', month: 'short', year: 'numeric' }));

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString(browserLocale(settings.language), { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString(browserLocale(settings.language), { day: 'numeric', month: 'short', year: 'numeric' }));
    };
    updateTime();
    const interval = window.setInterval(updateTime, 30_000);
    return () => window.clearInterval(interval);
  }, [settings.language]);

  return (
    <header id="nexus-topbar" className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex h-[72px] items-center justify-between px-7">
      <button
        id="topbar-search-trigger"
        onClick={onOpenSearch}
        className="pointer-events-auto group flex h-10 w-[500px] max-w-[43vw] items-center gap-3 rounded-[14px] border border-white/[0.075] bg-[#06111b]/86 px-3.5 text-left text-[10.5px] text-[#8293a4] shadow-[0_12px_36px_rgba(0,0,0,.22)] transition-[border-color,background-color,transform,color] duration-150 hover:-translate-y-px hover:border-white/[0.16] hover:bg-[#0a1825] hover:text-white"
      >
        <Search className="h-4 w-4 text-[#758496] transition-colors group-hover:text-sky-300" />
        <span className="flex-1 truncate">{tr(settings.language, 'searchPlaceholder')}</span>
        <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.09] bg-white/[0.035] px-2 py-1 text-[8.5px] font-medium text-slate-400">
          <ControllerGlyph face="search" kind={controllerKind} size={16} className="text-sky-300/90"/>
          <span>ou Ctrl K</span>
        </div>
      </button>

      <div className="pointer-events-auto flex items-center gap-2 rounded-[16px] border border-white/[0.065] bg-[#06111b]/78 p-1.5 shadow-[0_12px_34px_rgba(0,0,0,.22)]">
        <button id="btn-toggle-sound" onClick={onToggleSound} title={settings.sfxEnabled ? 'Désactiver les sons console' : 'Activer les sons console'} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.055] bg-white/[0.025] text-slate-400 transition-[background-color,color,border-color,transform] hover:-translate-y-px hover:border-white/15 hover:bg-white/[0.06] hover:text-white">
          {settings.sfxEnabled ? <Volume2 className="h-4 w-4 text-sky-300" /> : <VolumeX className="h-4 w-4 text-rose-400/80" />}
        </button>

        <div className="flex items-center gap-2 border-l border-white/[0.07] pl-2.5">
          {settings.avatarUrl ? (
            <img src={settings.avatarUrl} alt={settings.username} decoding="async" className="h-7 w-7 rounded-full border border-white/15 object-cover" />
          ) : (
            <div className="grid h-7 w-7 place-items-center rounded-full border border-sky-300/20 bg-sky-400/[0.08] text-[8px] font-black text-sky-200">{(settings.username || 'N').slice(0, 2).toUpperCase()}</div>
          )}
          <div className="text-[10px] leading-tight">
            <div className="font-bold text-slate-200">{settings.username}</div>
            <div className="flex items-center gap-1 text-[8px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/><span>{tr(settings.language, 'online')}</span></div>
          </div>
        </div>

        {settings.showClock && (
          <div className="border-l border-white/[0.07] px-2 text-right leading-tight">
            <div className="font-mono text-[11px] font-bold tracking-wider text-slate-200">{timeStr}</div>
            <div className="text-[8px] text-slate-500">{dateStr}</div>
          </div>
        )}

        <button id="btn-open-settings" onClick={onOpenSettings} title="Paramètres de Nexus" className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.055] bg-white/[0.025] text-slate-400 transition-[background-color,color,border-color,transform] hover:-translate-y-px hover:border-white/15 hover:bg-white/[0.06] hover:text-white">
          <Settings className="h-4 w-4" />
        </button>
        <button id="btn-quit-nexus" onClick={onQuit} title="Quitter Nexus" className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-300/10 bg-white/[0.02] text-slate-500 transition-[background-color,color,border-color,transform] hover:-translate-y-px hover:border-rose-300/25 hover:bg-rose-500/[0.08] hover:text-rose-200">
          <Power className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
