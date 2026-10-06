import {spawn} from 'node:child_process';
import {mkdir,rm,realpath} from 'node:fs/promises';
import {join,dirname,relative,isAbsolute} from 'node:path';
import {randomUUID} from 'node:crypto';
const methods=['start-buffer','stop-buffer','save-replay','screenshot','status'];
export class ReplayRuntime {
 constructor(manager,{capturesRoot,spawn:launch=spawn,onSaved=async()=>{}}={}){Object.assign(this,{manager,capturesRoot,launch,onSaved});this.sessions=new Map();this.requests=new Map();this.saves=new Set();this.bufferState=0;}
 async status({refresh=false}={}){return {...await this.manager.status({refresh}),connected:!!this.ready,bufferState:this.bufferState,recording:[2,3].includes(this.bufferState),canSave:!!this.ready&&[2,3].includes(this.bufferState)};}
 ensureStarted(){if(this.disposed)return Promise.reject(Error('engine-stopped'));if(this.starting)return this.starting;this.starting=this.start().finally(()=>{this.starting=null;});return this.starting;}
 async start(){
  const initialEpoch=this.epoch||0,initialStatus=await this.manager.status();
  if(this.disposed||(this.epoch||0)!==initialEpoch||!initialStatus.enabled)return {state:'disabled'};if(this.ready)return {state:'running'};
  await this.disconnect();const epoch=this.epoch;const executable=await this.manager.executable();const data=join(this.manager.root,'runs',randomUUID());await mkdir(data,{recursive:true});
  const enabled=(await this.manager.status()).enabled;
  if(this.disposed||this.epoch!==epoch||!enabled){await this.removeData(data);return {state:'disabled'};}this.stopping=false;this.data=data;
  const env={};for(const name of ['SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','LOCALAPPDATA'])if(process.env[name])env[name]=process.env[name];env.PATH=join(process.env.SystemRoot||'C:\\Windows','System32');
  const child=this.launch(executable,['--data',data,'--captures',this.capturesRoot],{cwd:dirname(executable),shell:false,windowsHide:true,stdio:['pipe','pipe','pipe'],env});this.child=child;let buffer=Buffer.alloc(0);
  child.stdout.on('data',chunk=>{if(this.child!==child)return;try{buffer=Buffer.concat([buffer,chunk]);if(buffer.length>65536)throw Error('invalid-frame');let split;while((split=buffer.indexOf(10))>=0){const message=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(0,split)));buffer=buffer.subarray(split+1);if(message.type==='buffer-state'){if(!Number.isInteger(message.state)||message.state<0||message.state>4)throw Error('invalid-frame');this.bufferState=message.state;continue;}const request=this.requests.get(message.requestId);if(!request)continue;
    if(message.type!=='error'){
      const expected=request.type==='hello'?'hello':request.type==='status'?'status':['save-replay','screenshot'].includes(request.type)?'saved':'ack';
      if(message.type!==expected||(expected==='ack'&&message.acceptedType!==request.type)||(expected==='saved'&&(message.kind!==(request.type==='screenshot'?'image':'clip')||typeof message.file!=='string')))throw Error('invalid-frame');
    }
    this.requests.delete(message.requestId);clearTimeout(request.timer);if(message.type==='error')request.reject(Error('capture-unavailable'));else if(message.type==='saved')void Promise.resolve().then(()=>this.onSaved(message,request.context)).then(request.resolve,request.reject);else request.resolve(message);
  }}catch{this.fail(Error('invalid-engine'));child.kill();}});
  child.stderr.on('data',()=>{});child.on('error',()=>{if(this.child===child)this.fail(Error('engine-offline'));});child.on('exit',()=>{if(this.child===child){this.fail(Error('engine-offline'));this.child=null;}});
  await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});
  const hello=await this.send('hello');if(hello.type!=='hello'||hello.protocol!==1||!Array.isArray(hello.capabilities)||!methods.every(method=>hello.capabilities.includes(method))){child.kill();throw Error('engine-incompatible');}
  this.ready=true;return {state:'running'};
 }
 send(type,fields={}){if(this.stopping||!this.child||this.child.killed)return Promise.reject(Error('engine-offline'));const requestId=randomUUID(),line=JSON.stringify({...fields,type,requestId})+'\n';if(Buffer.byteLength(line)>65536)return Promise.reject(Error('invalid-command'));const saving=['save-replay','screenshot'].includes(type);const task=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.requests.delete(requestId);reject(Error('engine-timeout'));},saving?30000:5000);this.requests.set(requestId,{resolve,reject,timer,type,context:this.sessions.get(this.active)});this.child.stdin.write(line,error=>{if(error){clearTimeout(timer);this.requests.delete(requestId);reject(Error('engine-offline'));}});});if(saving){this.saves.add(task);task.then(()=>this.saves.delete(task),()=>this.saves.delete(task));}return task;}
 async request(type,fields={}){await this.ensureStarted();if(!this.ready)throw Error('plugin-disabled');const result=await this.send(type,fields);if(methods.includes(type)&&!['save-replay','screenshot','status'].includes(type)&&(result.type!=='ack'||result.acceptedType!==type))throw Error('engine-incompatible');return result;}
 async gameStarted(event){if(!Number.isSafeInteger(event.pid)||event.pid<=0)return;this.sessions.set(event.sessionId,event);if(!(await this.manager.status()).enabled)return;await this.arm(event);}
 async arm(event){this.active=event.sessionId;await this.request('start-buffer',{pid:event.pid,title:event.title,executable:event.game?.executablePath||'',seconds:30,width:1280,fps:30,audio:false});}
 async gameStopped(event){this.sessions.delete(event.sessionId);if(this.active!==event.sessionId)return;await Promise.allSettled([...this.saves]);if(this.ready)await this.send('stop-buffer').catch(()=>{});this.active=null;const next=[...this.sessions.values()].at(-1);if(next&&(await this.manager.status()).enabled)await this.arm(next);else await this.disconnect();}
 async activate(){await this.disconnect();const status=await this.manager.activate();if(status.state==='error'||status.state==='cancelled')return status;await this.ensureStarted();const session=[...this.sessions.values()].at(-1);if(session)await this.arm(session);return this.status();}
 async enable(enabled){if(!enabled){this.epoch=(this.epoch||0)+1;this.manager.cancel();if(this.manager.pending)await this.manager.pending;}await this.manager.enable(enabled);if(!enabled)await this.disconnect();else{await this.ensureStarted();const session=[...this.sessions.values()].at(-1);if(session)await this.arm(session);}return this.status();}
 async remove(){await this.enable(false);return this.manager.remove();}
 async dispose(){this.disposed=true;await this.disconnect();if(this.starting)await this.starting.catch(()=>{});}
 fail(error){this.ready=false;this.bufferState=0;for(const request of this.requests.values()){clearTimeout(request.timer);request.reject(error);}this.requests.clear();}
 async removeData(data){const root=await realpath(join(this.manager.root,'runs')).catch(()=>null),target=await realpath(data).catch(()=>null);const path=root&&target?relative(root,target):'';if(path&&!isAbsolute(path)&&/^[a-f0-9-]{36}$/.test(path))await rm(target,{recursive:true,force:true});}
 disconnect(){this.epoch=(this.epoch||0)+1;if(this.closing)return this.closing;this.stopping=true;this.closing=this.close().finally(()=>{this.closing=null;});return this.closing;}
 async close(){await Promise.allSettled([...this.saves]);const child=this.child;this.child=null;this.fail(Error('engine-stopped'));if(child){await new Promise(resolve=>{let timer;const finish=()=>{clearTimeout(timer);resolve();};child.once('exit',finish);if(child.exitCode!==null&&child.exitCode!==undefined)return finish();timer=setTimeout(()=>{child.kill();finish();},5000);try{child.stdin.end(JSON.stringify({type:'shutdown'})+'\n');}catch{child.kill();}});}const data=this.data;this.data=null;if(data)await this.removeData(data);}
}
