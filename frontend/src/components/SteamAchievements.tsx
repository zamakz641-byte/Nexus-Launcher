import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { steamLoginCopy } from '../steamLoginCopy';
import { accountsCopy } from '../accountsCopy';
import { steamAchievementsCopy } from '../steamAchievementsI18n';
import type { SteamAccountStatus, SteamAchievementResult } from '../steamAchievementsTypes';

export function SteamAccountSettings({locale,onAccountChange}:{locale:'fr'|'en';onAccountChange?:()=>void}) {
  const copy=steamAchievementsCopy[locale], login=steamLoginCopy[locale], desktop=window.nexusDesktop;
  const [status,setStatus]=useState<SteamAccountStatus>();
  const [steamId,setSteamId]=useState(''),[apiKey,setApiKey]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const alive=useRef(true),browserPending=useRef(false);
  const apply=(value:SteamAccountStatus)=>{setStatus(value);setSteamId(value.steamId?`https://steamcommunity.com/profiles/${value.steamId}`:'');};
  useEffect(()=>{
    alive.current=true;
    void desktop?.getSteamAccountStatus().then(value=>{if(alive.current)apply(value);}).catch(()=>{if(alive.current)setError(copy.failure);});
    return()=>{alive.current=false;if(browserPending.current)void desktop?.cancelSteamConnection().catch(()=>{});};
  },[desktop]);
  const browserLogin=async()=>{
    if(!desktop)return;setBusy(true);setError('');browserPending.current=true;
    try {
      const result=await desktop.connectSteamAccount();
      if(!alive.current)return;
      apply(result);
      if(result.error)setError(login[result.error as keyof typeof login]||copy.failure);
      else onAccountChange?.();
    }catch{if(alive.current)setError(copy.failure);}
    finally{browserPending.current=false;if(alive.current)setBusy(false);}
  };
  const save=async()=>{
    if(!desktop)return;setBusy(true);setError('');
    try{const result=await desktop.saveSteamAccount({steamId,apiKey});if(alive.current){setStatus(result);if(result.error)setError(result.error==='offline'?copy.offlineAccount:result.error==='invalid-key'?copy.keyInvalid:copy.invalid);}if(!result.error)onAccountChange?.();}
    catch{if(alive.current)setError(copy.failure);}finally{if(alive.current){setApiKey('');setBusy(false);}}
  };
  const clear=async()=>{if(!desktop)return;setBusy(true);try{const value=await desktop.clearSteamAccount();if(alive.current){apply(value);setApiKey('');setError('');}onAccountChange?.();}catch{if(alive.current)setError(copy.failure);}finally{if(alive.current)setBusy(false);}};
  return <section className="steam-account-settings" aria-label={copy.account}>
    {!desktop?<p>{copy.desktop}</p>:<>
      <p>{login.intro}</p>
      <button className="steam-browser-action" type="button" disabled={busy||status?.storageAvailable===false} onClick={()=>void browserLogin()}>{busy&&browserPending.current?login.wait:login.browser}</button>
      {busy&&browserPending.current?<button className="settings-inline-action" type="button" onClick={()=>void desktop.cancelSteamConnection()}>{login.cancel}</button>:null}
      {status?.linked||status?.configured?<p className="steam-link-confirmation">{login.linked}{status.configured?` · ${login.syncReady}`:''}</p>:null}
      <div className="steam-sync-setup"><h3>{login.syncTitle}</h3><p>{login.difference}</p>
        <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noreferrer">{copy.keyLink}</a>
        <label>{copy.apiKey}<input aria-label={copy.apiKey} type="password" autoComplete="off" spellCheck={false} maxLength={32} value={apiKey} onChange={event=>setApiKey(event.target.value)} disabled={busy||status?.storageAvailable===false}/></label>
        <p>{copy.privacyStep}</p>
        <button className="settings-inline-action" type="button" disabled={busy||!steamId||!apiKey||status?.storageAvailable===false} onClick={()=>void save()}>{busy?copy.busy:copy.connect}</button>
      </div>
      <details className="steam-manual-profile"><summary>{login.manual}</summary><p>{copy.profileStep}</p><label>{copy.steamId}<input aria-label={copy.steamId} autoComplete="off" spellCheck={false} placeholder={copy.profilePlaceholder} maxLength={2048} value={steamId} onChange={event=>setSteamId(event.target.value)} disabled={busy}/></label></details>
      {status?.linked||status?.configured?<button className="settings-inline-action" type="button" disabled={busy} onClick={()=>void clear()}>{copy.disconnect}</button>:null}
      {status?.configured?<details><summary>{copy.advanced}</summary><p>SteamID64 · {status.steamId}</p></details>:null}
      <p role="status">{status?.storageAvailable===false?copy.storage:error}</p>
    </>}
  </section>;
}

