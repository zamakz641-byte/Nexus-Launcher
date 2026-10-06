import {useCallback,useEffect,useRef,useState} from 'react';
import type {SteamNotificationStatus} from '../steamConsoleCopy';
export function useSteamNotifications(visible=true){
  const desktop=window.nexusDesktop,alive=useRef(false),mounted=useRef(false),request=useRef(0);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const [status,setStatus]=useState<SteamNotificationStatus>(),[busy,setBusy]=useState(false);
  const refresh=useCallback(async()=>{if(!desktop?.getSteamNotificationStatus)return;const id=++request.current;try{const value=await desktop.getSteamNotificationStatus();if(alive.current&&id===request.current)setStatus(value);}catch{}},[desktop]);
  useEffect(()=>{alive.current=visible;if(!visible)return;void refresh();const timer=setInterval(()=>void refresh(),busy||status?.state==='downloading'||status?.state==='installing'?1200:10000);return()=>{alive.current=false;request.current++;clearInterval(timer);};},[refresh,visible,busy,status?.state]);
  const activate=async()=>{if(!desktop?.activateSteamNotifications||busy)return;setBusy(true);request.current++;try{const value=await desktop.activateSteamNotifications();request.current++;if(mounted.current)setStatus(value);}catch{if(mounted.current)setStatus(previous=>({...previous,enabled:false,installed:previous?.installed||false,supported:true,state:'error',progress:0}));}finally{if(mounted.current)setBusy(false);}};
  const disable=async()=>{if(!desktop)return;setBusy(true);try{await desktop.setSanCompanionEnabled(false);await refresh();}catch{if(mounted.current)setStatus(previous=>previous?{...previous,state:'error'}:undefined);}finally{if(mounted.current)setBusy(false);}};
  return {status,busy:busy||status?.state==='downloading'||status?.state==='installing',activate,disable,refresh,desktop};
}
