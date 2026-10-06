import { ReplayPluginCard } from '../components/ReplayPluginCard';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowClockwise, Camera, CaretLeft, CaretRight, FilmStrip, FolderPlus, Play, Star, X } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { captureCopy } from '../captureCopy';
import type { CaptureEngineStatus, CaptureLibrary } from '../captureTypes';
import { useNexusStore } from '../state/useNexusStore';

const emptyLibrary: CaptureLibrary = { items: [], roots: [], errors: [], truncated: false };
type Filter = 'all' | 'image' | 'clip' | 'favorite';

export function CapturesScreen() {
  const locale = useNexusStore(state => state.locale);
  const copy = captureCopy[locale === 'fr' ? 'fr' : 'en'];
  const api = window.nexusDesktop;
  const [library, setLibrary] = useState(emptyLibrary);
  const [engine, setEngine] = useState<CaptureEngineStatus>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<'saved' | 'error' | ''>('');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [game, setGame] = useState('');
  const [selected, setSelected] = useState<string>();
  const [broken, setBroken] = useState(false);
  const alive = useRef(false);
  const generation = useRef(0);
  const engineGeneration = useRef(0);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const firstFilter = useRef<HTMLButtonElement>(null);
  const load = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = api ? await api.listCaptures() : emptyLibrary;
      if (alive.current && current === generation.current) setLibrary(result);
    } catch { if (alive.current) setMessage('error'); }
    finally { if (alive.current && current === generation.current) setLoading(false); }
  }, [api]);
  const loadEngine = useCallback(async () => {
    if (!api) return;
    const current = ++engineGeneration.current;
    try { const result = await api.getCaptureEngineStatus(); if (alive.current && current === engineGeneration.current) setEngine(result); }
    catch { /* Gallery remains usable when the optional engine is unavailable. */ }
  }, [api]);
  useEffect(() => {
    alive.current = true;
    void load(); void loadEngine();
    const unsubscribe = api?.onCaptureChanged(() => { void load(); });
    const timer = window.setInterval(() => { if (!document.hidden) { void load(); void loadEngine(); } }, 10000);
    return () => { alive.current = false; generation.current++; engineGeneration.current++; unsubscribe?.(); window.clearInterval(timer); };
  }, [api, load, loadEngine]);
  const settingUp = engine?.state === 'downloading' || engine?.state === 'installing';
  useEffect(() => { if (!settingUp) return; const timer = window.setInterval(() => void loadEngine(), 1200); return () => window.clearInterval(timer); }, [settingUp, loadEngine]);
  const run = async (action: () => Promise<unknown>, saved = false) => {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await action(); if (alive.current) { if (saved) setMessage('saved'); await load(); await loadEngine(); } }
    catch { if (alive.current) setMessage('error'); }
    finally { if (alive.current) setBusy(false); }
  };
  const games = useMemo(() => [...new Set(library.items.map(item => item.game))].sort((a, b) => a.localeCompare(b, locale)), [library.items, locale]);
  const items = useMemo(() => library.items.filter(item => (filter === 'all' || (filter === 'favorite' ? item.favorite : item.kind === filter)) && (!game || item.game === game) && `${item.game} ${item.name}`.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale))), [library.items, filter, game, query, locale]);
  const index = items.findIndex(item => item.id === selected);
  const item = items[index];
  useEffect(() => { if (selected && !item) setSelected(undefined); }, [selected, item]);
  useEffect(() => setBroken(false), [selected]);
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }), [locale]);
  const date = (value: string) => { const parsed = new Date(value); return Number.isFinite(parsed.getTime()) ? formatter.format(parsed) : ''; };
  const gameName = (value: string) => value === 'Desktop' ? copy.desktop : value;
  const step = (delta: number) => { if (items[index + delta]) setSelected(items[index + delta].id); };

  return <section className="capture-screen">
    <header className="capture-header"><div><p className="eyebrow">NEXUS CAPTURE</p><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
      <div className="capture-actions"><button disabled={!api || busy || !engine?.canSave} title={copy.replayShortcut} onClick={() => api && void run(() => api.saveReplay(locale), true)}><FilmStrip />{copy.saveReplay}</button><button disabled={!api || busy} title={copy.shortcut} onClick={() => api && void run(() => api.captureScreenshot(locale), true)}><Camera />{copy.screenshot}</button><button disabled={!api || busy} onClick={() => api && void run(() => api.addCaptureFolder())}><FolderPlus />{copy.addFolder}</button><button aria-label={copy.refresh} disabled={busy} onClick={() => void run(load)}><ArrowClockwise /></button></div>
    </header>
    <ReplayPluginCard onStatus={setEngine}/>
    <div className="capture-toolbar"><div className="capture-filters" role="group" aria-label={copy.title}>{(['all', 'image', 'clip', 'favorite'] as const).map((value, i) => <button key={value} ref={i === 0 ? firstFilter : undefined} aria-pressed={filter === value} onClick={() => setFilter(value)}>{copy[value === 'image' ? 'images' : value === 'clip' ? 'clips' : value === 'favorite' ? 'favorites' : 'all']}</button>)}</div><select aria-label={copy.allGames} value={game} onChange={event => setGame(event.target.value)}><option value="">{copy.allGames}</option>{games.map(name => <option key={name} value={name}>{gameName(name)}</option>)}</select><input aria-label={copy.search} placeholder={copy.search} value={query} onChange={event => setQuery(event.target.value)} /></div>
    <p className="capture-status" role="status">{message ? copy[message] : !api ? copy.browser : engine?.supported === false ? copy.unsupported : library.errors.length ? copy.sourceError : library.truncated ? copy.limit : ''}</p>
    {loading ? <p>{copy.loading}</p> : items.length ? <div className="capture-grid">{items.map(media => <button className="capture-card" key={media.id} onClick={event => { trigger.current = event.currentTarget; setSelected(media.id); }} aria-label={`${gameName(media.game)} · ${media.name}`}><div className="capture-art">{media.kind === 'image' ? <img src={media.url} alt="" loading="lazy" decoding="async" /> : <div className="capture-clip"><FilmStrip /><Play weight="fill" /></div>}{media.favorite && <Star className="capture-star" weight="fill" />}<span>{media.kind === 'image' ? <Camera /> : <FilmStrip />}</span></div><div className="capture-caption"><strong>{gameName(media.game)}</strong><time dateTime={media.createdAt}>{date(media.createdAt)}</time></div></button>)}</div> : <div className="capture-empty"><Camera /><h2>{library.items.length ? copy.noResults : copy.empty}</h2><p>{copy.emptyHint}</p></div>}
    <Dialog.Root open={!!item} onOpenChange={open => { if (!open) setSelected(undefined); }}><Dialog.Portal><Dialog.Overlay className="capture-dialog-overlay" /><Dialog.Content className="capture-dialog" aria-describedby={undefined} onCloseAutoFocus={event => { event.preventDefault(); (trigger.current?.isConnected ? trigger.current : firstFilter.current)?.focus(); }} onKeyDown={event => { if ((event.target as HTMLElement).tagName === 'VIDEO') return; if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); step(event.key === 'ArrowLeft' ? -1 : 1); } }}>
      <div className="capture-viewer-heading"><div><Dialog.Title>{item ? gameName(item.game) : copy.viewer}</Dialog.Title><p>{item && date(item.createdAt)}</p></div><Dialog.Close asChild><button aria-label={copy.close}><X /></button></Dialog.Close></div>
      <div className="capture-viewer-media">{item && (item.kind === 'image' ? <img key={item.id} src={item.url} alt={item.name} onError={() => setBroken(true)} /> : <video key={item.id} src={item.url} controls playsInline preload="metadata" onError={() => setBroken(true)} />)}{broken && <p role="alert">{copy.readError}</p>}</div>
      <div className="capture-viewer-actions"><button aria-label={copy.previous} disabled={index <= 0} onClick={() => step(-1)}><CaretLeft /></button><span>{index + 1} / {items.length}</span><button aria-label={copy.next} disabled={index >= items.length - 1} onClick={() => step(1)}><CaretRight /></button><button disabled={busy} aria-pressed={item?.favorite ?? false} onClick={() => api && item && void run(() => api.favoriteCapture(item.id, !item.favorite))}><Star weight={item?.favorite ? 'fill' : 'regular'} />{item?.favorite ? copy.unfavorite : copy.favorite}</button><button disabled={busy} onClick={() => api && item && void run(() => api.revealCapture(item.id))}>{copy.reveal}</button></div>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </section>;
}
