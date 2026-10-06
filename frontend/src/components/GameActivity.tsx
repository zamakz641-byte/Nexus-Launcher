import {ClockCounterClockwise} from '@phosphor-icons/react';
import {useEffect,useState} from 'react';
import type {GameActivityResult} from '../activityTypes';
const copy={fr:{title:'Dernières sessions',empty:'Lancez ce jeu avec Nexus pour suivre vos sessions.',running:'En cours',interrupted:'Session interrompue',unavailable:'Historique indisponible'},en:{title:'Recent sessions',empty:'Launch this game with Nexus to track your sessions.',running:'Playing now',interrupted:'Interrupted session',unavailable:'History unavailable'}};
export function GameActivity({gameId,locale}:{gameId:string;locale:'fr'|'en'}) {
  const desktop=window.nexusDesktop,c=copy[locale], [result,setResult]=useState<GameActivityResult>();
  useEffect(()=>{
    let alive=true,revision=0;setResult(undefined);
    const load=async()=>{const id=++revision;try{const value=await desktop?.getGameActivity?.(gameId);if(alive&&id===revision)setResult(value);}catch{if(alive&&id===revision)setResult({source:'Nexus',state:'unavailable',sessions:[]});}};
    void load();const remove=desktop?.onActivityChanged?.(id=>{if(id===gameId)void load();});
    return()=>{alive=false;remove?.();};
  },[desktop,gameId]);
  if(!desktop?.getGameActivity||!result)return null;
  const date=new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'});
  return <section className="game-activity" aria-label={c.title}><h3><ClockCounterClockwise size={19}/>{c.title}</h3>
    {result.state==='unavailable'?<p role="status">{c.unavailable}</p>:!result.sessions.length?<p>{c.empty}</p>:<ul>{result.sessions.slice(0,5).map(session=><li key={session.sessionId}><time dateTime={session.startedAt}>{date.format(new Date(session.startedAt))}</time><strong>{session.state==='running'?c.running:session.durationSeconds===null?c.interrupted:`${Math.floor(session.durationSeconds/3600)} h ${Math.floor(session.durationSeconds%3600/60)} min`}</strong></li>)}</ul>}
  </section>;
}
