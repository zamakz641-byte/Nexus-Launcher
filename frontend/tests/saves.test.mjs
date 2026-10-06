import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile, mkdir, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SavesModule} from '../backend/modules/saves.mjs';
import {PluginManager} from '../backend/plugins/pluginManager.mjs';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {runSaves} from '../backend/plugins/savesProcess.mjs';

const game={id:'fixture',title:'Fixture Game',steamAppId:123,installationPath:'C:/Games/Fixture'};
async function fixture(run,work){const dir=await mkdtemp(join(tmpdir(),'nexus-saves-'));try{
 const manager={status:async()=>({enabled:true,installed:true}),executable:async()=>'/fixture.exe'};
 const saves=new SavesModule(dir,{manager,gameFor:async id=>id===game.id?game:null,run,manifest:async()=>{},running:()=>false});
 await saves.chooseDestination(dir);await work(saves,dir);
}finally{await rm(dir,{recursive:true,force:true});}}
test('known plugin policies keep Replay preferences separate and reject arbitrary plugins',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nexus-plugins-'));try{
  const replay=new PluginManager(dir),saves=new PluginManager(dir,{id:'nexus-saves'});
  assert.notEqual(replay.file,saves.file);assert.throws(()=>new PluginManager(dir,{id:'external-code'}));
  await replay.save({enabled:true});await saves.save({enabled:false});
  assert.equal((await replay.preferences()).enabled,true);
  assert.equal((await saves.status()).license,'MIT');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('destination is a dedicated child, unknown games never call the native engine',async()=>{
 let calls=0;await fixture(async()=>{calls++;return {};},async(saves,dir)=>{
  assert.equal((await saves.status()).destination,join(await realpath(dir),'Nexus Saves'));
  await assert.rejects(saves.inspect('unknown'),/invalid-game/);assert.equal(calls,0);
  assert.equal(JSON.parse(await readFile(join(dir,'nexus-saves.json'))).automatic,false);
 });
});
test('restoration protects current saves first, consumes confirmation once and blocks running games',async()=>{
 const calls=[];await fixture(async command=>{calls.push(command.type);return command.type==='list'?{known:true,versions:[{id:'one',when:'2026-10-06T00:00:00Z'}]}:{known:true,files:1,registry:0,bytes:32,ok:true};},async saves=>{
  const preview=await saves.prepareRestore('fixture','one');assert.equal(preview.files,1);
  await saves.restore(preview.token);assert.deepEqual(calls,['list','restore-preview','protect','restore']);
  await assert.rejects(saves.restore(preview.token),/invalid-confirmation/);
  saves.running=()=>true;await assert.rejects(saves.prepareRestore('fixture','one'),/game-running/);
 });
});
test('a failed protection backup prevents all restore writes',async()=>{
 const calls=[];await fixture(async command=>{calls.push(command.type);if(command.type==='protect')throw Error('partial-backup');return command.type==='list'?{known:true,versions:[{id:'one',when:'2026-10-06T00:00:00Z'}]}:{known:true,files:1,registry:0,bytes:32,ok:true};},async saves=>{
  const preview=await saves.prepareRestore('fixture','one');await assert.rejects(saves.restore(preview.token),/partial-backup/);
  assert.equal(calls.includes('restore'),false);
 });
});
test('an empty live save location can be recovered, while active launches remain blocked',async()=>{
 await fixture(async command=>command.type==='list'?{known:true,versions:[{id:'one',when:'2026-10-06T00:00:00Z'}]}:{known:true,files:command.type==='protect'?0:1,registry:0,bytes:32,ok:true},async saves=>{
  const preview=await saves.prepareRestore('fixture','one');await saves.restore(preview.token);
 });
});
test('removal occupies the operation queue until files are removed',async()=>{
 let removing,release;await fixture(async()=>({known:true,files:1,registry:0}),async saves=>{
  saves.manager.cancel=()=>{};saves.manager.remove=()=>{removing=true;return new Promise(resolve=>release=()=>{removing=false;resolve();});};
  let nativeCalls=0;saves.gameFor=async()=>{nativeCalls++;return game;};saves.run=async()=>{assert.equal(removing,false);return {known:true,files:1};};
  const uninstall=saves.remove();while(!release)await new Promise(resolve=>setImmediate(resolve));
  const backup=saves.backup('fixture');await new Promise(resolve=>setImmediate(resolve));assert.equal(nativeCalls,0);
  release();await uninstall;await backup;
 });
});
test('changing destination invalidates confirmations and shutdown drains pending writes',async()=>{
 let release;await fixture(async command=>command.type==='list'?{known:true,versions:[{id:'one',when:'2026-10-06T00:00:00Z'}]}:command.type==='backup'?new Promise(resolve=>release=()=>resolve({known:true,ok:true,files:1})):({known:true,ok:true,files:1}),async(saves,dir)=>{
  const token=(await saves.prepareRestore('fixture','one')).token;await mkdir(join(dir,'other'));await saves.chooseDestination(join(dir,'other'));
  await assert.rejects(saves.restore(token),/invalid-confirmation/);
  const backup=saves.backup('fixture');while(!release)await new Promise(resolve=>setImmediate(resolve));
  let closed=false;const stopping=saves.stop().then(()=>closed=true);await new Promise(resolve=>setImmediate(resolve));assert.equal(closed,false);
  release();await backup;await stopping;await assert.rejects(saves.backup('fixture'),/module-stopped/);
 });
});
test('timeout retains the save operation until the owned child confirms exit',async()=>{
 const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.stdin=new PassThrough();let killed=false,finished=false;
 child.kill=()=>{killed=true;};const result=runSaves('/fixture.exe',{}, {spawnProcess:()=>child,timeout:5}).catch(error=>{finished=true;return error.message;});
 while(!killed)await new Promise(resolve=>setTimeout(resolve,1));assert.equal(finished,false);
 child.emit('close',1);assert.equal(await result,'operation-timeout');
});
