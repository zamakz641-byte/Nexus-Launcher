import React from 'react';
import type { LauncherSettings, ViewType } from '../types/game';
import { tr } from '../services/i18n';
import { ControllerGlyph, ControllerShoulder, useControllerKind } from './ControllerGlyph';

interface ConsoleFooterProps {
  show: boolean;
  activeView: ViewType;
  language?: LauncherSettings['language'];
}

const VIEW_LABELS: Record<ViewType, 'home' | 'library' | 'collections' | 'achievements' | 'statistics' | 'settings'> = {
  accueil: 'home', bibliotheque: 'library', collections: 'collections',
  succes: 'achievements', statistiques: 'statistics', parametres: 'settings',
};

const KIND_LABEL = { playstation: 'PLAYSTATION', xbox: 'XBOX', switch: 'SWITCH' } as const;
const segment = 'flex h-8 items-center gap-2 rounded-xl border border-white/[0.06] bg-black/25 px-3 text-[8.5px] font-semibold text-slate-300';

export const ConsoleFooter: React.FC<ConsoleFooterProps> = ({ show, activeView, language }) => {
  const kind = useControllerKind();
  if (!show) return null;

  return (
    <footer id="nexus-console-footer" className="pointer-events-none fixed bottom-3 left-[218px] right-6 z-[90] flex min-h-[46px] items-center justify-between gap-3 rounded-[18px] border border-white/[0.08] bg-[#06111b]/95 p-1.5 text-slate-300 shadow-[0_18px_46px_rgba(0,0,0,.38)] select-none">
      <div className={segment}>
        <span className="flex items-center gap-1"><ControllerShoulder side="left" kind={kind}/><ControllerShoulder side="right" kind={kind}/></span>
        <span>{tr(language, 'changeSection')}</span>
      </div>

      <div className="flex items-center gap-2 text-[7.5px] font-black uppercase tracking-[.15em] text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,.7)]" />
        <span className="text-slate-300">{tr(language, VIEW_LABELS[activeView])}</span>
        <span className="h-3 w-px bg-white/10" />
        <span>{KIND_LABEL[kind]}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex h-8 items-center gap-2 rounded-xl border border-sky-300/25 bg-sky-400/10 px-3 text-[8.5px] font-bold text-sky-100 shadow-[0_0_18px_rgba(56,189,248,.08)]"><ControllerGlyph face="confirm" kind={kind} size={19}/><span>{tr(language, 'selectLaunch')}</span></div>
        <div className={segment}><ControllerGlyph face="back" kind={kind} size={18}/><span>{tr(language, 'back')}</span></div>
        <div className={segment}><ControllerGlyph face="details" kind={kind} size={18}/><span>{tr(language, 'details')}</span></div>
        <div className={segment}><ControllerGlyph face="search" kind={kind} size={18}/><span>{tr(language, 'search')}</span></div>
      </div>
    </footer>
  );
};