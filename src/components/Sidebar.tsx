import React from 'react';
import { ViewType, LauncherSettings } from '../types/game';
import { tr } from '../services/i18n';
import {
  Home,
  LayoutGrid,
  FolderKanban,
  Trophy,
  BarChart3,
  Settings,
  Plus,
  Compass,
  Power,
} from './UiIcon';

interface SidebarProps {
  activeView: ViewType;
  onSelectView: (view: ViewType) => void;
  onOpenAddGame: () => void;
  onQuit: () => void;
  settings: LauncherSettings;
}

interface NavItem {
  id: ViewType;
  labelKey: 'home' | 'library' | 'collections' | 'achievements' | 'statistics' | 'settings';
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'accueil', labelKey: 'home', icon: Home },
  { id: 'bibliotheque', labelKey: 'library', icon: LayoutGrid },
  { id: 'collections', labelKey: 'collections', icon: FolderKanban },
  { id: 'succes', labelKey: 'achievements', icon: Trophy },
  { id: 'statistiques', labelKey: 'statistics', icon: BarChart3 },
  { id: 'parametres', labelKey: 'settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  onOpenAddGame,
  onQuit,
  settings,
}) => {
  return (
    <aside
      id="nexus-sidebar"
      className="relative z-30 flex h-full w-[202px] shrink-0 flex-col border-r border-white/[0.06] bg-[linear-gradient(180deg,rgba(3,13,23,.985),rgba(2,8,14,.97))] px-3.5 py-4.5 shadow-[18px_0_55px_rgba(0,0,0,.18)]"
    >
      {/* Brand Header */}
      <button
        id="nexus-brand"
        onClick={() => onSelectView('accueil')}
        className="group mb-7 flex items-center gap-3 px-1.5 text-left transition-transform active:scale-[.985]"
      >
        <div className="nexus-brand-mark relative grid h-10 w-10 place-items-center overflow-hidden rounded-[13px] border border-white/[0.09] bg-white/[0.035] shadow-[0_10px_28px_rgba(0,0,0,.28)]">
          <img src="/branding/nexus-mark.svg" alt="" draggable={false} className="h-8 w-8 object-contain drop-shadow-[0_0_14px_rgba(125,211,252,.3)]" />
          <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-sky-300/10" />
        </div>
        <div className="nexus-brand-copy">
          <div className="text-[13px] font-black tracking-[0.38em] text-white">NEXUS</div>
          <div className="text-[7px] font-bold tracking-[0.24em] text-sky-400/70">
            PLAY YOUR WORLD
          </div>
        </div>
      </button>

      {/* Main Navigation */}
      <nav id="nexus-main-nav" className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onSelectView(item.id)}
              className={`group relative flex h-10.5 w-full items-center gap-3 rounded-xl px-3 text-[11.5px] font-semibold transition-[background-color,color,transform,box-shadow] duration-150 ${
                isActive
                  ? 'bg-white/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.055),0_10px_28px_rgba(0,0,0,.22)]'
                  : 'text-[#7f92a4] hover:translate-x-0.5 hover:bg-white/[0.035] hover:text-[#e7eef5]'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center transition-colors duration-200 ${
                  isActive
                    ? 'text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                    : 'text-[#728394] group-hover:text-[#b8c6d4]'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="tracking-wide">{tr(settings.language, item.labelKey)}</span>

              {/* Active Indicator pip */}
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full" style={{ background: 'var(--nexus-accent)', boxShadow: '0 0 14px var(--nexus-accent)' }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions & User Profile */}
      <div className="mt-auto flex flex-col gap-3 pt-4 border-t border-white/[0.04]">
        {/* Add Game Button */}
        <button
          id="btn-add-game"
          onClick={onOpenAddGame}
          className="group relative flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-400/[0.05] text-[11px] font-semibold text-amber-200/90 shadow-[0_0_20px_rgba(251,191,36,0.08)] transition-all hover:border-amber-300/35 hover:bg-amber-400/[0.09] hover:text-amber-100 hover:shadow-[0_0_26px_rgba(251,191,36,0.18)] active:scale-[0.98]"
        >
          <Plus className="h-3.5 w-3.5 text-amber-300 transition-transform group-hover:rotate-90" />
          <span>{tr(settings.language, 'addGame')}</span>
        </button>

        <button
          id="btn-quit-sidebar"
          onClick={onQuit}
          className="group flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.055] bg-black/20 text-[10px] font-semibold text-slate-500 transition-colors hover:border-rose-300/20 hover:bg-rose-500/[0.05] hover:text-rose-200"
        >
          <Power className="h-3.5 w-3.5" />
          <span>Quitter Nexus</span>
        </button>

        {/* User Profile Mini Bar */}
        <div
          id="user-profile-widget"
          className="flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-black/25 p-2 transition-colors hover:border-white/10"
        >
          <div className="relative">
            {settings.avatarUrl ? (
              <img src={settings.avatarUrl} alt={settings.username} className="h-8 w-8 rounded-full border border-white/15 object-cover" />
            ) : (
              <div className="grid h-8 w-8 place-items-center rounded-full border border-sky-300/20 bg-sky-400/[0.08] text-[8px] font-black text-sky-200">
                {(settings.username || 'N').slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#020912] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-bold text-slate-200">
              {settings.username}
            </div>
            <div className="flex items-center gap-1 text-[8px] text-slate-400">
              <span className="h-1 w-1 rounded-full bg-emerald-400" />
              <span>{settings.statusText}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
