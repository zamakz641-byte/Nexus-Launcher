import { FilmStrip, DownloadSimple, Power, Trash, X } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { captureCopy } from '../captureCopy';
import type { CaptureEngineStatus } from '../captureTypes';
import { useNexusStore } from '../state/useNexusStore';

export function ReplayPluginCard({onStatus}:{onStatus?:(status:CaptureEngineStatus)=>void}){
 const locale=useNexusStore(state=>state.locale),copy=captureCopy[locale==='fr'?'fr':'en'],api=window.nexusDesktop;
 const [status,setStatus]=useState<CaptureEngineStatus>(),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 const alive=useRef(false),revision=useRef(0),notify=useRef(onStatus);notify.current=onStatus;
 const load=useCallback(async()=>{if(!api)return;const version=++revision.current;try{const next=await api.getCaptureEngineStatus();if(alive.current&&revision.current===version){setStatus(next);notify.current?.(next);}}catch{/* Offline gallery stays usable. */}},[api]);
 const progress=status?.state==='downloading'||status?.state==='installing';
 useEffect(()=>{alive.current=true;void load();const timer=window.setInterval(()=>{if(!document.hidden)void load();},progress?1200:10000);return()=>{alive.current=false;revision.current++;window.clearInterval(timer);};},[load,progress]);
 const run=async(action:()=>Promise<unknown>,install=false)=>{if(busy)return;setBusy(true);setError(false);if(install)setStatus(previous=>({...previous,installed:false,enabled:false,supported:true,state:'downloading'}));try{const result=await action() as CaptureEngineStatus;if(result?.state==='error')throw Error('plugin');}catch{if(alive.current)setError(true);}finally{if(alive.current){setBusy(false);await load();}}};
 const size=(bytes:number)=>new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(bytes/1000000)+' MB';
 const state=progress? `${status.state==='installing'?copy.installing:copy.downloading} ${status.progress??0}%`:status?.recording?copy.recording:status?.enabled?(status.bufferState===1?copy.waiting:copy.ready):copy.engineHint;
 return <article className="nexus-plugin-card"><div className="nexus-plugin-symbol"><FilmStrip weight="duotone" /></div><div className="nexus-plugin-heading"><h2>{copy.engine}</h2><p><i data-recording={status?.recording||false}/>{state}</p>{status?.downloadBytes?<small>{size(status.downloadBytes)} · {size(status.installedBytes||0)} {copy.disk}</small>:<small>{copy.sizePending}</small>}</div><div className="capture-actions">
 {progress?<button disabled={status.state==='installing'} onClick={()=>api&&void api.cancelCaptureEngineSetup().then(load).catch(()=>setError(true))}><X/>{copy.cancel}</button>:<button disabled={!api||busy||status?.supported===false||(!status?.installed&&!status?.available)} onClick={()=>api&&void run(()=>status?.enabled?api.disableCaptureEngine():api.activateCaptureEngine(),!status?.installed)}>{status?.enabled?<Power/>:<DownloadSimple/>}{status?.enabled?copy.disable:status?.installed?copy.enable:status?.available?copy.install:copy.pending}</button>}
 {status?.installed&&!progress&&<button className="plugin-remove" disabled={busy} aria-label={copy.remove} title={copy.remove} onClick={()=>api&&void run(()=>api.removeCaptureEngine())}><Trash/></button>}
 </div>{progress&&<progress max="100" value={status.progress||0} aria-label={copy.downloading}/>}<details><summary>{copy.help}</summary><p>{copy.helpText}</p><a href="https://github.com/zamakz641-byte/Nexus-Launcher/tree/main/plugins/nexus-replay" target="_blank" rel="noreferrer">{copy.source}</a></details>{error&&<p className="plugin-error" role="alert">{copy.error}</p>}</article>;
}
