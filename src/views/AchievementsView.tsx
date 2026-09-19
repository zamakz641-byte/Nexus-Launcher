import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Game, LauncherSettings } from '../types/game';
import { CheckCircle2, KeyRound, Lock, RefreshCw, Trophy, Zap } from '../components/UiIcon';

interface AchievementsViewProps {
  games: Game[];
  selectedGameId: string;
  settings: LauncherSettings;
  onSelectGame: (id: string) => void;
  onOpenSettings?: () => void;
  onSyncAchievements: (id: string) => Promise<{ ok: boolean; error?: string; count?: number }>;
}

function formatUnlock(value: string | number | null | undefined) {
  if (!value) return '';
  const dt = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(dt);
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({ games, selectedGameId, settings, onSelectGame, onOpenSettings, onSyncAchievements }) => {
  const activeGame = games.find((g) => g.id === selectedGameId) || games[0] || null;
  const [filterUnlocked, setFilterUnlocked] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const autoSynced = useRef(new Set<string>());

  const achievements = activeGame?.recentAchievements || [];
  const unlockedCount = activeGame?.achievementsUnlocked || achievements.filter((a) => a.unlocked).length;
  const totalCount = activeGame?.totalAchievements || achievements.length;
  const percent = totalCount ? Math.round((unlockedCount / totalCount) * 100) : 0;
  const displayedList = useMemo(() => achievements.filter((achievement) => filterUnlocked === 'all' || (filterUnlocked === 'unlocked' ? achievement.unlocked : !achievement.unlocked)), [achievements, filterUnlocked]);
  const credentialsReady = Boolean(settings.steamWebApiKey && settings.steamId64);

  const sync = async () => {
    if (!activeGame || syncing) return;
    setSyncing(true); setSyncError('');
    try { await onSyncAchievements(activeGame.id); }
    catch (error) { setSyncError(error instanceof Error ? error.message : String(error)); }
    finally { setSyncing(false); }
  };

  useEffect(() => {
    if (!activeGame?.steamAppId || !credentialsReady || achievements.length || autoSynced.current.has(activeGame.id)) return;
    autoSynced.current.add(activeGame.id);
    void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGame?.id, activeGame?.steamAppId, credentialsReady]);

  if (!activeGame) {
    return <div className="flex min-h-full items-center justify-center px-8 pb-20 pt-24"><div className="max-w-md text-center"><Trophy className="mx-auto h-8 w-8 text-slate-600"/><h1 className="mt-4 text-2xl font-black text-white">Aucun succès à afficher</h1><p className="mt-2 text-[11px] leading-5 text-slate-500">Ajoute d’abord un jeu.</p></div></div>;
  }

  return (
    <div id="nexus-achievements-view" className="relative min-h-full px-8 pb-20 pt-24 select-none nexus-view-surface">
      <div data-controller-row="true" className="no-scrollbar mb-5 flex items-center gap-2 overflow-x-auto pb-1">
        {games.map((game, index) => (
          <button key={game.id} data-controller-default={game.id === activeGame.id || (!selectedGameId && index === 0) ? 'true' : undefined} onClick={() => onSelectGame(game.id)} className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2 text-[10px] font-semibold transition-colors ${game.id === activeGame.id ? 'border-sky-300/30 bg-sky-400/[0.09] text-white' : 'border-white/[0.07] bg-[#07111b] text-slate-400 hover:bg-white/[0.04] hover:text-white'}`}>
            <div className="h-6 w-6 overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.03]">{game.coverImage && <img src={game.coverImage} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover"/>}</div><span className="max-w-[160px] truncate">{game.title}</span>{game.totalAchievements > 0 && <span className="text-[8px] text-slate-500">{game.achievementsUnlocked}/{game.totalAchievements}</span>}
          </button>
        ))}
      </div>

      <section className="relative mb-5 overflow-hidden rounded-3xl border border-white/[0.075] bg-[#07111b] p-6 shadow-[0_24px_70px_rgba(0,0,0,.25)]">
        {activeGame.heroImage && <img src={activeGame.heroImage} alt="" decoding="async" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[.18]"/>}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#06101a] via-[#06101a]/94 to-[#06101a]/65"/>
        <div className="relative z-10 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-2xl">
            <div className="text-[8.5px] font-extrabold uppercase tracking-[.28em] text-sky-300/75">Steam Achievements</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">{activeGame.title}</h1>
            <p className="mt-1 text-[10.5px] text-slate-400">{totalCount ? `${unlockedCount} sur ${totalCount} succès déverrouillés.` : activeGame.steamAppId ? 'Aucune donnée synchronisée pour le moment.' : 'Associe d’abord la bonne identité Steam pour ce jeu.'}</p>
            <div data-controller-row="true" className="mt-4 flex flex-wrap items-center gap-2">
              <button data-controller-default="true" disabled={syncing || !activeGame.steamAppId || !credentialsReady} onClick={() => void sync()} className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-300/20 bg-sky-400/[0.08] px-3.5 text-[9px] font-black text-sky-100 transition-colors hover:bg-sky-400/[0.13] disabled:cursor-not-allowed disabled:opacity-35"><RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`}/>{syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}</button>
              {!credentialsReady && onOpenSettings && <button onClick={onOpenSettings} className="h-9 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 text-[9px] font-bold text-slate-300 hover:bg-white/[0.07]">Configurer Steam API</button>}
              {activeGame.steamAppId && <span className="rounded-lg border border-white/[0.06] bg-black/25 px-2.5 py-1.5 font-mono text-[8px] text-slate-500">AppID {activeGame.steamAppId}</span>}
            </div>
            {syncError && <div className="mt-3 text-[9px] text-rose-300">{syncError}</div>}
          </div>
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
            <div className="min-w-[120px] rounded-2xl border border-white/[0.07] bg-black/25 px-4 py-3 text-center"><div className="text-xl font-black text-white">{percent}%</div><div className="text-[7px] uppercase tracking-[.18em] text-slate-500">complété</div></div>
            <div className="min-w-[120px] rounded-2xl border border-white/[0.07] bg-black/25 px-4 py-3 text-center"><div className="text-xl font-black text-white">{unlockedCount}</div><div className="text-[7px] uppercase tracking-[.18em] text-slate-500">débloqués</div></div>
            <div className="min-w-[120px] rounded-2xl border border-white/[0.07] bg-black/25 px-4 py-3 text-center"><div className="text-xl font-black text-white">{Math.max(0, totalCount - unlockedCount)}</div><div className="text-[7px] uppercase tracking-[.18em] text-slate-500">restants</div></div>
          </div>
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between">
        <div className="text-[11px] font-bold tracking-wide text-white">Succès ({displayedList.length})</div>
        <div data-controller-row="true" className="flex gap-1 rounded-xl border border-white/[0.08] bg-black/30 p-1">
          {([['all','Tous'],['unlocked','Débloqués'],['locked','Verrouillés']] as const).map(([id,label]) => <button key={id} onClick={() => setFilterUnlocked(id)} className={`rounded-lg px-3 py-1.5 text-[8.5px] font-semibold transition-colors ${filterUnlocked === id ? 'bg-white/[0.12] text-white' : 'text-slate-500 hover:text-slate-300'}`}>{label}</button>)}
        </div>
      </div>

      {achievements.length === 0 ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] px-8 text-center">
          <div className="max-w-md">{credentialsReady ? <Zap className="mx-auto h-6 w-6 text-sky-300/70"/> : <KeyRound className="mx-auto h-6 w-6 text-slate-600"/>}<h3 className="mt-3 text-[12px] font-bold text-slate-200">{credentialsReady ? 'Prêt à synchroniser' : 'Connexion Steam API requise'}</h3><p className="mt-1 text-[9.5px] leading-5 text-slate-500">{credentialsReady ? 'Utilise Synchroniser maintenant. Nexus garde ensuite les résultats dans ta bibliothèque locale.' : 'Ajoute Steam Web API Key et SteamID64 dans Paramètres. Aucun faux trophée ne sera généré.'}</p></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {displayedList.map((achievement) => {
            const icon = achievement.unlocked ? achievement.iconUrl : achievement.iconGrayUrl || achievement.iconUrl;
            return <article key={achievement.id} className={`flex items-center gap-4 rounded-2xl border p-3.5 ${achievement.unlocked ? 'border-amber-300/13 bg-[#07111b]' : 'border-white/[0.05] bg-[#050b12] opacity-72'}`}>
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">{icon ? <img src={icon} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover"/> : achievement.unlocked ? <Trophy className="h-5 w-5 text-amber-300"/> : <Lock className="h-4 w-4 text-slate-500"/>}</div>
              <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h4 className={`truncate text-[10.5px] font-bold ${achievement.unlocked ? 'text-white' : 'text-slate-400'}`}>{achievement.title}</h4>{achievement.rarity > 0 && <span className="shrink-0 rounded-full bg-white/[0.04] px-2 py-1 text-[7.5px] font-bold text-slate-500">{achievement.rarity.toFixed(1)}%</span>}</div><p className="mt-0.5 line-clamp-2 text-[8.8px] leading-4 text-slate-500">{achievement.description || 'Description non fournie par Steam.'}</p>{achievement.unlocked && achievement.unlockedAt && <div className="mt-1 flex items-center gap-1 text-[8px] text-emerald-400"><CheckCircle2 className="h-2.5 w-2.5"/>{formatUnlock(achievement.unlockedAt)}</div>}</div>
            </article>;
          })}
        </div>
      )}
    </div>
  );
};
