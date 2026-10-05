import {useEffect,useRef,useState} from 'react';
type Status={enabled:boolean;installed:boolean;executable:string;supported:boolean};
export function SanCompanionSettings({locale}:{locale:'fr'|'en'}){
  const desktop=window.nexusDesktop,fr=locale==='fr',generation=useRef(0);
  const [status,setStatus]=useState<Status>(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{const id=++generation.current;setBusy(false);void desktop?.getSanCompanionStatus?.().then(value=>{if(id===generation.current)setStatus(value);}).catch(()=>{if(id===generation.current)setMessage(fr?'Détection indisponible.':'Detection unavailable.');});return()=>{generation.current++;};},[desktop,fr]);
  const action=async(task:()=>Promise<Status|{state:string}>)=>{
    const id=generation.current;setBusy(true);setMessage('');
    try{const value=await task();if(id!==generation.current)return;
      if('enabled' in value)setStatus(value);
      else setMessage(value.state==='running'?(fr?'SAN lancé. Choisissez son style de notification dans SAN.':'SAN launched. Choose your notification style in SAN.'):(fr?'SAN n’a pas pu démarrer. Vérifiez son installation.':'SAN could not start. Check its installation.'));
    }catch{if(id===generation.current)setMessage(fr?'Action impossible. Sélectionnez l’application SAN installée, pas son installateur.':'Action failed. Select the installed SAN application, not its installer.');}
    finally{if(id===generation.current)setBusy(false);}
  };
  if(!desktop?.getSanCompanionStatus)return null;
  return <section className="achievement-notification-settings san-companion-settings" aria-label="Steam Achievement Notifier">
    <h3>Steam Achievement Notifier</h3>
    <p>{fr?'Notifications en direct via Steam, sans clé API. SAN reste une application séparée : Steam doit être ouvert et connecté. Personnalisez ses animations, sons et thèmes dans SAN.':'Live notifications through Steam, without an API key. SAN remains a separate application: Steam must be running and signed in. Customize animations, sounds and themes inside SAN.'}</p>
    <p role="status">{!status?(fr?'Recherche de SAN…':'Looking for SAN…'):!status.supported?(fr?'Disponible sur Windows.':'Available on Windows.'):status.installed?(fr?'SAN installé et détecté.':'Installed SAN detected.'):(fr?'Installez SAN depuis sa page officielle, puis cliquez sur Détecter.':'Install SAN from its official page, then click Detect.')}</p>
    <div className="san-companion-actions">
      <button type="button" className="settings-inline-action" onClick={()=>void desktop.openSanDownload()}>{fr?'Télécharger SAN':'Download SAN'}</button>
      <button type="button" className="settings-inline-action" disabled={busy} onClick={()=>void action(()=>desktop.getSanCompanionStatus())}>{fr?'Détecter':'Detect'}</button>
      <button type="button" className="settings-inline-action" disabled={busy||status?.supported===false} onClick={()=>void action(()=>desktop.chooseSanExecutable())}>{fr?'Choisir SAN (.exe)':'Choose SAN (.exe)'}</button>
      <button type="button" className="settings-inline-action" disabled={busy||!status?.installed||!status.enabled} onClick={()=>void action(()=>desktop.launchSanCompanion())}>{fr?'Ouvrir SAN':'Open SAN'}</button>
    </div>
    {status?.installed&&<label><input type="checkbox" checked={status.enabled} disabled={busy} onChange={event=>{const value=event.target.checked;void action(()=>desktop.setSanCompanionEnabled(value));}}/>{fr?'Lancer SAN avant mes jeux Steam':'Start SAN before my Steam games'}</label>}
    <p>{fr?'Lorsque SAN est activé, Nexus lui confie les notifications pour les prochains lancements. Les heures et l’historique des succès dans Nexus nécessitent toujours la synchronisation Steam. Utilisez le mode fenêtré ou sans bordures pour l’affichage en jeu.':'When enabled, SAN handles notifications for subsequent launches. Playtime and achievement history inside Nexus still require Steam synchronization. Use windowed or borderless mode for in-game notifications.'}</p>
    {message&&<p role="status">{message}</p>}
  </section>;
}
