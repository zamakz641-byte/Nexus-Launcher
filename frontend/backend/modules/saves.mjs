import {mkdir,readFile,writeFile,rename,realpath,stat} from 'node:fs/promises';
import {join,dirname,relative,isAbsolute} from 'node:path';
import {randomUUID} from 'node:crypto';
import {runSaves} from '../plugins/savesProcess.mjs';

const manifestUrl='https://raw.githubusercontent.com/mtkennerly/ludusavi-manifest/master/data/manifest.yaml';
export class SavesModule{
 id='saves';
 constructor(dir,{manager,gameFor,running,run,manifest,fetch=globalThis.fetch}={}){
  this.file=join(dir,'nexus-saves.json');this.data=join(dir,'saves-engine');this.manager=manager;
  this.gameFor=gameFor;this.running=running;this.run=run;this.manifestProvider=manifest;this.fetch=fetch;
  this.queue=Promise.resolve();this.tokens=new Map();this.sessions=new Map();this.closed=false;this.busy=false;this.locks=new Set();
 }
 async preferences(){try{const prefs=JSON.parse(await readFile(this.file,'utf8'));return {destination:typeof prefs.destination==='string'?prefs.destination:undefined,automatic:prefs.automatic===true};}catch{return {automatic:false};}}
 async persist(prefs){await mkdir(dirname(this.file),{recursive:true});await writeFile(this.file+'.tmp',JSON.stringify(prefs));await rename(this.file+'.tmp',this.file);this.tokens.clear();}
 enqueue(action){if(this.closed)return Promise.reject(Error('module-stopped'));const task=this.queue.then(async()=>{this.busy=true;try{return await action();}finally{this.busy=false;}});this.queue=task.catch(()=>{});return task;}
 async status(refresh=false){return {...await this.manager.status({refresh}),...await this.preferences(),busy:this.busy,last:this.last,error:this.error};}
 chooseDestination(path){return this.enqueue(async()=>{
  const parent=await realpath(path);if(!(await stat(parent)).isDirectory())throw Error('invalid-folder');
  const target=join(parent,'Nexus Saves');await mkdir(target,{recursive:true});const canonical=await realpath(target),child=relative(parent,canonical);
  if(isAbsolute(child)||child!== 'Nexus Saves')throw Error('invalid-folder');
  await this.persist({...await this.preferences(),destination:canonical});return this.status();
 });}
 setAutomatic(value){return this.enqueue(async()=>{if(typeof value!=='boolean')throw Error('invalid-preference');await this.persist({...await this.preferences(),automatic:value});return this.status();});}
 async manifest(){
  if(this.manifestProvider)return this.manifestProvider();
  const path=join(this.data,'manifest.yaml'),info=await stat(path).catch(()=>null);
  if(info?.size>0&&Date.now()-info.mtimeMs<86400000)return;
  try{
   const response=await this.fetch(manifestUrl,{signal:AbortSignal.timeout(20000)});if(!response.ok||!response.body)throw Error('manifest-unavailable');
   const reader=response.body.getReader(),chunks=[];let bytes=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>32*1024**2)throw Error('manifest-unavailable');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   if(bytes<1000)throw Error('manifest-unavailable');await mkdir(this.data,{recursive:true});await writeFile(path+'.tmp',Buffer.concat(chunks));await rename(path+'.tmp',path);
  }catch{if(!info?.size)throw Error('manifest-unavailable');}
 }
 async command(type,id,extra={}){
  if(typeof id!=='string'||id.length>200)throw Error('invalid-game');const game=await this.gameFor(id);if(!game)throw Error('invalid-game');
  const prefs=await this.preferences();if(!prefs.destination)throw Error('choose-destination');
  const status=await this.manager.status();if(!status.enabled)throw Error('plugin-disabled');
  await this.manifest();
  // All executable paths, save roots and matching hints come from trusted backend state.
  const appId=Number(game.platform==='Steam'?game.storeId:game.steamMetadata?.appId||game.steamAppId||game.metadata?.steamAppId);
  const command={type,data:this.data,destination:prefs.destination,title:game.title,steamId:Number.isSafeInteger(appId)&&appId>0&&appId<=4294967295?appId:undefined,root:game.folderPath?dirname(game.folderPath):game.installationPath?dirname(game.installationPath):undefined,...extra};
  const result=this.run?await this.run(command):await runSaves(await this.manager.executable(),command);
  if(result?.ok===false)throw Error(result.error||'operation-failed');return result;
 }
 inspect(id){return this.enqueue(async()=>{const scan=await this.command('scan',id);const list=scan.known?await this.command('list',id):{versions:[]};return {...scan,versions:list.versions||[]};});}
 async backupNow(id,type='backup'){
  if(this.running(id))throw Error('game-running');
  try{const result=await this.command(type,id);if(!result.known)throw Error('unknown-game');if(type!=='protect'&&!(result.files>0||result.registry>0))throw Error('no-saves');this.last={gameId:id,when:new Date().toISOString()};this.error=undefined;return result;}
  catch(error){this.error=/^[a-z-]{1,50}$/.test(error.message)?error.message:'operation-failed';throw Error(this.error);}
 }
 isBusy(id){return this.locks.has(id);}
 async locked(id,action){this.locks.add(id);try{return await action();}finally{this.locks.delete(id);}}
 backup(id){return this.enqueue(()=>this.locked(id,()=>this.backupNow(id)));}
 prepareRestore(id,version){return this.enqueue(async()=>{
  if(this.running(id))throw Error('game-running');if(typeof version!=='string'||version.length>200)throw Error('invalid-version');
  const list=await this.command('list',id);if(!list.versions?.some(item=>item.id===version))throw Error('invalid-version');
  const preview=await this.command('restore-preview',id,{version});if(!(preview.files>0||preview.registry>0))throw Error('no-saves');
  const token=randomUUID();this.tokens.clear();this.tokens.set(token,{id,version,expires:Date.now()+300000});return {...preview,token};
 });}
 restore(token){return this.enqueue(async()=>{
  const confirmation=this.tokens.get(token);this.tokens.delete(token);if(!confirmation||Date.now()>confirmation.expires)throw Error('invalid-confirmation');
  return this.locked(confirmation.id,async()=>{
   if(this.running(confirmation.id))throw Error('game-running');
   // Recovery uses a separate layout, so protection cannot prune the selected version.
   await this.backupNow(confirmation.id,'protect');
   if(this.running(confirmation.id))throw Error('game-running');
   return this.command('restore',confirmation.id,{version:confirmation.version});
  });
 });}
 activate(){return this.enqueue(async()=>{const status=await this.manager.status();return status.installed?this.manager.enable(true):this.manager.activate();});}
 enable(value){this.manager.cancel();return this.enqueue(async()=>{if(this.manager.pending)await this.manager.pending;this.tokens.clear();return this.manager.enable(value);});}
 remove(){this.manager.cancel();return this.enqueue(async()=>{if(this.manager.pending)await this.manager.pending;this.tokens.clear();return this.manager.remove();});}
 start({on}){
  on('GameStarted',event=>{this.sessions.set(event.sessionId,event.gameId);});
  on('GameStopped',async event=>{const id=this.sessions.get(event.sessionId);this.sessions.delete(event.sessionId);if(id&&(await this.preferences()).automatic&&(await this.manager.status()).enabled)await this.backup(id);});
 }
 async stop(){this.closed=true;await this.queue;this.tokens.clear();}
}
