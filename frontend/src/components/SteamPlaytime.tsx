import { Clock } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { steamConsoleCopy } from '../steamConsoleCopy';
import { accountsCopy } from '../accountsCopy';
import type { StoreLibraryResult } from '../storeAccountsTypes';
export function SteamPlaytime({appId,locale}:{appId?:number;locale:'fr'|'en'}) {
  const desktop=window.nexusDesktop,copy=accountsCopy[locale],c=steamConsoleCopy[locale];
  const [result,setResult]=useState<StoreLibraryResult>(),[loading,setLoading]=useState(false);const generation=useRef(0);
  const load=useCallback(async(force=false)=>{
    if(!appId||!desktop)return;const revision=++generation.current;setLoading(true);
    try{const value=await desktop.getSteamLibrary(force);if(revision===generation.current)setResult(value);}
    catch{if(revision===generation.current)setResult({source:'Steam',state:'error',games:[],lastSynced:null,cached:false});}
    finally{if(revision===generation.current)setLoading(false);}
  },[appId,desktop]);
  useEffect(()=>{setResult(undefined);void load();const unsubscribe=desktop?.onSteamDataChanged?.(()=>void load());return()=>{generation.current++;unsubscribe?.();};},[load,desktop]);
  if(!appId||!desktop)return null;
  const minutes=result?.games.find(game=>game.id===String(appId))?.playtimeMinutes;
  const setup=result?.state==='unconfigured';
  const message=result?.state==='ready'?c.unavailable:result?copy[result.state as keyof typeof copy]:copy.loading;
  return <div className="steam-playtime"><Clock size={22}/><span><small>{copy.playtime}</small>
    {minutes!==undefined?<strong>{Math.floor(minutes/60)} h {Math.floor(minutes%60)} {copy.minutes}</strong>:<small role="status">{loading?copy.loading:message}</small>}
    {result?.cached?<small>{copy.cached}</small>:null}
    {setup?<Link to="/settings?section=accounts">{c.open}</Link>:null}
    <button className="steam-playtime__refresh" type="button" disabled={loading} onClick={()=>void load(true)} aria-label={c.refresh}>{copy.sync}</button>
  </span></div>;
}
