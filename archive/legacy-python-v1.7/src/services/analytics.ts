import type { Game, PlaySession } from '../types/game';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export function formatDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (!hours) return `${mins} min`;
  if (!mins) return `${hours} h`;
  return `${hours} h ${String(mins).padStart(2, '0')}`;
}

export function formatSessionDate(date: string): string {
  if (!date) return 'Date inconnue';
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return date;
  const now = new Date();
  const localDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const itemDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const delta = Math.round((localDay - itemDay) / 86400000);
  if (delta === 0) return "Aujourd’hui";
  if (delta === 1) return 'Hier';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: dt.getFullYear() === now.getFullYear() ? undefined : 'numeric' }).format(dt);
}

export function recentSessions(sessions: PlaySession[], limit = 3): PlaySession[] {
  return [...sessions]
    .filter((session) => session.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export function unlockedAchievements(games: Game[], limit = 6) {
  return games
    .flatMap((game) => game.recentAchievements.map((achievement) => ({ game, achievement })))
    .filter(({ achievement }) => achievement.unlocked)
    .sort((a, b) => {
      const av = typeof a.achievement.unlockedAt === 'number' ? a.achievement.unlockedAt : Date.parse(String(a.achievement.unlockedAt || 0));
      const bv = typeof b.achievement.unlockedAt === 'number' ? b.achievement.unlockedAt : Date.parse(String(b.achievement.unlockedAt || 0));
      return (bv || 0) - (av || 0);
    })
    .slice(0, limit);
}

export function monthlyPlaytime(sessions: PlaySession[], monthCount = 8) {
  const now = new Date();
  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - index), 1);
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      label: MONTHS_FR[date.getMonth()],
      hours: 0,
    };
  });
  const byKey = new Map(months.map((entry) => [`${entry.year}-${entry.month}`, entry]));
  sessions.forEach((session) => {
    const dt = new Date(session.date);
    if (Number.isNaN(dt.getTime())) return;
    const entry = byKey.get(`${dt.getFullYear()}-${dt.getMonth()}`);
    if (entry) entry.hours += Math.max(0, session.durationMinutes || 0) / 60;
  });
  const max = Math.max(1, ...months.map((entry) => entry.hours));
  return months.map((entry) => ({
    ...entry,
    hours: Math.round(entry.hours * 10) / 10,
    heightPercent: Math.max(entry.hours > 0 ? 8 : 2, Math.round((entry.hours / max) * 100)),
  }));
}

export function activityDays(sessions: PlaySession[], days = 364) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const totals = new Map<string, number>();
  for (const session of sessions) {
    const dt = new Date(session.date);
    if (Number.isNaN(dt.getTime())) continue;
    const key = `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
    totals.set(key, (totals.get(key) || 0) + (session.durationMinutes || 0));
  }
  const max = Math.max(1, ...totals.values());
  return Array.from({ length: days }, (_, i) => {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const key = `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
    const minutes = totals.get(key) || 0;
    return { date: dt, minutes, level: minutes === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((minutes / max) * 4))) };
  });
}
