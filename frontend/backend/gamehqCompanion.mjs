import {readFile,writeFile,mkdir,rename,stat} from 'node:fs/promises';
import {join,basename,dirname,isAbsolute} from 'node:path';
import {spawn} from 'node:child_process';
import {GameHQPipe} from './gamehqPipe.mjs';
export const GAMEHQ_RELEASE={release:'https://api.github.com/repos/UnderFusion/GameHQ/releases/latest',name:/^GameHQ-\d+\.\d+\.\d+-win64-setup\.exe$/,url:/^https:\/\/github\.com\/UnderFusion\/GameHQ\/releases\/download\/v\d+\.\d+\.\d+\/GameHQ-\d+\.\d+\.\d+-win64-setup\.exe$/};
export class GameHQCompanion {
  constructor(dir,{programRoots=[join(process.env.LOCALAPPDATA||dir,'Programs','GameHQ'),join(process.env.ProgramFiles||'C:\\Program Files','GameHQ')],spawn:launch=spawn,pipe=new GameHQPipe(),platform=process.platform}={}){Object.assign(this,{dir,programRoots,launch,pipe,platform});this.file=join(dir,'gamehq.json');this.sessions=new Map();this.writes=Promise.resolve();}
  async preferences(){try{return JSON.parse(await readFile(this.file,'utf8'));}catch{return {enabled:false,executable:''};}}
  async valid(file){return typeof file==='string'&&isAbsolute(file)&&basename(file).toLowerCase()==='gamehq.exe'&&(await stat(file).catch(()=>null))?.isFile();}
  async executable(){const prefs=await this.preferences();if(await this.valid(prefs.executable))return prefs.executable;for(const root of this.programRoots)for(const name of ['GameHQ.exe','app/GameHQ.exe']){const file=join(root,name);if(await this.valid(file))return file;}return '';}
  async status(){const executable=await this.executable(),prefs=await this.preferences();return {installed:!!executable,enabled:prefs.enabled===true,supported:this.platform==='win32',executable,connected:this.pipe.ready===true};}
  save(change){const task=this.writes.then(async()=>{await mkdir(this.dir,{recursive:true});const prefs=await this.preferences();await writeFile(this.file+'.tmp',JSON.stringify({...prefs,...change}),'utf8');await rename(this.file+'.tmp',this.file);});this.writes=task.catch(()=>{});return task;}
  async enable(enabled){if(typeof enabled!=='boolean')throw Error('invalid-preference');const status=await this.status();if(enabled&&!status.installed)throw Error('engine-missing');await this.save({enabled,executable:status.executable});if(!enabled)this.disconnect();else if(this.sessions.size)this.watch();return this.status();}
  async choose(executable){if(!await this.valid(executable))throw Error('invalid-executable');await this.save({executable});return this.status();}
  async ensureStarted(){const status=await this.status();if(!status.enabled)return {state:'disabled'};if(!status.installed||!status.supported)return {state:'missing'};
    try{await this.pipe.connect();return {state:'running'};}catch{}
    const root=basename(dirname(status.executable)).toLowerCase()==='app'?dirname(dirname(status.executable)):dirname(status.executable);
    if(await stat(join(root,'.update','maintenance.lock')).catch(()=>null))return {state:'maintenance'};
    if(Date.now()-(this.startedAt||0)<15000)return {state:'running'};
    try{this.startedAt=Date.now();const child=this.launch(status.executable,[],{cwd:dirname(status.executable),shell:false,detached:true,stdio:'ignore',windowsHide:true});await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.on('error',()=>{});child.unref();return {state:'running'};}catch{this.startedAt=0;return {state:'error'};}
  }
  context(event){return {sessionId:event.sessionId,playniteGameId:`nexus:${event.gameId}`,name:event.title,sourceName:'Nexus Launcher',platformNames:['PC'],installDirectory:event.game?.folderPath,occurredAtUtc:event.startedAt};}
  async sync(){if(!(await this.preferences()).enabled)return;await this.pipe.connect();await this.pipe.request('playnite.state.sync',{games:[...this.sessions.values()].slice(-64).map(event=>this.context(event))});}
  watch(){if(!this.timer){this.timer=setInterval(()=>{if(this.sessions.size)void this.sync().catch(()=>{});},15000);this.timer.unref();}void this.sync().catch(()=>{});}
  async gameStarted(event){this.sessions.set(event.sessionId,event);if(!(await this.preferences()).enabled)return;
    this.watch();
  }
  async gameStopped(event){this.sessions.delete(event.sessionId);try{await this.sync();}catch{}if(!this.sessions.size){clearInterval(this.timer);this.timer=null;}}
  async roots(videos){const file=await this.executable(),roots=[join(videos,'GameHQ')];if(file){const parent=basename(dirname(file)).toLowerCase()==='app'?dirname(dirname(file)):dirname(file);if(await stat(join(parent,'portable.flag')).catch(()=>null))roots.push(join(parent,'Captures'));}return roots;}
  disconnect(){clearInterval(this.timer);this.timer=null;this.pipe.disconnect();}
}
