import * as Dialog from '@radix-ui/react-dialog';
import { ArrowSquareOut, Link, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountsCopy } from '../accountsCopy';
import { useLibraryGames } from '../hooks/useLibraryGames';
import { SteamAccountSettings } from './SteamAchievements';
import type { SteamAccountStatus } from '../steamAchievementsTypes';
import type { StoreLibraryResult, StoreAccountStatus } from '../storeAccountsTypes';

type Provider = 'steam'|'epic'|'gog';
const names = {steam:'Steam',epic:'Epic Games',gog:'GOG'};
export function ConnectedAccounts({locale}:{locale:'fr'|'en'}) {
  const copy = accountsCopy[locale], desktop = window.nexusDesktop;
  const [statuses,setStatuses] = useState<Partial<Record<Provider,StoreAccountStatus|SteamAccountStatus>>>({});
  const [selected,setSelected] = useState<Provider>('steam');
  const [connectionDialog,setConnectionDialog] = useState<Provider|null>(null);
  const [busy,setBusy] = useState<Provider|null>(null);
  const [connecting,setConnecting] = useState<Provider|null>(null);
  const [results,setResults] = useState<Partial<Record<Provider,StoreLibraryResult>>>({});
  const [message,setMessage] = useState(''), [query,setQuery] = useState('');
  const generation = useRef(0);
  const authenticationGeneration = useRef(0);
  const connectionTrigger = useRef<HTMLButtonElement|null>(null);
  const localGames = useLibraryGames(), navigate = useNavigate();
  const load = async (provider:Provider,force=false) => {
    if(!desktop)return;
    const revision=++generation.current; setBusy(provider); setMessage('');
    try {
      const value = provider==='steam' ? await desktop.getSteamLibrary(force) : await desktop.getStoreLibrary(provider,force);
      if(revision===generation.current)setResults(previous=>({...previous,[provider]:value}));
    } catch {if(revision===generation.current)setMessage(copy.error);}
    finally {if(revision===generation.current)setBusy(null);}
  };
  const statusesRefresh = async () => {
    if(!desktop)return;
    const value = await desktop.getSteamAccountStatus();
    setStatuses(previous=>({...previous,steam:value}));
  };
  useEffect(() => {
    let alive=true;
    if(desktop)void Promise.all([desktop.getSteamAccountStatus(),desktop.getStoreAccountStatus('epic'),desktop.getStoreAccountStatus('gog')]).then(values=>{if(alive)setStatuses({steam:values[0],epic:values[1],gog:values[2]});}).catch(()=>{if(alive)setMessage(copy.error);});
    return ()=>{alive=false;generation.current++;authenticationGeneration.current++;};
  },[desktop]);
  useEffect(()=>{if(busy===null)void load(selected);},[selected,desktop]);
  const connect = async (provider:Provider) => {
    setQuery('');
    if(provider==='steam')return;
    if(!desktop||connecting)return;
    const revision=++authenticationGeneration.current;setConnecting(provider);setMessage('');
    try {
      const status=await desktop.connectStoreAccount(provider);
      if(revision!==authenticationGeneration.current)return;
      setStatuses(previous=>({...previous,[provider]:status}));
      setSelected(provider);
      if(status.error)setMessage(copy[status.error as keyof typeof copy]||copy.error);
      if(status.configured&&!status.error)setConnectionDialog(current=>current===provider?null:current);
      if(status.configured && !status.error)await load(provider,true);
    }catch{if(revision===authenticationGeneration.current)setMessage(copy.error);}
    finally{if(revision===authenticationGeneration.current)setConnecting(null);}
  };
  const disconnect = async (provider:Provider) => {
    if(!desktop)return;
    const revision=++generation.current;setBusy(provider);
    try {
      const status=provider==='steam'?await desktop.clearSteamAccount():await desktop.clearStoreAccount(provider);
      if(revision!==generation.current)return;
      setStatuses(previous=>({...previous,[provider]:status}));
      setResults(previous=>({...previous,[provider]:undefined}));setMessage('');
    }catch{if(revision===generation.current)setMessage(copy.error);}
    finally{if(revision===generation.current)setBusy(null);}
  };
  const active=results[selected];
  const visibleGames=active?.games.map(game=>{
    const local=selected==='steam'?localGames.find(item=>String(item.steamAppId)===game.id):undefined;
    return local?{...game,title:local.title}:game;
  }).filter(game=>active.scope!=='local'||game.title!==`Steam ${game.id}`)||[];
  const filtered=visibleGames.filter(game=>game.title.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)));
  return <div className="connected-accounts">
    <p className="accounts-intro">{copy.subtitle}</p>
    {!desktop?<p role="status">{copy.desktop}</p>:null}
    <div className="account-cards">{(['steam','epic','gog'] as const).map(provider=><article className="account-card" key={provider} data-selected={provider===selected}>
      <div className="account-card__heading"><strong>{names[provider]}</strong><span data-connected={Boolean((statuses[provider]?.configured || (provider==='steam' && (statuses.steam as SteamAccountStatus|undefined)?.linked)))}>{(statuses[provider]?.configured || (provider==='steam' && (statuses.steam as SteamAccountStatus|undefined)?.linked))?statuses[provider]?.configured?copy.connected:copy.linked:copy.notConnected}</span></div>
      <p>{copy[provider]}</p>{statuses[provider]?.storageAvailable===false?<p role="status">{copy['storage-unavailable']}</p>:null}
      <div className="account-card__actions"><button className="screen-tool" onClick={event=>{connectionTrigger.current=event.currentTarget;setMessage('');setConnectionDialog(provider);}} type="button"><Link size={16}/>{(statuses[provider]?.configured || (provider==='steam' && (statuses.steam as SteamAccountStatus|undefined)?.linked))?copy.manage:`${copy.connect} ${names[provider]}`}</button>
      {(statuses[provider]?.configured || (provider==='steam' && (statuses.steam as SteamAccountStatus|undefined)?.linked))?<><button className="screen-tool" disabled={busy!==null||connecting!==null} onClick={()=>{setSelected(provider);setQuery('');void load(provider,true);}} type="button">{copy.library}</button><button className="screen-tool" disabled={busy!==null||connecting!==null} onClick={()=>void disconnect(provider)} type="button">{copy.disconnect}</button></>:null}</div>
    </article>)}</div>
    <p className="accounts-security">{copy.credentials}</p><p role="status">{message}</p>
    <section className="account-library" aria-label={copy.library}>
      <header><h3>{names[selected]} <span>{active?.state==='ready'||active?.lastSynced?visibleGames.length:'—'} {active?.scope==='local'?copy.localGames:copy.owned}</span></h3><button className="screen-tool" disabled={!desktop||busy!==null||!statuses[selected]?.configured} onClick={()=>void load(selected,true)} type="button">{copy.sync}</button></header>
      {busy?<p role="status">{copy.loading}</p>:active?.state!=='ready'?<p>{copy[active?.state||'unconfigured']}</p>:null}
      {active?.lastSynced?<p className="account-library__sync">{copy.lastSync}: {new Date(active.lastSynced).toLocaleString(locale)}{active.cached?` · ${copy.cached}`:''}</p>:null}
      {visibleGames.length?<><input className="account-search" aria-label={copy.search} placeholder={copy.search} value={query} onChange={event=>setQuery(event.target.value)}/><ul>{filtered.map(game=>{
        const local=localGames.find(item=>selected==='steam'?String(item.steamAppId)===game.id:item.source===(selected==='epic'?'Epic Games':'GOG')&&item.title.toLocaleLowerCase()===game.title.toLocaleLowerCase());
        return <li key={game.id}><div><strong>{game.title}</strong><small>{local?.installed?copy.installed:copy.notInstalled}{game.playtimeMinutes!==undefined?` · ${Math.floor(game.playtimeMinutes/60)} h ${Math.floor(game.playtimeMinutes%60)} ${copy.minutes}`:''}</small></div>{local?<button className="screen-tool" type="button" onClick={()=>navigate(`/game/${local.id}`)}>{copy.open}</button>:null}</li>;
      })}</ul>{!filtered.length?<p>{copy.noResults}</p>:null}</>:active?.state==='ready'?<p>{copy.empty}</p>:null}
    </section>
    <Dialog.Root open={connectionDialog!==null} onOpenChange={open=>{if(!open)setConnectionDialog(null);}}><Dialog.Portal><Dialog.Overlay className="trailer-overlay"/><Dialog.Content className="account-dialog" onCloseAutoFocus={event=>{event.preventDefault();connectionTrigger.current?.focus();}}>
      <Dialog.Title>{connectionDialog?names[connectionDialog]:''}</Dialog.Title>
      <Dialog.Description>{connectionDialog?copy[connectionDialog]:''}</Dialog.Description>
      <Dialog.Close className="trailer-dialog__close" aria-label={copy.close}><X size={22}/></Dialog.Close>
      {connectionDialog==='steam'?<SteamAccountSettings locale={locale} onAccountChange={()=>{setSelected('steam');void statusesRefresh().catch(()=>setMessage(copy.error));void load('steam',true);}}/>:connectionDialog?<>
        <div className="console-profile-row"><span className="console-feature-icon"><Link size={28}/></span><div className="console-feature-copy"><h3>{names[connectionDialog]}</h3><p>{desktop?copy.signInHint:copy.desktop}</p></div></div>
        <div className="account-dialog__actions"><button className="console-pill" type="button" disabled={!desktop||connecting!==null||statuses[connectionDialog]?.storageAvailable===false} onClick={()=>void connect(connectionDialog)}><ArrowSquareOut size={18}/>{connecting===connectionDialog?copy.busy:copy.signIn}</button></div>
        {statuses[connectionDialog]?.storageAvailable===false?<p className="console-feedback" role="status">{copy['storage-unavailable']}</p>:null}
        {message?<p className="console-feedback" role="status">{message}</p>:null}
      </>:null}
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
