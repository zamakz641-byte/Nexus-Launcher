import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  FolderOpen,
  Gamepad2,
  HardDriveDownload,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from './UiIcon';
import type { ImportCandidate, ImportJob } from '../types/game';
import { nativeApi, pollJob } from '../services/native';

interface AddGameModalProps {
  isOpen: boolean;
  autoScan?: boolean;
  onClose: () => void;
  onImported: () => Promise<void> | void;
}

export const AddGameModal: React.FC<AddGameModalProps> = ({ isOpen, autoScan = true, onClose, onImported }) => {
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [loadingScan, setLoadingScan] = useState(false);
  const [query, setQuery] = useState('');
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCandidate, setPendingCandidate] = useState<ImportCandidate | null>(null);
  const [manualName, setManualName] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setJob(null);
      setError(null);
      setPendingCandidate(null);
      setManualName('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !autoScan || candidates.length > 0 || loadingScan || job) return;
    let cancelled = false;
    setLoadingScan(true);
    setError(null);
    void nativeApi()
      .then((api) => api.scan_installed_games())
      .then((items) => { if (!cancelled) setCandidates(items); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoadingScan(false); });
    return () => { cancelled = true; };
  }, [isOpen, autoScan]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((item) => `${item.title} ${item.source}`.toLowerCase().includes(q));
  }, [candidates, query]);

  if (!isOpen) return null;

  const scan = async () => {
    setLoadingScan(true);
    setError(null);
    try {
      const api = await nativeApi();
      const items = await api.scan_installed_games();
      setCandidates(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingScan(false);
    }
  };

  const runImport = async (starter: () => Promise<string>) => {
    setError(null);
    setJob({ id: 'starting', status: 'queued', progress: 0, message: 'Préparation…' });
    try {
      const jobId = await starter();
      const result = await pollJob(jobId, (next) => setJob(next));
      setJob(result);
      await onImported();
      window.setTimeout(() => onClose(), 850);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setJob(null);
    }
  };

  const chooseExe = async () => {
    try {
      const api = await nativeApi();
      const path = await api.choose_executable();
      if (!path) return;
      const inspected = await api.inspect_executable(path);
      setPendingCandidate(inspected);
      setManualName(inspected.title || 'Jeu PC');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const confirmManualImport = async () => {
    if (!pendingCandidate) return;
    const title = manualName.trim() || pendingCandidate.title || 'Jeu PC';
    const candidate: ImportCandidate = {
      ...pendingCandidate,
      title,
      titleLocked: title !== (pendingCandidate.title || '').trim(),
    };
    const api = await nativeApi();
    setPendingCandidate(null);
    await runImport(() => api.start_import_candidate(candidate));
  };

  const importCandidate = async (candidate: ImportCandidate) => {
    const api = await nativeApi();
    await runImport(() => api.start_import_candidate(candidate));
  };

  const importing = job?.status === 'queued' || job?.status === 'running';
  const done = job?.status === 'done';

  return (
    <div
      id="add-game-modal"
      data-controller-scope="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#010409]/85 p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !importing) onClose();
      }}
    >
      <div className="w-full max-w-[820px] overflow-hidden rounded-[26px] border border-white/[0.1] bg-[#07111b]/95 shadow-[0_40px_130px_rgba(0,0,0,.88)]">
        <header className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/[0.08] text-sky-200">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.28em] text-sky-300/75">Bibliothèque Nexus</div>
              <h2 className="text-lg font-black tracking-tight text-white">Ajouter un jeu</h2>
            </div>
          </div>
          <button
            type="button"
            data-controller-back="true" data-controller-skip="true"
            disabled={importing}
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.07] bg-black/20 text-slate-400 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-30"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {job ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-12 text-center">
            <div className={`relative grid h-20 w-20 place-items-center rounded-full border ${done ? 'border-emerald-300/35 bg-emerald-400/10' : 'border-sky-300/25 bg-sky-400/[0.07]'}`}>
              {done ? <CheckCircle2 className="h-8 w-8 text-emerald-300" /> : <LoaderCircle className="h-8 w-8 animate-spin text-sky-300" />}
              {!done && <span className="absolute inset-[-10px] rounded-full border border-sky-300/10 animate-pulse" />}
            </div>
            <h3 className="mt-6 text-xl font-black text-white">{done ? 'Jeu prêt dans Nexus' : 'Nexus prépare les médias'}</h3>
            <p className="mt-2 max-w-lg text-[11px] leading-5 text-slate-400">
              {job.message || 'Identification, illustrations, trailer et métadonnées sont sauvegardés au fur et à mesure.'}
            </p>
            <div className="mt-6 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-300 to-amber-200 shadow-[0_0_18px_rgba(56,189,248,.35)] transition-[width] duration-300"
                style={{ width: `${Math.max(3, Math.min(100, job.progress || 0))}%` }}
              />
            </div>
            <div className="mt-2 flex w-full max-w-md justify-between text-[8.5px] font-bold uppercase tracking-[.16em] text-slate-500">
              <span>{job.step || 'import'}</span><span>{Math.round(job.progress || 0)}%</span>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {pendingCandidate && (
              <div data-controller-scope="true" className="rounded-2xl border border-amber-300/18 bg-gradient-to-br from-amber-300/[0.07] to-black/10 p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/20 bg-black/25 text-amber-200"><FolderOpen className="h-4 w-4"/></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300/70">Nom détecté intelligemment</div>
                    <div className="mt-1 truncate text-[9px] text-slate-500">{pendingCandidate.executablePath}</div>
                  </div>
                </div>
                <label className="mt-5 block text-[9px] font-bold text-slate-400">Nom dans Nexus</label>
                <input
                  data-controller-default="true"
                  autoFocus
                  value={manualName}
                  onChange={(event) => setManualName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/[0.09] bg-black/30 px-4 py-3 text-[12px] font-bold text-white outline-none transition focus:border-sky-300/35"
                />
                {Boolean(pendingCandidate.nameCandidates?.length) && <div className="mt-3 flex flex-wrap gap-2">
                  {pendingCandidate.nameCandidates!.map((name) => <button key={name} type="button" onClick={() => setManualName(name)} className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[8.5px] font-bold text-slate-300 hover:border-sky-300/25 hover:text-white">{name}</button>)}
                </div>}
                <div data-controller-row="true" className="mt-5 flex justify-end gap-2">
                  <button data-controller-back="true" type="button" onClick={() => { setPendingCandidate(null); setManualName(''); }} className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-[9px] font-bold text-slate-300 hover:bg-white/[0.07]">Retour</button>
                  <button type="button" onClick={confirmManualImport} className="rounded-xl border border-amber-200/25 bg-amber-300 px-5 py-2.5 text-[9px] font-black text-[#171009] hover:bg-amber-200">Importer ce jeu</button>
                </div>
              </div>
            )}

            {!pendingCandidate && <>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                data-controller-default="true"
                onClick={chooseExe}
                className="group flex min-h-[118px] items-center gap-4 rounded-2xl border border-amber-300/15 bg-gradient-to-br from-amber-300/[0.08] to-transparent p-5 text-left transition hover:-translate-y-0.5 hover:border-amber-300/35 hover:bg-amber-300/[0.1]"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-300/20 bg-black/30 text-amber-200 shadow-[0_0_30px_rgba(245,190,70,.08)]">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[12px] font-black text-white">Choisir un exécutable</div>
                  <div className="mt-1 text-[9.5px] leading-4 text-slate-400">Sélectionne le .exe. Nexus tente ensuite de reconnaître automatiquement le jeu.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={scan}
                disabled={loadingScan}
                className="group flex min-h-[118px] items-center gap-4 rounded-2xl border border-sky-300/15 bg-gradient-to-br from-sky-300/[0.08] to-transparent p-5 text-left transition hover:-translate-y-0.5 hover:border-sky-300/35 hover:bg-sky-300/[0.1] disabled:opacity-60"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-sky-300/20 bg-black/30 text-sky-200">
                  {loadingScan ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <HardDriveDownload className="h-5 w-5" />}
                </div>
                <div>
                  <div className="text-[12px] font-black text-white">Scanner les launchers</div>
                  <div className="mt-1 text-[9.5px] leading-4 text-slate-400">Steam, Epic et GOG. Aucun dossier inventé et aucun jeu de démonstration.</div>
                </div>
              </button>
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-2.5">
              <Search className="h-3.5 w-3.5 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filtrer les jeux détectés…"
                className="w-full bg-transparent text-[11px] text-white outline-none placeholder:text-slate-600"
              />
              {candidates.length > 0 && (
                <button type="button" onClick={scan} className="text-slate-500 hover:text-white" title="Rafraîchir le scan">
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingScan ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            <div className="no-scrollbar mt-3 max-h-[300px] overflow-y-auto rounded-2xl border border-white/[0.06] bg-black/20">
              {filtered.length === 0 ? (
                <div className="flex min-h-[170px] flex-col items-center justify-center px-6 text-center">
                  <Sparkles className="h-5 w-5 text-slate-600" />
                  <div className="mt-3 text-[10.5px] font-bold text-slate-300">{candidates.length ? 'Aucun résultat' : 'Prêt à scanner ta bibliothèque'}</div>
                  <div className="mt-1 text-[9px] leading-4 text-slate-500">Les covers, Hero, logos et trailers seront récupérés après identification.</div>
                </div>
              ) : (
                filtered.map((item) => (
                  <button
                    type="button"
                    key={`${item.source}:${item.sourceId}`}
                    disabled={item.alreadyImported}
                    onClick={() => importCandidate(item)}
                    className="flex w-full items-center gap-3 border-b border-white/[0.045] px-4 py-3 text-left transition last:border-0 hover:bg-white/[0.035] disabled:opacity-45"
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-sky-300">
                      <Gamepad2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[10.5px] font-bold text-slate-100">{item.title}</div>
                      <div className="mt-0.5 truncate text-[8.5px] text-slate-500">{item.source.toUpperCase()} · {item.installDir || item.executablePath || 'Installation détectée'}</div>
                    </div>
                    <div className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wider ${item.alreadyImported ? 'bg-white/5 text-slate-500' : 'bg-sky-400/10 text-sky-300'}`}>
                      {item.alreadyImported ? 'Ajouté' : 'Importer'}
                    </div>
                  </button>
                ))
              )}
            </div>

            </>}

            {error && <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-[10px] text-rose-200">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
};