export function SteamAchievements({appId,locale}:{appId?:number;locale:'fr'|'en'}) {
  const copy = steamAchievementsCopy[locale], desktop = window.nexusDesktop;
  const [result,setResult] = useState<SteamAchievementResult>(), [loading,setLoading] = useState(false);
  const requestGeneration = useRef(0);
  useEffect(() => {
    const generation = ++requestGeneration.current; setResult(undefined);
    if (desktop && appId) {setLoading(true); void desktop.getSteamAchievements(appId,locale,false).then(value => {if(generation === requestGeneration.current)setResult(value);}).catch(() => {if(generation === requestGeneration.current)setResult({source:'Steam',state:'error',lastSynced:null,cached:false,achievements:[]});}).finally(() => {if(generation === requestGeneration.current)setLoading(false);});}
    else setLoading(false);
    return () => {requestGeneration.current++;};
  },[desktop,appId,locale]);
  const refresh = async () => {
    if (!desktop || !appId) return;
    const generation = ++requestGeneration.current; setLoading(true);
    try {const value = await desktop.getSteamAchievements(appId,locale,true);if(generation === requestGeneration.current)setResult(value);}
    catch {if(generation === requestGeneration.current)setResult(previous => ({source:'Steam',lastSynced:null,cached:false,achievements:[],...previous,state:'error'}));}
    finally {if(generation === requestGeneration.current)setLoading(false);}
  };
  const date = (value:string|number) => new Date(typeof value === 'number' ? value*1000 : value).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB');
  return <section className="steam-achievements" aria-label={copy.title}><div className="steam-achievements__header"><h3>{copy.title}</h3>{desktop && appId && <button className="screen-tool" type="button" disabled={loading} onClick={() => void refresh()}>{copy.refresh}</button>}</div><p role="status">{!desktop ? copy.desktop : !appId ? copy.unsupported : loading ? copy.loading : result ? copy[result.state] : copy.loading}</p>{(result?.state === 'unconfigured' || result?.state === 'key-required') ? <Link className="screen-tool" to="/settings?section=accounts">{accountsCopy[locale].settings}</Link> : null}{result && <><p className="steam-achievements__sync">Steam · {copy.lastSync}: {result.lastSynced ? date(result.lastSynced) : copy.never}{result.cached ? ` · ${copy.cached}` : ''}</p>{result.achievements.length > 0 && <><p className="steam-achievements__count">{result.achievements.filter(item => item.unlocked).length} / {result.achievements.length}</p><ul className="steam-achievements__list">{result.achievements.map(item => <li key={item.id} className={item.unlocked ? 'is-unlocked' : ''}>{item.icon && <img src={item.icon} alt="" width={48} height={48} loading="lazy" onError={event => {event.currentTarget.hidden=true;}} />}<div><strong>{item.hidden && !item.unlocked ? copy.hidden : item.title}</strong>{item.description && <p>{item.description}</p>}<span>{item.unlocked ? copy.unlocked : copy.locked}{item.unlockTime ? ` · ${date(item.unlockTime)}` : ''}</span></div></li>)}</ul></>}</>}</section>;
}
