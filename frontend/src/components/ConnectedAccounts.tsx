import * as Dialog from '@radix-ui/react-dialog';
import { Link, X } from '@phosphor-icons/react';
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
  const [steamOpen,setSteamOpen] = useState(false);
  const [busy,setBusy] = useState<Provider|null>(null);
  const [results,setResults] = useState<Partial<Record<Provider,StoreLibraryResult>>>({});
  const [message,setMessage] = useState(''), [query,setQuery] = useState('');
  const generation = useRef(0);
  const steamTrigger = useRef<HTMLButtonElement>(null);
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
    const values = await Promise.all([desktop.getSteamAccountStatus(),desktop.getStoreAccountStatus('epic'),desktop.getStoreAccountStatus('gog')]);
    setStatuses({steam:values[0],epic:values[1],gog:values[2]});
  };
  useEffect(() => {
    let alive=true;
    if(desktop)void Promise.all([desktop.getSteamAccountStatus(),desktop.getStoreAccountStatus('epic'),desktop.getStoreAccountStatus('gog')]).then(values=>{if(alive)setStatuses({steam:values[0],epic:values[1],gog:values[2]});}).catch(()=>{if(alive)setMessage(copy.error);});
    return ()=>{alive=false;generation.current++;};
  },[desktop]);
  useEffect(()=>{if(busy===null)void load(selected);},[selected,desktop]);
  const connect = async (provider:Provider) => {
    setQuery('');
    if(provider==='steam'){setSelected(provider);setSteamOpen(true);return;}
    if(!desktop)return;
    const revision=++generation.current;setBusy(provider);setMessage('');
    try {
      const status=await desktop.connectStoreAccount(provider);
      if(revision!==generation.current)return;
      setStatuses(previous=>({...previous,[provider]:status}));
      setSelected(provider);
      if(status.error)setMessage(copy[status.error as keyof typeof copy]||copy.error);
      if(status.configured && !status.error)await load(provider,true);
    }catch{if(revision===generation.current)setMessage(copy.error);}
    finally{if(revision===generation.current)setBusy(null);}
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
  const filtered=active?.games.filter(game=>game.title.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)))||[];
  return <div className="connected-accounts">
    <p className="accounts-intro">{copy.subtitle}</p>
    {!desktop?<p role="status">{copy.desktop}</p>:null}
    <div className="account-cards">{(['steam','epic','gog'] as const).map(provider=><article className="account-card" key={provider} data-selected={provider===selected}>
      <div className="account-card__heading"><strong>{names[provider]}</strong><span data-connected={Boolean((statuses[provider]?.configured || (provider==='steam' && (statuses.steam as SteamAccountStatus|undefined)?.linked)))}>{(statuses[provider]?.configured || (provider==='steam' && (statuses.steam as SteamAccountStatus|undefined)?.linked))?copy.connected:copy.notConnected}</span></div>
      <p>{copy[provider]}</p>{statuses[provider]?.storageAvailable===false?<p role="status">{copy['storage-unavailable']}</p>:null}
      <div className="account-card__actions"><button ref={provider==='steam'?steamTrigger:undefined} className="screen-tool" disabled={!desktop||busy!==null||statuses[provider]?.storageAvailable===false} onClick={()=>void connect(provider)} type="button"><Link size={16}/>{busy===provider?copy.busy:(statuses[provider]?.configured || (provider==='steam' && (statuses.steam as SteamAccountStatus|undefined)?.linked))?copy.manage:`${copy.connect} ${names[provider]}`}</button>
      {(statuses[provider]?.configured || (provider==='steam' && (statuses.steam as SteamAccountStatus|undefined)?.linked))?<><button className="screen-tool" disabled={busy!==null} onClick={()=>{setSelected(provider);setQuery('');void load(provider,true);}} type="button">{copy.library}</button><button className="screen-tool" disabled={busy!==null} onClick={()=>void disconnect(provider)} type="button">{copy.disconnect}</button></>:null}</div>
    </article>)}</div>
    <p className="accounts-security">{copy.credentials}</p><p role="status">{message}</p>
    <section className="account-library" aria-label={copy.library}>
      <header><h3>{names[selected]} <span>{active?.state==='ready'||active?.lastSynced?active.games.length:'—'} {copy.owned}</span></h3><button className="screen-tool" disabled={!desktop||busy!==null||!statuses[selected]?.configured} onClick={()=>void load(selected,true)} type="button">{copy.sync}</button></header>
      {busy?<p role="status">{copy.loading}</p>:active?.state!=='ready'?<p>{copy[active?.state||'unconfigured']}</p>:null}
      {active?.lastSynced?<p className="account-library__sync">{copy.lastSync}: {new Date(active.lastSynced).toLocaleString(locale)}{active.cached?` · ${copy.cached}`:''}</p>:null}
      {active?.games.length?<><input className="account-search" aria-label={copy.search} placeholder={copy.search} value={query} onChange={event=>setQuery(event.target.value)}/><ul>{filtered.map(game=>{
        const local=localGames.find(item=>selected==='steam'?String(item.steamAppId)===game.id:item.source===(selected==='epic'?'Epic Games':'GOG')&&item.title.toLocaleLowerCase()===game.title.toLocaleLowerCase());
        return <li key={game.id}><div><strong>{game.title}</strong><small>{local?.installed?copy.installed:copy.notInstalled}{game.playtimeMinutes!==undefined?` · ${Math.floor(game.playtimeMinutes/60)} h ${Math.floor(game.playtimeMinutes%60)} ${copy.minutes}`:''}</small></div>{local?<button className="screen-tool" type="button" onClick={()=>navigate(`/game/${local.id}`)}>{copy.open}</button>:null}</li>;
      })}</ul>{!filtered.length?<p>{copy.noResults}</p>:null}</>:active?.state==='ready'?<p>{copy.empty}</p>:null}
    </section>
    <Dialog.Root open={steamOpen} onOpenChange={setSteamOpen}><Dialog.Portal><Dialog.Overlay className="trailer-overlay"/><Dialog.Content className="account-dialog" onCloseAutoFocus={event=>{event.preventDefault();steamTrigger.current?.focus();}}><Dialog.Title>{names.steam}</Dialog.Title><Dialog.Description>{copy.steam}</Dialog.Description><Dialog.Close className="trailer-dialog__close" aria-label={copy.close}><X size={22}/></Dialog.Close><SteamAccountSettings locale={locale} onAccountChange={()=>{void statusesRefresh().catch(()=>setMessage(copy.error));void load('steam',true);}}/></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
