import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { accountsCopy } from '../accountsCopy';
import { steamAchievementsCopy } from '../steamAchievementsI18n';
import type { SteamAccountStatus, SteamAchievementResult } from '../steamAchievementsTypes';

export function SteamAccountSettings({locale,onAccountChange}:{locale:'fr'|'en';onAccountChange?:()=>void}) {
  const copy = steamAchievementsCopy[locale], desktop = window.nexusDesktop;
  const [status,setStatus] = useState<SteamAccountStatus>();
  const [steamId,setSteamId] = useState(''), [apiKey,setApiKey] = useState(''), [busy,setBusy] = useState(false), [error,setError] = useState('');
  useEffect(() => { let alive = true; void desktop?.getSteamAccountStatus().then(value => {if (alive) {setStatus(value);setSteamId(value.steamId ? `https://steamcommunity.com/profiles/${value.steamId}` : '');}}).catch(() => {if(alive)setError('failure');}); return () => {alive=false;}; },[desktop]);
  const save = async () => {
    if (!desktop) return; setBusy(true); setError('');
    try { const result = await desktop.saveSteamAccount({steamId,apiKey}); setStatus(result); if(!result.error)onAccountChange?.(); if(result.error)setError(({ 'invalid-input':'invalid', 'storage-unavailable':'storage', 'offline':'offlineAccount', 'invalid-account':'accountMissing', 'invalid-key':'keyInvalid' } as Record<string,string>)[result.error] || 'failure'); }
    catch {setError('failure');} finally {setApiKey('');setBusy(false);}
  };
  const clear = async () => {if(!desktop)return; setBusy(true);try {setStatus(await desktop.clearSteamAccount());onAccountChange?.();setSteamId('');setApiKey('');setError('');} catch {setError('failure');}finally {setBusy(false);}};
  return <section className="steam-account-settings" aria-label={copy.account}>
    <h3>{copy.account}</h3>
    {!desktop ? <p>{copy.desktop}</p> : <>
      <p>{copy.explanation}</p>
      <ol className="steam-account-settings__guide"><li>{copy.profileStep}</li><li>{copy.keyStep} <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noreferrer">{copy.keyLink}</a></li><li>{copy.privacyStep}</li></ol>
      {status?.configured && <><p>{copy.connected} · Steam</p><details><summary>{copy.advanced}</summary><p>SteamID64 · {status.steamId}</p></details></>}
      <div className="steam-account-settings__fields">
        <label>{copy.steamId}<input aria-label={copy.steamId} autoComplete="off" spellCheck={false} placeholder={copy.profilePlaceholder} maxLength={2048} value={steamId} onChange={event => setSteamId(event.target.value)} disabled={busy} /></label>
        <label>{copy.apiKey}<input aria-label={copy.apiKey} type="password" autoComplete="off" spellCheck={false} maxLength={32} value={apiKey} onChange={event => setApiKey(event.target.value)} disabled={busy || status?.storageAvailable === false} /></label>
      </div>
      <div className="steam-account-settings__actions"><button className="settings-inline-action" type="button" disabled={busy || !steamId || !apiKey || status?.storageAvailable === false} onClick={() => void save()}>{busy ? copy.busy : status?.configured ? copy.replace : copy.connect}</button>{status?.configured && <button className="settings-inline-action" type="button" disabled={busy} onClick={() => void clear()}>{copy.disconnect}</button>}</div>
      <p role="status">{status?.storageAvailable === false ? copy.storage : error ? copy[error as 'invalid'|'storage'|'failure'|'offlineAccount'|'accountMissing'|'keyInvalid'] : ''}</p>
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
  return <section className="steam-achievements" aria-label={copy.title}><div className="steam-achievements__header"><h3>{copy.title}</h3>{desktop && appId && <button className="screen-tool" type="button" disabled={loading} onClick={() => void refresh()}>{copy.refresh}</button>}</div><p role="status">{!desktop ? copy.desktop : !appId ? copy.unsupported : loading ? copy.loading : result ? copy[result.state] : copy.loading}</p>{result?.state === 'unconfigured' ? <Link className="screen-tool" to="/settings?section=accounts">{accountsCopy[locale].settings}</Link> : null}{result && <><p className="steam-achievements__sync">Steam · {copy.lastSync}: {result.lastSynced ? date(result.lastSynced) : copy.never}{result.cached ? ` · ${copy.cached}` : ''}</p>{result.achievements.length > 0 && <><p className="steam-achievements__count">{result.achievements.filter(item => item.unlocked).length} / {result.achievements.length}</p><ul className="steam-achievements__list">{result.achievements.map(item => <li key={item.id} className={item.unlocked ? 'is-unlocked' : ''}>{item.icon && <img src={item.icon} alt="" width={48} height={48} loading="lazy" onError={event => {event.currentTarget.hidden=true;}} />}<div><strong>{item.hidden && !item.unlocked ? copy.hidden : item.title}</strong>{item.description && <p>{item.description}</p>}<span>{item.unlocked ? copy.unlocked : copy.locked}{item.unlockTime ? ` · ${date(item.unlockTime)}` : ''}</span></div></li>)}</ul></>}</>}</section>;
}
