import { Clock } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { accountsCopy } from '../accountsCopy';
export function SteamPlaytime({appId,locale}:{appId?:number;locale:'fr'|'en'}) {
  const [minutes,setMinutes] = useState<number>();
  useEffect(()=>{
    let alive=true;setMinutes(undefined);
    if(appId && window.nexusDesktop)void window.nexusDesktop.getSteamLibrary().then(result=>{if(alive && (result.state==='ready'||result.state==='offline'))setMinutes(result.games.find(game=>game.id===String(appId))?.playtimeMinutes);}).catch(()=>{});
    return ()=>{alive=false;};
  },[appId]);
  return minutes===undefined?null:<div><Clock size={22}/><span><small>{accountsCopy[locale].playtime}</small><strong>{Math.floor(minutes/60)} h {Math.floor(minutes%60)} {accountsCopy[locale].minutes}</strong></span></div>;
}
