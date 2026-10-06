import { useEffect, useRef, useState } from 'react';
import { SteamNotifications } from './SteamNotifications';
import { steamConsoleCopy } from '../steamConsoleCopy';
import { SteamLogo, ArrowSquareOut } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { accountsCopy } from '../accountsCopy';
import { steamAchievementsCopy } from '../steamAchievementsI18n';
import type { SteamAccountStatus, SteamAchievementResult } from '../steamAchievementsTypes';

export function SteamAccountSettings({locale,onAccountChange}:{locale:'fr'|'en';onAccountChange?:()=>void}) {
  const c=steamConsoleCopy[locale],desktop=window.nexusDesktop;
  const [status,setStatus]=useState<SteamAccountStatus>(),[busy,setBusy]=useState(false),[error,setError]=useState('');const alive=useRef(true);
  useEffect(()=>{alive.current=true;void desktop?.getSteamAccountStatus().then(value=>{if(alive.current)setStatus(value);}).catch(()=>{});return()=>{alive.current=false;};},[desktop]);
  const connect=async()=>{if(!desktop)return;setBusy(true);setError('');try{const value=await desktop.connectSteamAccount();if(alive.current){setStatus(value);onAccountChange?.();}}catch{if(alive.current)setError(c.steamMissing);}finally{if(alive.current)setBusy(false);}};
  return <section className="steam-account-settings console-steam" aria-label={c.profile}>
    <div className="console-profile-row"><span className="console-feature-icon console-steam-mark"><SteamLogo size={32} weight="fill"/></span><div className="console-feature-copy"><h3>Steam</h3><p>{status?.linked?c.linked:desktop?c.unlinked:c.desktop}</p></div><button type="button" className="console-pill" disabled={busy||!desktop} onClick={()=>void connect()}><ArrowSquareOut size={18}/>{busy?c.busy:c.open}</button></div>
    <SteamNotifications locale={locale}/>{error&&<p className="console-feedback" role="status">{error}</p>}
  </section>;
}

export function SteamAchievements({appId,locale}:{appId?:number;locale:'fr'|'en'}) {
  const copy = steamAchievementsCopy[locale], c=steamConsoleCopy[locale], desktop = window.nexusDesktop;
  const [result,setResult] = useState<SteamAchievementResult>(), [loading,setLoading] = useState(false);
  const requestGeneration = useRef(0);
  useEffect(() => {
    const generation = ++requestGeneration.current; setResult(undefined);
    if (desktop && appId) {setLoading(true); void desktop.getSteamAchievements(appId,locale,false).then(value => {if(generation === requestGeneration.current)setResult(value);}).catch(() => {if(generation === requestGeneration.current)setResult({source:'Steam',state:'error',lastSynced:null,cached:false,achievements:[]});}).finally(() => {if(generation === requestGeneration.current)setLoading(false);});}
    else setLoading(false);
    const unsubscribe=desktop?.onSteamDataChanged?.(()=>{
      if(!appId)return;const next=++requestGeneration.current;setLoading(true);
      void desktop.getSteamAchievements(appId,locale,true).then(value=>{if(next===requestGeneration.current)setResult(value);}).catch(()=>{if(next===requestGeneration.current)setResult({source:'Steam',state:'error',lastSynced:null,cached:false,achievements:[]});}).finally(()=>{if(next===requestGeneration.current)setLoading(false);});
    });
    return () => {requestGeneration.current++;unsubscribe?.();};
  },[desktop,appId,locale]);
  const refresh = async () => {
    if (!desktop || !appId) return;
    const generation = ++requestGeneration.current; setLoading(true);
    try {const value = await desktop.getSteamAchievements(appId,locale,true);if(generation === requestGeneration.current)setResult(value);}
    catch {if(generation === requestGeneration.current)setResult(previous => ({source:'Steam',lastSynced:null,cached:false,achievements:[],...previous,state:'error'}));}
    finally {if(generation === requestGeneration.current)setLoading(false);}
  };
  const date = (value:string|number) => new Date(typeof value === 'number' ? value*1000 : value).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB');
  return <section className="steam-achievements" aria-label={copy.title}><div className="steam-achievements__header"><h3>{copy.title}</h3>{desktop && appId && <button className="screen-tool" type="button" disabled={loading} onClick={() => void refresh()}>{copy.refresh}</button>}</div><p role="status">{!desktop ? copy.desktop : !appId ? copy.unsupported : loading ? copy.loading : result ? copy[result.state] : copy.loading}</p>{(result?.state === 'unconfigured') ? <Link className="screen-tool" to="/settings?section=accounts">{accountsCopy[locale].settings}</Link> : null}{result && <><p className="steam-achievements__sync">Steam · {copy.lastSync}: {result.lastSynced ? date(result.lastSynced) : copy.never}{result.cached ? ` · ${copy.cached}` : ''}</p>{(result.total !== undefined || result.achievements.length > 0) && <><p className="steam-achievements__count">{result.unlockedCount??result.achievements.filter(item => item.unlocked).length} / {result.total??result.achievements.length}</p>{result.local&&<p className="steam-achievements__sync">{c.partial}</p>}<ul className="steam-achievements__list">{result.achievements.map(item => <li key={item.id} className={item.unlocked ? 'is-unlocked' : ''}>{item.icon && <img src={item.icon} alt="" width={48} height={48} loading="lazy" onError={event => {event.currentTarget.hidden=true;}} />}<div><strong>{item.hidden && !item.unlocked ? copy.hidden : item.title}</strong>{item.description && <p>{item.description}</p>}<span>{item.unlocked ? copy.unlocked : copy.locked}{item.unlockTime ? ` · ${date(item.unlockTime)}` : ''}</span></div></li>)}</ul></>}</>}</section>;
}
