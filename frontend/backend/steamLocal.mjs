import {readFile,readdir,stat,mkdir,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export function parseVdf(text){
  const tokens=text.match(/"(?:\\.|[^"\\])*"|[{}]|[^\s{}"]+/g)||[];let i=0;
  const value=token=>token?.startsWith('"')?token.slice(1,-1).replace(/\\([\\"])/g,'$1'):token;
  function object(depth=0){if(depth>64)throw new Error('invalid-vdf');const result=Object.create(null);while(i<tokens.length){const key=value(tokens[i++]);if(key==='}')break;if(key==='{'||!key)throw new Error('invalid-vdf');const next=tokens[i++];result[key]=next==='{'?object(depth+1):value(next);}return result;}return object();
}
async function defaultRoots(){
  if(process.env.NEXUS_STEAM_ROOT)return [process.env.NEXUS_STEAM_ROOT];
  let registry='';if(process.platform==='win32')try{const {stdout}=await exec('powershell.exe',['-NoProfile','-NonInteractive','-Command',"([Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Software\\Valve\\Steam')).GetValue('SteamPath')"],{windowsHide:true,timeout:4000});registry=stdout.trim();}catch{}
  return [...new Set([registry,join(process.env['ProgramFiles(x86)']||'C:\\Program Files (x86)','Steam'),join(process.env.ProgramFiles||'C:\\Program Files','Steam')].filter(Boolean))];
}
async function text(file){const info=await stat(file).catch(()=>null);if(!info?.isFile()||info.size>32*1024*1024)return null;return {value:await readFile(file,'utf8'),modified:info.mtime.toISOString()};}
function icon(value){try{const url=new URL(value);return url.protocol==='https:'&&/(^|\.)(steamstatic\.com|steamcommunity\.com|steamcdn-a\.akamaihd\.net)$/.test(url.hostname)?url.href:undefined;}catch{return undefined;}}
export class LocalSteamProgress {
  constructor(dir,{roots=defaultRoots}={}){Object.assign(this,{dir});this.roots=roots===defaultRoots?()=>this.rootList ||= defaultRoots():roots;this.generation=0;this.identity=null;this.writes=Promise.resolve();this.saved=new Map();}
  async preferences(){try{return JSON.parse(await readFile(join(this.dir,'steam-local.json'),'utf8'));}catch{return {};}}
  async profile(){
    if((await this.preferences()).disconnected)return null;
    for(const root of await this.roots())try{
      const file=await text(join(root,'config','loginusers.vdf'));if(!file)continue;
      const users=parseVdf(file.value).users||{};const entries=Object.entries(users).filter(([id])=>/^\d{17}$/.test(id));
      const current=entries.find(([,user])=>user.MostRecent==='1')||entries.find(([,user])=>user.AutoLogin==='1')||entries.slice().sort((a,b)=>(Number(b[1].Timestamp)||0)-(Number(a[1].Timestamp)||0))[0];if(!current)continue;
      const [steamId]=current,user=String(BigInt(steamId)-76561197960265728n);if(!/^\d+$/.test(user))continue;
      if(this.identity&&this.identity!==steamId){this.generation++;this.saved.clear();}this.identity=steamId;
      return {root,steamId,user};
    }catch{}return null;
  }
  async status(){const profile=await this.profile();return {linked:!!profile,configured:!!profile,storageAvailable:true,steamId:profile?.steamId,local:true};}
  async save(file,value){const task=this.writes.then(async()=>{await mkdir(this.dir,{recursive:true});await writeFile(file+'.tmp',JSON.stringify(value),'utf8');await rename(file+'.tmp',file);});this.writes=task.catch(()=>{});return task;}
  async connect(){await this.save(join(this.dir,'steam-local.json'),{disconnected:false});return this.status();}
  async clearAccount(){this.generation++;this.identity=null;this.saved.clear();await this.save(join(this.dir,'steam-local.json'),{disconnected:true});return this.status();}
  async notificationSettings(){try{const prefs=JSON.parse(await readFile(join(this.dir,'achievement-notifications.json'),'utf8'));return {enabled:prefs.enabled!==false,locale:prefs.locale==='en'?'en':'fr'};}catch{return {enabled:true,locale:'fr'};}}
  async saveNotificationSettings(value){if(typeof value?.enabled!=='boolean'||!['fr','en'].includes(value.locale))throw new Error('invalid-input');await this.save(join(this.dir,'achievement-notifications.json'),value);return this.notificationSettings();}
  async current(profile,generation){return generation===this.generation&&(await this.profile())?.steamId===profile.steamId&&generation===this.generation;}
  async getLibrary(){
    const base={source:'Steam',state:'unconfigured',scope:'local',games:[],lastSynced:null,cached:true};
    const profile=await this.profile();if(!profile)return base;const generation=this.generation;
    try{
      const local=await text(join(profile.root,'userdata',profile.user,'config','localconfig.vdf'));
      const apps=local?parseVdf(local.value).UserLocalConfigStore?.Software?.Valve?.Steam?.apps||{}:{};
      const games=new Map();for(const [id,app] of Object.entries(apps)){if(!/^\d+$/.test(id))continue;const minutes=Number(app.Playtime);games.set(id,{id,title:`Steam ${id}`,...(app.Playtime!==undefined&&Number.isFinite(minutes)&&minutes>=0?{playtimeMinutes:minutes}:{})});}
      const folders=[join(profile.root,'steamapps')];const list=await text(join(profile.root,'steamapps','libraryfolders.vdf'));
      if(list)for(const folder of Object.values(parseVdf(list.value).libraryfolders||{}))if(typeof folder.path==='string')folders.push(join(folder.path,'steamapps'));
      for(const folder of new Set(folders))for(const name of await readdir(folder).catch(()=>[])){if(!/^appmanifest_\d+\.acf$/i.test(name))continue;try{const file=await text(join(folder,name));const app=file&&parseVdf(file.value).AppState;if(app?.appid&&app?.name)games.set(app.appid,{...games.get(app.appid),id:app.appid,title:app.name});}catch{}}
      // Cached apps may outlive their installed manifest. Librarycache retains their names.
      for(const game of games.values())if(game.title.startsWith('Steam '))try{const file=await text(join(profile.root,'userdata',profile.user,'config','librarycache',game.id+'.json'));const data=file&&JSON.parse(file.value);const entry=Array.isArray(data)&&data.find(([key])=>key==='appinfo');const info=entry?.[1]?.data;if(typeof info?.name==='string')game.title=info.name;}catch{}
      if(!await this.current(profile,generation))return base;
      const result={...base,state:local||games.size?'ready':'unavailable',games:[...games.values()],lastSynced:local?.modified||null};this.saved.set('library',result);return result;
    }catch{return await this.current(profile,generation)?{...(this.saved.get('library')||base),state:'offline'}:base;}
  }
  async getAchievements(appId){
    const base={source:'Steam',appId,state:'unavailable',achievements:[],lastSynced:null,cached:true,local:true};
    if(!Number.isInteger(appId)||appId<1||appId>4294967295)return {...base,state:'unsupported'};
    const profile=await this.profile();if(!profile)return {...base,state:'unconfigured'};const generation=this.generation;
    try{
      const file=await text(join(profile.root,'userdata',profile.user,'config','librarycache',appId+'.json'));if(!file)return base;
      const entries=JSON.parse(file.value);let info=Array.isArray(entries)?entries.find(([key])=>key==='achievements')?.[1]:null;
      if(typeof info==='string')info=JSON.parse(info);info=info?.data||info;if(typeof info==='string')info=JSON.parse(info);
      if(!Number.isInteger(info?.nTotal)||!Number.isInteger(info?.nAchieved))return base;
      const definitions=new Map();for(const field of ['vecHighlight','vecUnachieved','vecAchievedHidden'])for(const item of Array.isArray(info[field])?info[field]:[]){if(typeof item.strID!=='string')continue;const unlocked=item.bAchieved===true;definitions.set(item.strID,{id:item.strID,title:String(item.strName||item.strID),description:!unlocked&&item.bHidden?'':String(item.strDescription||''),hidden:!!item.bHidden,unlocked,unlockTime:unlocked&&Number(item.rtUnlocked)>0?Number(item.rtUnlocked):null,icon:icon(item.strImage)});}
      if(!await this.current(profile,generation))return {...base,state:'unconfigured'};
      const result={...base,state:info.nTotal===0?'empty':'ready',total:info.nTotal,unlockedCount:info.nAchieved,achievements:[...definitions.values()],lastSynced:file.modified};this.saved.set(appId,result);return result;
    }catch{return await this.current(profile,generation)?{...(this.saved.get(appId)||base),state:'offline'}:{...base,state:'unconfigured'};}
  }
}
