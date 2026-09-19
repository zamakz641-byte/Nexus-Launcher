import React, { useMemo } from 'react';
import { Game, PlaySession } from '../types/game';
import { activityDays, formatDurationMinutes, formatSessionDate, monthlyPlaytime, recentSessions } from '../services/analytics';
import { Activity, Calendar, Clock, Gamepad2, Trophy } from '../components/UiIcon';

interface StatisticsViewProps { games: Game[]; sessions: PlaySession[]; }

export const StatisticsView: React.FC<StatisticsViewProps> = ({ games, sessions }) => {
  const totalMinutes = sessions.reduce((sum, session) => sum + (session.durationMinutes || 0), 0);
  const totalPlaytime = games.reduce((sum, game) => sum + (game.playtimeHours || 0), 0);
  const totalAchievements = games.reduce((sum, game) => sum + (game.achievementsUnlocked || 0), 0);
  const avgSessionMinutes = sessions.length ? Math.round(totalMinutes / sessions.length) : 0;
  const activeDays = new Set(sessions.map((session) => new Date(session.date).toDateString())).size;
  const months = useMemo(() => monthlyPlaytime(sessions, 8), [sessions]);
  const heatmap = useMemo(() => activityDays(sessions, 52 * 7), [sessions]);
  const latest = useMemo(() => recentSessions(sessions, 5), [sessions]);
  const topGames = [...games].sort((a, b) => (b.playtimeHours || 0) - (a.playtimeHours || 0)).slice(0, 5);

  return (
    <div id="nexus-statistics-view" className="relative min-h-full px-8 pt-24 pb-20 select-none nexus-view-surface">
      <div className="mb-6">
        <div className="mb-1 text-[8.5px] font-extrabold uppercase tracking-[.28em] text-cyan-400/80">Télémétrie locale Nexus</div>
        <h1 className="text-3xl font-black tracking-tight text-white">Statistiques & habitudes de jeu</h1>
        <p className="mt-1 text-[11px] text-slate-400">Calculées depuis les sessions réellement enregistrées sur ce PC.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Temps cumulé', value: `${Math.round(totalPlaytime * 10) / 10} h`, sub: `${formatDurationMinutes(totalMinutes)} suivies par Nexus`, icon: Clock, color: 'text-amber-300' },
          { label: 'Sessions jouées', value: sessions.length, sub: `Moyenne : ${formatDurationMinutes(avgSessionMinutes)}`, icon: Activity, color: 'text-sky-400' },
          { label: 'Succès débloqués', value: totalAchievements, sub: `${games.filter((g) => g.totalAchievements > 0).length} jeux synchronisés`, icon: Trophy, color: 'text-amber-400' },
          { label: 'Jours actifs', value: activeDays, sub: `${games.length} jeux dans la bibliothèque`, icon: Gamepad2, color: 'text-purple-400' },
        ].map((metric) => {
          const Icon = metric.icon;
          return <div key={metric.label} className="nexus-glass-card p-4"><div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{metric.label}</span><Icon className={`h-4 w-4 ${metric.color}`} /></div><div className="mt-2 text-2xl font-black text-white">{metric.value}</div><div className="mt-1 text-[8.5px] text-slate-500">{metric.sub}</div></div>;
        })}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="nexus-glass-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-bold tracking-wide text-white">Volume de jeu mensuel</h3><p className="text-[10px] text-slate-400">Les huit derniers mois, d’après les sessions Nexus.</p></div><span className="rounded-lg border border-sky-400/15 bg-sky-400/[0.07] px-2.5 py-1 text-[9px] font-bold text-sky-300">Local</span></div>
          <div className="flex h-52 items-end justify-between gap-3 border-b border-white/[0.06] px-2 pb-2">
            {months.map((item) => <div key={`${item.year}-${item.month}`} className="group relative flex h-full flex-1 flex-col items-center justify-end"><div className="mb-1 font-mono text-[8px] font-bold text-sky-200/80">{item.hours}h</div><div className="w-full rounded-t-lg bg-gradient-to-t from-[#1d4ed8] via-[#0284c7] to-[#67c8f5] shadow-[0_0_16px_rgba(56,189,248,.16)]" style={{ height: `${item.heightPercent}%` }} /></div>)}
          </div>
          <div className="mt-2 flex justify-between px-2 text-[9px] font-bold text-slate-500">{months.map((item) => <span key={`${item.year}-${item.month}`}>{item.label}</span>)}</div>
        </div>

        <div className="nexus-glass-card p-5">
          <h3 className="mb-4 text-sm font-bold tracking-wide text-white">Jeux les plus joués</h3>
          <div className="space-y-3">
            {topGames.length ? topGames.map((game, index) => {
              const maxHours = Math.max(1, topGames[0]?.playtimeHours || 1);
              const ratio = Math.round(((game.playtimeHours || 0) / maxHours) * 100);
              return <div key={game.id} className="group"><div className="flex items-center justify-between text-[10px] font-semibold text-slate-200"><div className="flex min-w-0 items-center gap-2"><span className="font-mono text-[8px] text-amber-300/80">{String(index + 1).padStart(2,'0')}</span><span className="truncate">{game.title}</span></div><span className="ml-2 font-mono text-slate-500">{game.playtimeHours} h</span></div><div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.055]"><div className="h-full rounded-full" style={{ width: `${ratio}%`, backgroundColor: game.accentColor || '#38bdf8' }} /></div></div>;
            }) : <div className="py-12 text-center text-[9px] text-slate-600">Pas encore de temps de jeu enregistré.</div>}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="nexus-glass-card p-5">
          <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-sky-400"/><h3 className="text-sm font-bold tracking-wide text-white">Activité quotidienne</h3></div><div className="flex items-center gap-1.5 text-[8px] text-slate-500"><span>Moins</span>{[0,1,2,3,4].map((level) => <span key={level} className={`h-2 w-2 rounded-sm activity-level-${level}`} />)}<span>Plus</span></div></div>
          <div className="no-scrollbar overflow-x-auto py-2"><div className="grid min-w-[700px] grid-flow-col grid-rows-7 gap-1">{heatmap.map((day) => <div key={day.date.toISOString()} className={`h-2.5 w-2.5 rounded-[2px] activity-level-${day.level} transition-transform hover:scale-125`} title={`${day.date.toLocaleDateString('fr-FR')} · ${formatDurationMinutes(day.minutes)}`} />)}</div></div>
        </div>
        <div className="nexus-glass-card p-5">
          <h3 className="mb-3 text-sm font-bold tracking-wide text-white">Dernières sessions</h3>
          <div className="space-y-1.5">{latest.length ? latest.map((session) => <div key={session.id} className="rounded-xl border border-white/[0.045] bg-black/20 px-3 py-2"><div className="truncate text-[9.5px] font-semibold text-slate-200">{session.gameTitle}</div><div className="mt-0.5 flex justify-between text-[8px] text-slate-500"><span>{formatSessionDate(session.date)}</span><span>{formatDurationMinutes(session.durationMinutes)}</span></div></div>) : <div className="py-10 text-center text-[9px] text-slate-600">Aucune session pour l’instant.</div>}</div>
        </div>
      </div>
    </div>
  );
};
