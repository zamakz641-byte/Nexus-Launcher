const escape=value=>String(value??'').slice(0,240).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function achievementHtml(notice){
  const fr=notice.locale==='fr';
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><style>
  *{box-sizing:border-box}body{margin:0;background:transparent;color:#f3f7fb;font-family:Segoe UI,Arial,sans-serif;padding:8px}
  .toast{display:flex;align-items:center;gap:16px;min-height:104px;padding:18px 22px;border:1px solid #83c7e877;border-radius:18px;background:linear-gradient(120deg,#102334f5,#07131bf5);box-shadow:0 8px 24px #0007;animation:arrive .35s ease-out}
  .badge{font-size:30px;width:46px;height:46px;display:grid;place-items:center;background:#9bdbff1c;border-radius:50%;color:#aedfff}small{display:block;color:#a5d9f6;font-size:10px;letter-spacing:1.7px;text-transform:uppercase}strong{display:block;font-size:17px;margin:5px 0;font-weight:600}p{margin:0;color:#bdc9d4;font-size:12px}.copy{min-width:0;flex:1}strong,p{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  @keyframes arrive{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.toast{animation:none}}</style></head><body><div class="toast"><div class="badge"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 3h10v6a5 5 0 0 1-10 0V3Zm0 2H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 14v5m-4 2h8m-6-2h4"/></svg></div><div class="copy"><small>${escape(notice.test?(fr?'Notification de test':'Test notification'):(fr?'Succès débloqué · Steam':'Achievement unlocked · Steam'))}</small><strong>${escape(notice.achievement.title)}</strong><p>${escape(notice.gameTitle)}</p></div></div></body></html>`;
}
// A separate sandboxed, click-through window never steals the game's focus.
export class AchievementOverlay {
  constructor(BrowserWindow,display,{duration=6500,schedule=setTimeout,cancel=clearTimeout,render=achievementHtml}={}){Object.assign(this,{BrowserWindow,display,duration,schedule,cancel,render});this.queue=[];this.disposed=false;}
  show(notice){if(this.disposed||this.queue.length>=8)return;this.queue.push(notice);if(!this.window)this.next();}
  next(){
    if(this.disposed||!this.queue.length)return;
    const notice=this.queue.shift(),bounds=this.display().workArea;const width=Math.min(440,bounds.width-24);
    const window=new this.BrowserWindow({width,height:132,x:Math.round(bounds.x+bounds.width-width-20),y:Math.round(bounds.y+24),frame:false,transparent:true,show:false,focusable:false,skipTaskbar:true,resizable:false,alwaysOnTop:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
    this.window=window;window.setIgnoreMouseEvents(true);window.setAlwaysOnTop(true,'screen-saver');window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());
    const finish=()=>{this.cancel(this.timer);if(this.window===window){this.window=null;this.next();}};
    window.once('closed',finish);
    void window.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(this.render(notice))).then(()=>{
      if(this.disposed||window.isDestroyed())return;
      window.showInactive();this.timer=this.schedule(()=>{if(!window.isDestroyed())window.close();},this.duration);
    }).catch(()=>{if(!window.isDestroyed())window.close();});
  }
  dispose(){this.disposed=true;this.queue=[];this.cancel(this.timer);if(this.window&&!this.window.isDestroyed())this.window.close();this.window=null;}
}
