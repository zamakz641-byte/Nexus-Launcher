import { ArrowClockwise, CircleNotch, FilmSlate, FolderSimplePlus, MagnifyingGlass, Plus, X } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { accountsCopy } from "../accountsCopy";
import { useLibraryGames } from '../hooks/useLibraryGames';
import { TrailerDialog } from '../components/TrailerDialog';
import { refreshLibrary } from '../services/refreshLibrary';
import { libraryClient } from '../services/libraryClient';
import { useNexusStore } from '../state/useNexusStore';
import { applyImageFallback } from '../utils/imageFallback';
import { libraryView, type LibraryView } from '../utils/libraryView';

export function LibraryScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const games = useLibraryGames();
  const locale = useNexusStore(state => state.locale);
  const selectedGameId = useNexusStore(state => state.selectedGameId);
  const setSelectedGame = useNexusStore(state => state.setSelectedGame);
  const setPreviewGame = useNexusStore(state => state.setPreviewGame);
  const completeLibraryScan = useNexusStore(state => state.completeLibraryScan);
  const scanState = useNexusStore(state => state.libraryScanState);
  const [view, setView] = useState<LibraryView>({ query: '', status: 'all', source: 'all', sort: 'title' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [trailerId, setTrailerId] = useState<string | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const visibleGames = useMemo(() => libraryView(games, view), [games, view]);
  const activeGame = visibleGames.find(game => game.id === selectedGameId) || visibleGames[0];
  const trailerGame = games.find(game => game.id === trailerId);
  const filtered = Boolean(view.query || view.source !== 'all' || view.status !== 'all');
  const updateView = (next: Partial<LibraryView>) => setView(current => ({ ...current, ...next }));
  const endPreview = () => { if (hoverTimer.current !== null) clearTimeout(hoverTimer.current); hoverTimer.current = null; setPreviewGame(''); };
  useEffect(() => () => { if (hoverTimer.current !== null) clearTimeout(hoverTimer.current); setPreviewGame(''); }, [setPreviewGame]);
  useEffect(() => { if (activeGame && activeGame.id !== selectedGameId) setSelectedGame(activeGame.id); }, [activeGame, selectedGameId, setSelectedGame]);
  const focusGame = (id: string) => { endPreview(); setSelectedGame(id); };
  const previewGame = (id: string) => { endPreview(); hoverTimer.current = window.setTimeout(() => setPreviewGame(id), 180); };
  const add = async (kind: 'game' | 'folder') => {
    setBusy(true); setMessage(''); endPreview();
    const previous = new Set(games.map(game => game.id));
    try {
      const result = await (kind === 'game' ? libraryClient.addExecutable() : libraryClient.addFolder());
      if (!result) return;
      completeLibraryScan(result.games, result.root, result.roots, result.manualGames, result.scanErrors);
      setView({ query: '', source: 'all', status: 'all', sort: 'title' });
      const added = result.games.find(game => !previous.has(game.id));
      if (added) { setSelectedGame(added.id); if (kind === 'game') navigate(`/game/${added.id}`); }
      setMessage(t('library.imported', { count: result.games.length }));
    } catch (error) { setMessage(error instanceof Error ? error.message : t('settings.addError')); }
    finally { setBusy(false); }
  };
  return <section className="screen library-screen library-clean" aria-labelledby="library-title">
    <header className="screen-heading library-heading">
      <div><h1 id="library-title">{t('library.title')}</h1><p role="status">{scanState === 'scanning' ? <><CircleNotch className="library-heading__spinner" size={15} />{t('library.enriching')}</> : scanState === 'error' ? t('library.unavailableSource') : t('library.detected', { count: games.length })}</p></div>
      <div className="library-heading__tools"><button className="screen-tool" type="button" onClick={()=>navigate("/settings?section=accounts")}>{accountsCopy[locale].settings}</button>
        <button className="screen-tool" type="button" disabled={busy} onClick={() => void add('game')}><Plus size={18} />{t('library.addGame')}</button>
        <button className="screen-tool" type="button" disabled={busy} onClick={() => void add('folder')}><FolderSimplePlus size={18} />{t('library.addFolder')}</button>
        <button className="screen-tool" type="button" disabled={busy || scanState === 'scanning'} aria-label={t('library.refreshMetadata')} onClick={() => void refreshLibrary()}><ArrowClockwise size={19} /></button>
      </div>
    </header>
    <div className="library-controls">
      <label className="library-search"><MagnifyingGlass size={19} /><input aria-label={t('library.search')} placeholder={t('library.search')} value={view.query} onChange={event => updateView({ query: event.target.value })} />{view.query ? <button type="button" aria-label={t('search.clear')} onClick={() => updateView({ query: '' })}><X size={17} /></button> : null}</label>
      <label className="library-select"><span>{t('library.platform')}</span><select title={t('library.controllerSelect')} aria-label={t('library.platform')} value={view.source} onChange={event => updateView({ source: event.target.value as LibraryView['source'] })}><option value="all">{t('library.allPlatforms')}</option>{(['Steam','Epic Games','GOG','Local'] as const).filter(source => games.some(game => game.source === source)).map(source => <option key={source} value={source}>{source}</option>)}</select></label>
      <label className="library-select"><span>{t('library.sort')}</span><select title={t('library.controllerSelect')} aria-label={t('library.sort')} value={view.sort} onChange={event => updateView({ sort: event.target.value as LibraryView['sort'] })}><option value="title">{t('library.sortTitle')}</option><option value="recent">{t('library.sortRecent')}</option><option value="playtime">{t('detail.playtime')}</option></select></label>
    </div>
    <div className="library-filterbar">
      <div className="library-status-filters" role="group" aria-label={t('library.statusFilter')}>{(['all','ready','configure'] as const).map(status => <button key={status} type="button" aria-pressed={view.status === status} onClick={() => updateView({ status })}>{t(status === 'all' ? 'library.allGames' : status === 'ready' ? 'status.ready' : 'status.configure')}<span>{status === 'all' ? games.length : games.filter(game => game.installed === (status === 'ready')).length}</span></button>)}</div>
      <span className="library-result-count">{t('library.results', { count: visibleGames.length })}{filtered ? <button className="screen-tool" type="button" onClick={() => updateView({ query: '', status: 'all', source: 'all' })}>{t('library.reset')}</button> : null}</span>
    </div>
    {busy || message ? <p className="library-feedback" role="status">{busy ? t('library.importing') : message}</p> : null}
    <div className="library-stage">
      <div className="library-showcase" aria-label={t('library.title')}>
        {visibleGames.map(game => <button className="library-entry" key={game.id} data-active={game.id === activeGame?.id} data-launch-game={game.installed ? game.id : undefined} title={t('action.holdToPlay')} onClick={() => { focusGame(game.id); navigate(`/game/${game.id}`); }} onFocus={() => focusGame(game.id)} onMouseEnter={() => previewGame(game.id)} onMouseLeave={endPreview} type="button">
          <img src={game.artwork} alt="" loading="lazy" decoding="async" onError={event => applyImageFallback(event, [...(game.artworkFallbacks || []), game.heroArtwork])} /><span className="library-entry__shade" />
          <span className="library-entry__copy"><strong>{game.title}</strong><small><span>{game.source}</span><span data-ready={game.installed}>{t(game.installed ? 'status.ready' : 'status.configure')}</span></small></span>
        </button>)}
        {!visibleGames.length ? <div className="library-zero"><h2>{t(games.length ? 'library.noResults' : 'library.empty')}</h2><p>{t(games.length ? 'library.noResultsHint' : 'library.emptyHint')}</p>{filtered ? <button className="screen-tool" type="button" onClick={() => updateView({ query: '', status: 'all', source: 'all' })}>{t('library.reset')}</button> : <button className="screen-tool" type="button" disabled={busy} onClick={() => void add('folder')}><FolderSimplePlus size={18} />{t('library.addFolder')}</button>}</div> : null}
      </div>
    </div>
    <footer className="library-footer"><span>{t('library.interaction')}</span>{activeGame?.trailer.url ? <button className="screen-tool" type="button" onClick={() => setTrailerId(activeGame.id)}><FilmSlate size={17} />{t('library.trailer')}</button> : null}</footer>
    {trailerGame ? <TrailerDialog game={trailerGame} locale={locale} open onOpenChange={open => { if (!open) setTrailerId(null); }} /> : null}
  </section>;
}
