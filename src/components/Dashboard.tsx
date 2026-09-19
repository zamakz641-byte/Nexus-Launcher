import React, { useMemo } from 'react';
import { Game, PlaySession, ViewType } from '../types/game';
import { formatDurationMinutes, formatSessionDate, monthlyPlaytime, recentSessions, unlockedAchievements } from '../services/analytics';
import { Heart, Layers3, Sparkles, Swords, Trophy } from './UiIcon';

interface DashboardProps {
  games: Game[];
  sessions: PlaySession[];
  onNavigate: (view: ViewType) => void;
  onSelectGame: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ games, sessions, onNavigate, onSelectGame }) => {
  const recent = useMemo(() => recentSessions(sessions, 3), [sessions]);
  const achievements = useMemo(() => unlockedAchievements(games, 6), [games]);
  const months = useMemo(() => monthlyPlaytime(sessions, 8), [sessions]);
  const totalThisYear = useMemo(() => {
    const year = new Date().getFullYear();
    return sessions
      .filter((session) => new Date(session.date).getFullYear() === year)
      .reduce((sum, session) => sum + (session.durationMinutes || 0), 0) / 60;
  }, [sessions]);

  const favoriteCount = games.filter((g) => g.isFavorite).length;
  const rpgCount = games.filter((g) => g.genres.some((genre) => genre.toLowerCase() === 'rpg')).length;
  const actionCount = games.filter((g) => g.genres.some((genre) => genre.toLowerCase().includes('action'))).length;
  const backlogCount = games.filter((g) => (g.collections || []).includes('À terminer')).length;
  const firstAchievement = achievements[0];
  const remainingAchievements = Math.max(0, achievements.length - 1);

  return (
    <section id="nexus-dashboard" className="grid grid-cols-1 gap-3.5 select-none sm:grid-cols-2 lg:grid-cols-4">
      <div className="nexus-glass-card nexus-dashboard-card flex h-[176px] flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[11.5px] font-black tracking-[.01em] text-white">Activité récente</h3>
          <span className="text-[7.5px] uppercase tracking-[.16em] text-slate-500">Sessions réelles</span>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1">
          {recent.length === 0 ? (
            <div className="flex h-full items-center gap-3 rounded-xl border border-dashed border-white/[0.07] px-3 text-[9px] leading-4 text-slate-500">
              <Sparkles className="h-4 w-4 shrink-0 text-slate-600" /> Tes prochaines sessions apparaîtront ici.
            </div>
          ) : recent.map((session) => {
            const game = games.find((item) => item.id === session.gameId);
            return (
              <button key={session.id} onClick={() => game && onSelectGame(game.id)} className="group flex items-center gap-2.5 rounded-lg p-1 text-left transition hover:bg-white/[0.035]">
                <div className="h-8 w-8 overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.03]">
                  {game?.coverImage ? <img src={game.coverImage} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-slate-600"><Layers3 className="h-3.5 w-3.5" /></div>}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[9.5px] font-semibold text-slate-200 group-hover:text-amber-100">{session.gameTitle}</div>
                  <div className="mt-0.5 text-[8px] text-slate-500">{formatSessionDate(session.date)} · {formatDurationMinutes(session.durationMinutes)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="nexus-glass-card nexus-dashboard-card flex h-[176px] flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[11.5px] font-black tracking-[.01em] text-white">Succès récents</h3>
          <button onClick={() => onNavigate('succes')} className="text-[8px] font-semibold text-sky-400/80 hover:text-sky-300">Voir tout</button>
        </div>
        {firstAchievement ? (
          <>
            <div className="flex items-center gap-3">
              <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-amber-300/20 bg-amber-400/[0.05]">
                {firstAchievement.achievement.iconUrl ? (
                  <img src={firstAchievement.achievement.iconUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : <Trophy className="h-5 w-5 text-amber-300/80" />}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[9.5px] font-bold text-slate-100">{firstAchievement.achievement.title}</div>
                <div className="mt-0.5 line-clamp-1 text-[8px] text-slate-400">{firstAchievement.game.title}</div>
                <div className="mt-1 text-[7.5px] font-semibold text-emerald-300/85">Débloqué</div>
              </div>
            </div>
            <div className="mt-auto flex items-center gap-1.5 border-t border-white/[0.04] pt-2">
              {achievements.slice(1, 5).map(({ achievement }) => (
                <div key={achievement.id} className="grid h-7 w-7 place-items-center overflow-hidden rounded-md border border-white/[0.07] bg-black/25">
                  {achievement.iconUrl ? <img src={achievement.iconUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <Trophy className="h-3 w-3 text-amber-200/60" />}
                </div>
              ))}
              {remainingAchievements > 0 && <button onClick={() => onNavigate('succes')} className="flex h-7 flex-1 items-center justify-center rounded-md border border-sky-400/15 bg-sky-500/[0.08] text-[8px] font-bold text-sky-300">+{remainingAchievements}</button>}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/[0.07] px-4 text-center text-[9px] leading-4 text-slate-500">
            Connecte Steam Web API dans Paramètres pour synchroniser les succès compatibles.
          </div>
        )}
      </div>

      <div className="nexus-glass-card nexus-dashboard-card flex h-[176px] flex-col justify-between p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[11.5px] font-black tracking-[.01em] text-white">Temps de jeu par mois</h3>
            <button onClick={() => onNavigate('statistiques')} className="text-[7.5px] text-sky-400/70 hover:text-sky-300">Voir les statistiques</button>
          </div>
          <div className="text-right leading-tight">
            <div className="text-[13.5px] font-extrabold text-white">{Math.round(totalThisYear * 10) / 10} h</div>
            <div className="text-[7.5px] text-slate-500">Cette année</div>
          </div>
        </div>
        <div className="flex h-[66px] items-end justify-between gap-1.5 border-b border-white/[0.05] px-1 pb-1">
          {months.map((item) => (
            <div key={`${item.year}-${item.month}`} className="group relative flex h-full flex-1 flex-col items-center justify-end">
              <div className="pointer-events-none absolute -top-5 rounded bg-black/90 px-1.5 py-0.5 text-[7px] text-white opacity-0 transition group-hover:opacity-100">{item.hours} h</div>
              <div className="w-full max-w-4 rounded-t-[3px] bg-gradient-to-t from-[#2f6ca5] to-[#66b9ef] shadow-[0_0_10px_rgba(72,170,240,.17)] transition-[height]" style={{ height: `${item.heightPercent}%` }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between px-1 text-[7px] font-medium text-slate-500">{months.map((item) => <span key={`${item.year}-${item.month}`}>{item.label}</span>)}</div>
      </div>

      <div className="nexus-glass-card nexus-dashboard-card flex h-[176px] flex-col p-4">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[11.5px] font-black tracking-[.01em] text-white">Mes collections</h3>
          <button onClick={() => onNavigate('collections')} className="text-[8px] font-semibold text-sky-400/80 hover:text-sky-300">Tout voir</button>
        </div>
        <div className="flex flex-1 flex-col justify-around divide-y divide-white/[0.04]">
          {[
            { label: 'Favoris', count: favoriteCount, icon: Heart, className: 'text-rose-400' },
            { label: 'RPG', count: rpgCount, icon: Layers3, className: 'text-sky-400' },
            { label: 'Action', count: actionCount, icon: Swords, className: 'text-amber-400' },
            { label: 'À terminer', count: backlogCount, icon: Sparkles, className: 'text-purple-400' },
          ].map((entry) => {
            const Icon = entry.icon;
            return (
              <button key={entry.label} onClick={() => onNavigate('collections')} className="flex items-center justify-between py-1 text-[8.5px] text-slate-300 transition hover:text-white">
                <span className="flex items-center gap-2"><Icon className={`h-3 w-3 ${entry.className}`} /><span>{entry.label}</span></span>
                <b className="font-bold text-slate-200">{entry.count}</b>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
