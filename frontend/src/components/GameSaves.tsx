import * as Dialog from '@radix-ui/react-dialog';
import {CloudArrowUp,X,ArrowCounterClockwise} from '@phosphor-icons/react';
import {useEffect,useRef,useState} from 'react';
import {savesCopy} from '../savesCopy';
import type {SavesScan,SavesStatus} from '../savesTypes';
import {SavesPluginCard} from './SavesPluginCard';

export function GameSaves({gameId,title,locale}:{gameId:string;title:string;locale:'fr'|'en'}){
 const copy=savesCopy[locale],api=window.nexusDesktop,trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false),[status,setStatus]=useState<SavesStatus>(),[scan,setScan]=useState<SavesScan>(),[confirmation,setConfirmation]=useState<SavesScan>(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const revision=useRef(0),confirmBack=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(confirmation)confirmBack.current?.focus();},[confirmation]);
 const action=async(task:()=>Promise<SavesScan>,kind:'scan'|'backup'|'preview'|'restore')=>{if(busy)return;const current=++revision.current;setBusy(true);setMessage('');try{const result=await task();if(current!==revision.current)return;if(kind==='preview')setConfirmation(result);else{setConfirmation(undefined);setScan(result);if(kind!=='scan'){setMessage(kind==='backup'?copy.success:copy.restored);setScan(await api!.inspectSaves(gameId));}}}catch(error){if(current===revision.current){const text=String(error);setMessage(text.includes('game-running')?copy.running:text.includes('no-saves')?copy.empty:text.includes('unknown-game')?copy.unknown:text.includes('choose-destination')?copy.noDestination:copy.error);setConfirmation(undefined);}}finally{if(current===revision.current)setBusy(false);}};
 const changeOpen=(value:boolean)=>{setOpen(value);revision.current++;setBusy(false);setConfirmation(undefined);setScan(undefined);setMessage('');};
 const ready=!!status?.enabled&&!!status.destination;
 return <><button ref={trigger} type="button" className="screen-tool" onClick={()=>changeOpen(true)}><CloudArrowUp size={16}/>{copy.saves}</button><Dialog.Root open={open} onOpenChange={changeOpen}><Dialog.Portal><Dialog.Overlay className="trailer-overlay"/><Dialog.Content className="account-dialog saves-dialog" aria-describedby={undefined} onCloseAutoFocus={event=>{event.preventDefault();trigger.current?.focus();}}><Dialog.Title>{copy.saves} · {title}</Dialog.Title><Dialog.Close className="trailer-dialog__close" aria-label={copy.close}><X size={22}/></Dialog.Close>{!confirmation&&<SavesPluginCard onChange={setStatus}/>}
 {!api?<p>{copy.desktop}</p>:ready?<>{!confirmation&&<><div className="capture-actions"><button disabled={busy||status?.busy} onClick={()=>void action(()=>api.inspectSaves(gameId),'scan')}><ArrowCounterClockwise/>{copy.scan}</button><button disabled={busy||status?.busy} onClick={()=>void action(()=>api.backupSaves(gameId),'backup')}><CloudArrowUp/>{copy.backup}</button></div><p className="saves-local">{copy.local}</p>
 {scan&&<p>{!scan.known?copy.unknown:scan.files||scan.registry?`${scan.files} ${copy.files} · ${scan.registry} ${copy.keys}`:copy.empty}</p>}</>}{busy&&<p role="status">{copy.loading}</p>}
 {confirmation?<div className="saves-confirm"><h3>{copy.confirm}</h3><p>{copy.confirmText}</p><p>{confirmation.files} {copy.files} · {confirmation.registry} {copy.keys}</p><div className="capture-actions"><button ref={confirmBack} disabled={busy} onClick={()=>setConfirmation(undefined)}>{copy.back}</button><button disabled={busy} onClick={()=>confirmation.token&&void action(()=>api.restoreSaves(confirmation.token!),'restore')}>{copy.confirm}</button></div></div>:scan?.known&&<div className="saves-versions"><h3>{copy.versions}</h3>{scan.versions?.length?scan.versions.map(version=><div key={version.id}><time dateTime={version.when}>{new Date(version.when).toLocaleString(locale)}</time><button className="screen-tool" disabled={busy} onClick={()=>void action(()=>api.previewRestore(gameId,version.id),'preview')}>{copy.restore}</button></div>):<p>{copy.none}</p>}</div>}</>:status?.enabled?<p>{copy.noDestination}</p>:<p>{copy.missing}</p>}
 {message&&<p role="status">{message}</p>}</Dialog.Content></Dialog.Portal></Dialog.Root></>;
}
