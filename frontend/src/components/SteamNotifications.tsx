import {BellRinging,CheckCircle,GearSix,Question,Spinner,Trophy} from '@phosphor-icons/react';
import {steamConsoleCopy} from '../steamConsoleCopy';
import {useSteamNotifications} from '../hooks/useSteamNotifications';
export function SteamNotifications({locale}:{locale:'fr'|'en'}){
  const c=steamConsoleCopy[locale],{status,busy,activate,disable,desktop}=useSteamNotifications();
  const active=status?.enabled&&status.installed&&status.state!=='error',installing=status?.state==='installing',downloading=status?.state==='downloading';
  return <section className="console-notifications" aria-label={c.notifications}>
    <div className="console-feature-row"><span className="console-feature-icon"><Trophy size={27} weight="duotone"/></span><div className="console-feature-copy"><h3>{c.notifications}</h3><p>{busy?installing?c.installing:`${c.downloading} ${status?.progress||0}%`:active?c.enabled:c.hint}</p></div>
      <button className="console-pill" type="button" disabled={!desktop?.activateSteamNotifications||busy} onClick={()=>void (active?disable():activate())} aria-label={active?c.disable:c.activate}>{busy?<Spinner className="console-spinner" size={20}/>:active?<CheckCircle size={20} weight="fill"/>:<BellRinging size={20}/>}<span>{busy?c.busy:active?c.enabled:status?.state==='error'?c.retry:c.activate}</span></button>
    </div>
    {downloading&&<div className="console-download-progress" role="progressbar" aria-label={c.downloading} aria-valuemin={0} aria-valuemax={100} aria-valuenow={status.progress}><span style={{width:`${status.progress}%`}}/></div>}
    {status?.state==='error'&&<p className="console-feedback" role="status">{c.failed}</p>}
    <div className="console-notification-tools">{active&&<button className="console-icon-action" type="button" aria-label={c.settings} onClick={()=>void desktop?.launchSanCompanion()}><GearSix size={19}/></button>}
      {downloading&&<button className="console-icon-action" type="button" onClick={()=>void desktop?.cancelSteamNotificationSetup()}>{c.cancel}</button>}
      <details className="console-help"><summary aria-label={c.help}><Question size={18}/></summary><p>{c.helpText}</p></details>
    </div>
  </section>;
}
