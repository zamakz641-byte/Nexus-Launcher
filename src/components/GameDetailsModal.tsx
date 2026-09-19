import React, { useEffect, useMemo, useState } from 'react';
import type { Game, IdentityCandidate } from '../types/game';
import { CheckCircle2, Clock, Film, Heart, HardDrive, LoaderCircle, Pencil, Play, RefreshCw, Save, Search, ShieldCheck, Trash2, Trophy, X } from './UiIcon';
import { nativeApi, pollJob } from '../services/native';

interface GameDetailsModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onRefreshMedia?: (id: string) => Promise<string>;
  onDelete?: (id: string) => Promise<void> | void;
  onLibraryChanged?: () => Promise<void> | void;
}

export const GameDetailsModal: React.FC<GameDetailsModalProps> = ({ game, isOpen, onClose, onLaunch, onToggleFavorite, onRefreshMedia, onDelete, onLibraryChanged }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityCandidates, setIdentityCandidates] = useState<IdentityCandidate[]>([]);
  const [identityError, setIdentityError] = useState('');
  const [identityApplying, setIdentityApplying] = useState('');
  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  const unlocked = useMemo(() => game?.recentAchievements?.filter((item) => item.unlocked).slice(0, 5) || [], [game]);

  useEffect(() => {
    if (game && isOpen) {
      setNameDraft(game.title || '');
      setNameEditing(false);
      setTrailerOpen(false);
      setIdentityOpen(false);
    }
  }, [game?.id, game?.title, isOpen]);

  if (!isOpen || !game) return null;

  const refresh = async () => {
    if (!onRefreshMedia || refreshing) return;
    setRefreshing(true);
    setRefreshProgress(2);
    setRefreshMessage('Préparation…');
    try {
      const id = await onRefreshMedia(game.id);
      await pollJob(id, (job) => { setRefreshProgress(job.progress || 0); setRefreshMessage(job.message || 'Synchronisation…'); });
      await onLibraryChanged?.();
      setRefreshMessage('Médias actualisés');
    } catch (error) {
      setRefreshMessage(error instanceof Error ? error.message : String(error));
    } finally {
      window.setTimeout(() => setRefreshing(false), 650);
    }
  };

  const openIdentity = async () => {
    setIdentityOpen(true);
    setIdentityLoading(true);
    setIdentityError('');
    try {
      const api = await nativeApi();
      const items = await api.search_identity_candidates(game.id);
      setIdentityCandidates(items || []);
      if (!items?.length) setIdentityError('Aucune correspondance exploitable trouvée.');
    } catch (error) {
      setIdentityError(error instanceof Error ? error.message : String(error));
    } finally {
      setIdentityLoading(false);
    }
  };

  const applyIdentity = async (candidate: IdentityCandidate) => {
    if (identityApplying) return;
    setIdentityApplying(`${candidate.provider}:${candidate.providerId}`);
    setIdentityError('');
    try {
      const api = await nativeApi();
      const jobId = await api.apply_identity_candidate(game.id, candidate);
      await pollJob(jobId, (job) => { setRefreshProgress(job.progress || 0); setRefreshMessage(job.message || 'Identification…'); });
      await onLibraryChanged?.();
      setIdentityOpen(false);
    } catch (error) {
      setIdentityError(error instanceof Error ? error.message : String(error));
    } finally {
      setIdentityApplying('');
    }
  };

  const saveDisplayName = async () => {
    const title = nameDraft.trim();
    if (!title || title === game.title) { setNameEditing(false); return; }
    setNameSaving(true);
    try {
      const api = await nativeApi();
      await api.update_game(game.id, { title, titleLocked: true });
      await onLibraryChanged?.();
      setNameEditing(false);
    } finally {
      setNameSaving(false);
    }
  };

  return (
    <div data-controller-scope="true" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/88 p-5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="relative max-h-[92vh] w-full max-w-[1060px] overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#050d15] shadow-[0_45px_150px_rgba(0,0,0,.9)]">
        <div className="relative h-[290px] overflow-hidden">
          {game.heroImage ? <img src={game.heroImage} alt="" decoding="async" fetchPriority="high" draggable={false} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-gradient-to-br from-sky-950 to-black" />}
          <div className="absolute inset-0 bg-gradient-to-r from-[#040b12]/95 via-[#040b12]/45 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050d15] via-transparent to-black/20" />
          <button data-controller-back="true" data-controller-skip="true" onClick={onClose} className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border border-white/[0.1] bg-black/70 text-white/70 hover:bg-white/[0.10] hover:text-white"><X className="h-4 w-4"/></button>
          <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between gap-7">
            <div className="min-w-0">
              {game.logoUrl ? <img src={game.logoUrl} alt={game.title} decoding="async" draggable={false} className="mb-3 max-h-[74px] max-w-[390px] object-contain object-left drop-shadow-[0_12px_35px_rgba(0,0,0,.8)]" /> : <h2 className="mb-2 text-3xl font-black text-white">{game.title}</h2>}
              <div className="flex flex-wrap gap-1.5">{game.genres.map((genre) => <span key={genre} className="rounded-full border border-white/[0.09] bg-black/55 px-2.5 py-1 text-[8px] font-semibold text-slate-300">{genre}</span>)}</div>
            </div>
            <div data-controller-row="true" className="flex shrink-0 gap-2"><button onClick={() => onToggleFavorite(game.id)} className={`grid h-11 w-11 place-items-center rounded-xl border transition-colors ${game.isFavorite ? 'border-rose-300/30 bg-rose-400/15 text-rose-300' : 'border-white/[0.1] bg-black/30 text-slate-300 hover:bg-white/[0.08]'}`}><Heart className={`h-4 w-4 ${game.isFavorite ? 'fill-current' : ''}`}/></button><button data-controller-default="true" onClick={() => onLaunch(game.id)} className="flex h-11 items-center gap-2 rounded-xl px-6 text-[11px] font-black text-[#071018] shadow-[0_10px_30px_rgba(0,0,0,.3)]" style={{ background: `linear-gradient(135deg,#fff,${game.accentColor || '#e8cf82'})` }}><Play className="h-4 w-4 fill-current"/>Jouer</button></div>
          </div>
        </div>

        <div className="no-scrollbar max-h-[calc(92vh-290px)] overflow-y-auto px-7 pb-7">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_.75fr]">
            <div className="space-y-5">
              <div><p className="text-[11px] leading-6 text-slate-400">{game.description || 'Aucune description disponible pour ce jeu.'}</p></div>

              {(game.trailerUrl || game.trailerEmbedUrl) && (
                <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-black/30">
                  {!trailerOpen ? (
                    <button
                      type="button"
                      onClick={() => setTrailerOpen(true)}
                      className="group relative block aspect-video w-full overflow-hidden text-left"
                    >
                      {game.trailerPosterUrl || game.heroImage ? (
                        <img src={game.trailerPosterUrl || game.heroImage} alt="Trailer" decoding="async" loading="lazy" draggable={false} className="h-full w-full object-cover opacity-82 transition-opacity duration-150 group-hover:opacity-95" />
                      ) : <div className="absolute inset-0 bg-gradient-to-br from-sky-950/70 to-black" />}
                      <div className="absolute inset-0 grid place-items-center bg-black/15">
                        <span className="grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-black/72 text-white shadow-xl"><Play className="h-5 w-5 translate-x-[1px] fill-current"/></span>
                      </div>
                      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/72 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.18em] text-white/80"><Film className="h-3 w-3"/>{game.trailerIsLocal ? 'Trailer local' : `Trailer ${game.trailerProvider || 'streaming'}`}</div>
                    </button>
                  ) : (
                    <div data-controller-scope="true" className="relative aspect-video w-full bg-black">
                      {game.trailerUrl ? (
                        <video src={game.trailerUrl} poster={game.trailerPosterUrl} controls autoPlay playsInline preload="metadata" className="h-full w-full bg-black object-contain" />
                      ) : game.trailerEmbedUrl ? (
                        <iframe src={`${game.trailerEmbedUrl}${game.trailerEmbedUrl.includes('?') ? '&' : '?'}autoplay=1`} title={game.trailerName || `Trailer ${game.title}`} className="h-full w-full bg-black" allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
                      ) : null}
                      <button
                        type="button"
                        data-controller-back="true"
                        data-controller-skip="true"
                        onClick={() => setTrailerOpen(false)}
                        className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/80 text-white/80 shadow-xl hover:bg-black hover:text-white"
                        aria-label="Fermer le trailer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!game.trailerUrl && !game.trailerEmbedUrl && <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-black/25 p-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sky-300/15 bg-sky-400/[0.06] text-sky-300"><Film className="h-4 w-4"/></div><div className="min-w-0 flex-1"><div className="text-[10px] font-black text-slate-200">Aucun trailer lié pour l'instant</div><div className="mt-1 text-[8.5px] text-slate-500">Nexus vérifie Steam, IGDB puis YouTube. Relance uniquement les médias pour ce jeu.</div></div><button onClick={refresh} disabled={refreshing} className="shrink-0 rounded-xl border border-sky-300/15 bg-sky-400/[0.07] px-3 py-2 text-[8.5px] font-bold text-sky-200 hover:bg-sky-400/[0.12] disabled:opacity-50">{refreshing ? 'Recherche…' : 'Chercher le trailer'}</button></div>}

              {game.screenshots.length > 0 && <div><div className="mb-2 text-[9px] font-black uppercase tracking-[.2em] text-slate-500">Captures</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{game.screenshots.map((shot, index) => <img key={`${shot}-${index}`} src={shot} alt="" loading="lazy" decoding="async" draggable={false} className="aspect-video w-full rounded-xl border border-white/[0.06] object-cover" />)}</div></div>}

              {unlocked.length > 0 && <div><div className="mb-2 text-[9px] font-black uppercase tracking-[.2em] text-slate-500">Derniers succès</div><div className="flex gap-2">{unlocked.map((achievement) => <div key={achievement.id} title={achievement.title} className="h-11 w-11 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03]">{achievement.iconUrl ? <img src={achievement.iconUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center"><Trophy className="h-4 w-4 text-amber-300"/></div>}</div>)}</div></div>}
            </div>

            <aside className="space-y-3">
              <div className="nexus-glass-card divide-y divide-white/[0.05] p-4">
                <div className="flex items-center justify-between py-2 first:pt-0"><span className="flex items-center gap-2 text-[9px] text-slate-500"><Clock className="h-3.5 w-3.5"/>Temps de jeu</span><b className="text-[10px] text-slate-200">{game.playtimeHours} h</b></div>
                <div className="flex items-center justify-between py-2"><span className="flex items-center gap-2 text-[9px] text-slate-500"><Trophy className="h-3.5 w-3.5"/>Succès</span><b className="text-[10px] text-slate-200">{game.achievementsUnlocked}/{game.totalAchievements}</b></div>
                <div className="flex items-center justify-between py-2"><span className="flex items-center gap-2 text-[9px] text-slate-500"><HardDrive className="h-3.5 w-3.5"/>Taille</span><b className="text-[10px] text-slate-200">{game.installSizeGb ? `${game.installSizeGb} Go` : 'Inconnue'}</b></div>
                <div className="flex items-center justify-between py-2 last:pb-0"><span className="text-[9px] text-slate-500">Source</span><b className="text-[9px] uppercase text-slate-300">{game.source || 'manual'}</b></div>
              </div>
              <div className="nexus-glass-card p-4 text-[9px] leading-5 text-slate-500"><div><span className="text-slate-400">Développeur :</span> {game.developer || 'Inconnu'}</div><div><span className="text-slate-400">Éditeur :</span> {game.publisher || 'Inconnu'}</div><div><span className="text-slate-400">Sortie :</span> {game.releaseYear || 'Inconnue'}</div>{game.steamAppId && <div><span className="text-slate-400">Steam AppID :</span> {game.steamAppId}</div>}{game.identityProvider && <div><span className="text-slate-400">Identité :</span> {game.identityProvider.toUpperCase()} {game.identityLocked ? '· verrouillée' : ''}</div>}</div>

              <div className="nexus-glass-card p-3">
                <div className="mb-2 flex items-center justify-between"><span className="text-[8px] font-black uppercase tracking-[.16em] text-slate-500">Nom dans Nexus</span>{game.titleLocked && <span className="text-[7px] font-bold uppercase tracking-wider text-amber-300/60">personnalisé</span>}</div>
                {nameEditing ? <div data-controller-row="true" className="flex gap-2"><input data-controller-default="true" autoFocus value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void saveDisplayName(); }} className="min-w-0 flex-1 rounded-lg border border-sky-300/20 bg-black/30 px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-sky-300/45"/><button disabled={nameSaving} onClick={saveDisplayName} className="grid h-9 w-9 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-200 disabled:opacity-50"><Save className="h-3.5 w-3.5"/></button></div> : <button onClick={() => { setNameDraft(game.title); setNameEditing(true); }} className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-left text-[9.5px] font-bold text-slate-200 hover:bg-white/[0.04]"><span className="truncate">{game.title}</span><Pencil className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-500"/></button>}
              </div>

              <button onClick={openIdentity} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] py-2.5 text-[9px] font-bold text-amber-100 hover:bg-amber-300/[0.1]"><Search className="h-3.5 w-3.5"/>Corriger l'identité / la version</button>
              <button onClick={refresh} disabled={refreshing} className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300/15 bg-sky-400/[0.06] py-2.5 text-[9px] font-bold text-sky-200 hover:bg-sky-400/[0.1] disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}/>{refreshing ? `${Math.round(refreshProgress)}% · ${refreshMessage}` : 'Actualiser les médias'}</button>
              <button onClick={async () => { try { const api = await nativeApi(); await api.update_game(game.id, { runAsAdmin: !game.runAsAdmin }); await onLibraryChanged?.(); } catch {} }} className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[9px] font-bold ${game.runAsAdmin ? 'border-amber-300/25 bg-amber-300/[0.09] text-amber-100' : 'border-white/[0.07] bg-white/[0.025] text-slate-400 hover:text-white'}`}><ShieldCheck className="h-3.5 w-3.5"/>{game.runAsAdmin ? 'Admin pour ce jeu · activé' : 'Lancer ce jeu en administrateur'}</button>
              {onDelete && <button onClick={() => window.confirm(`Retirer ${game.title} de Nexus ? Les fichiers du jeu ne seront pas supprimés.`) && onDelete(game.id)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/15 bg-rose-500/[0.05] py-2.5 text-[9px] font-bold text-rose-300/80 hover:bg-rose-500/[0.1]"><Trash2 className="h-3.5 w-3.5"/>Retirer de la bibliothèque</button>}
            </aside>
          </div>
        </div>
      </div>

      {identityOpen && <div data-controller-scope="true" className="absolute inset-0 z-20 grid place-items-center bg-[#02070d]/97 p-6">
        <div className="w-full max-w-[780px] overflow-hidden rounded-[24px] border border-white/[0.1] bg-[#07111b] shadow-[0_35px_120px_rgba(0,0,0,.85)]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4"><div><div className="text-[8px] font-black uppercase tracking-[.24em] text-amber-300/70">Résolveur Nexus</div><h3 className="mt-1 text-base font-black text-white">Quel jeu est-ce vraiment ?</h3><p className="mt-1 text-[9px] text-slate-500">Choisis la bonne édition/version. Nexus mémorisera l'identifiant et ne devinera plus au prochain scan.</p></div><button data-controller-back="true" data-controller-skip="true" onClick={() => setIdentityOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-black/25 text-slate-400 hover:text-white"><X className="h-4 w-4"/></button></div>
          <div className="max-h-[520px] overflow-y-auto p-4">
            {identityLoading ? <div className="grid min-h-[220px] place-items-center"><LoaderCircle className="h-7 w-7 animate-spin text-sky-300"/></div> : identityCandidates.length ? <div className="grid gap-2 sm:grid-cols-2">{identityCandidates.map((candidate, index) => { const key = `${candidate.provider}:${candidate.providerId}`; const applying = identityApplying === key; return <button key={key} data-controller-default={index === 0 ? 'true' : undefined} disabled={Boolean(identityApplying)} onClick={() => applyIdentity(candidate)} className="group flex min-h-[108px] items-center gap-3 rounded-2xl border border-white/[0.065] bg-black/20 p-3 text-left transition hover:border-sky-300/25 hover:bg-white/[0.04] disabled:opacity-50">{candidate.imageUrl ? <img src={candidate.imageUrl} alt="" loading="lazy" decoding="async" className="h-[80px] w-[60px] rounded-lg object-cover"/> : <div className="grid h-[80px] w-[60px] shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.025]"><Search className="h-4 w-4 text-slate-600"/></div>}<div className="min-w-0 flex-1"><div className="truncate text-[10.5px] font-black text-white">{candidate.title}</div><div className="mt-1 text-[8.5px] text-slate-500">{candidate.provider.toUpperCase()}{candidate.releaseYear ? ` · ${candidate.releaseYear}` : ''}{candidate.developer ? ` · ${candidate.developer}` : ''}</div><div className="mt-2 flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[7.5px] font-black ${candidate.score >= .93 ? 'bg-emerald-400/10 text-emerald-300' : candidate.score >= .75 ? 'bg-amber-300/10 text-amber-200' : 'bg-white/[0.05] text-slate-500'}`}>{Math.round(candidate.score * 100)}% match</span>{candidate.verified && <CheckCircle2 className="h-3.5 w-3.5 text-sky-300"/>}{applying && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-sky-300"/>}</div></div></button>; })}</div> : null}
            {identityError && <div className="mt-3 rounded-xl border border-rose-400/15 bg-rose-500/[0.07] px-3 py-2 text-[9px] text-rose-200">{identityError}</div>}
          </div>
        </div>
      </div>}
    </div>
  );
};
