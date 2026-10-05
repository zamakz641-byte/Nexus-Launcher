// Steam reports unlocks asynchronously. Poll only during tracked game sessions.
export class AchievementMonitor {
  constructor(service, notify, {interval=30000, schedule=setTimeout, cancel=clearTimeout, now=Date.now, settings=async()=>({enabled:true,locale:'fr'})}={}) {
    Object.assign(this,{service,notify,interval,schedule,cancel,now,settings});this.watches=new Set();
  }
  start(game,session,locale) {
    const rawId=game?.steamMetadata?.appId || game?.metadata?.steamAppId || game?.steamAppId || (game?.platform==='Steam' ? game.storeId : undefined);
    const appId=Number(rawId);
    if(!Number.isInteger(appId)||appId<1)return {ready:Promise.resolve(),poll:async()=>{},stop:()=>{}};
    const started=this.now();let active=true,busy=false,timer,identity,baseline=null;
    const stop=()=>{active=false;this.cancel(timer);this.watches.delete(stop);session.removeListener('exit',stop);};
    const poll=async()=>{
      if(!active||busy)return;busy=true;this.cancel(timer);
      try {
        const prefs=await this.settings();const language=locale==='en'?'en':locale==='fr'?'fr':prefs.locale;const generation=this.service.generation;
        const account=await this.service.status();
        if(!active)return;
        const current=`${generation}:${account.steamId}`;
        if(current!==identity){identity=current;baseline=null;}
        if(!prefs.enabled||!account.configured){baseline=null;return;}
        const value=await this.service.getAchievements(appId,language,true);
        if(!active||generation!==this.service.generation||value.cached||!['ready','empty'].includes(value.state))return;
        const unlocked=new Set(value.achievements.filter(x=>x.unlocked).map(x=>x.id));
        if(baseline){
          const latest=await this.settings();
          if(!active||generation!==this.service.generation||!latest.enabled)return;
          for(const achievement of value.achievements){
            if(achievement.unlocked&&!baseline.has(achievement.id)&&(!achievement.unlockTime||achievement.unlockTime>=Math.floor(started/1000))){
              this.notify({gameTitle:String(game.title||'Steam'),achievement,locale:language});
            }
          }
        }
        baseline=new Set([...(baseline||[]),...unlocked]);
      }catch{/* Network or account errors are not evidence of an unlock. */}
      finally{busy=false;if(active){timer=this.schedule(poll,this.interval);timer?.unref?.();}}
    };
    this.watches.add(stop);session.once('exit',stop);
    return {ready:poll(),poll,stop};
  }
  stopAll(){for(const stop of [...this.watches])stop();}
}
