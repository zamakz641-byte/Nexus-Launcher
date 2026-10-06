import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CaptureModule} from '../backend/modules/capture.mjs';
import {EventBus,ModuleHost} from '../backend/core/moduleHost.mjs';
const png=Buffer.from('89504e470d0a1a0a00000000','hex');
async function fixture(){const dir=await mkdtemp(join(tmpdir(),'nexus-capture-'));const root=join(dir,'media');await mkdir(root);return {dir,root,service:new CaptureModule(dir,{root,screenshot:async()=>png})};}
test('explicit screenshots have unique files, actual session context and saved events',async()=>{
 const f=await fixture();try{const bus=new EventBus(),host=new ModuleHost(bus),saved=[];bus.subscribe('CaptureSaved',event=>saved.push(event));await host.register(f.service);
 await bus.publish('GameStarted',{sessionId:'one',gameId:'game',title:'Test: Game'});await Promise.all([f.service.screenshot(),f.service.screenshot()]);
 const result=await f.service.list();assert.equal(result.items.length,2);assert.notEqual(result.items[0].id,result.items[1].id);assert.equal(result.items[0].game,'Test Game');assert.equal(saved.length,2);await host.dispose();
 }finally{await rm(f.dir,{recursive:true,force:true});}
});
test('folder media is read-only and only indexed IDs authorize access',async()=>{
 const f=await fixture();try{await writeFile(join(f.root,'clip.mp4'),'video');await writeFile(join(f.root,'secret.txt'),'secret');await writeFile(join(f.root,'pending.mp4.part'),'partial');const result=await f.service.list();assert.equal(result.items.length,1);assert.equal(result.items[0].kind,'clip');assert.ok(await f.service.authorize(result.items[0].id));assert.equal(await f.service.authorize('../secret.txt'),null);await rm(join(f.root,'clip.mp4'));assert.equal(await f.service.authorize(result.items[0].id),null);
 }finally{await rm(f.dir,{recursive:true,force:true});}
});
test('failed screenshot never publishes saved or leaves fake media',async()=>{
 const f=await fixture();try{f.service.screenshotProvider=async()=>Buffer.from('invalid');const bus=new EventBus(),host=new ModuleHost(bus);let saved=0;bus.subscribe('CaptureSaved',()=>saved++);await host.register(f.service);await assert.rejects(f.service.screenshot());assert.equal(saved,0);assert.equal((await f.service.list()).items.length,0);await host.dispose();}finally{await rm(f.dir,{recursive:true,force:true});}
});
test('symlink media cannot expose a file outside approved roots',async()=>{
 const f=await fixture();try{await writeFile(join(f.dir,'outside.png'),png);try{await symlink(join(f.dir,'outside.png'),join(f.root,'linked.png'));}catch(error){if(error.code==='EPERM')return;throw error;}assert.equal((await f.service.list()).items.length,0);}finally{await rm(f.dir,{recursive:true,force:true});}
});
test('shutdown drains an in-flight screenshot and refuses new captures',async()=>{
 const f=await fixture();let release;const pending=new Promise(resolve=>{release=resolve;});f.service.screenshotProvider=()=>pending;
 try{const capture=f.service.screenshot();let stopped=false;const stop=f.service.stop().then(()=>{stopped=true;});await new Promise(resolve=>setTimeout(resolve,10));assert.equal(stopped,false);await assert.rejects(f.service.screenshot(),/stopped/);release(png);await capture;await stop;assert.equal(stopped,true);assert.equal((await f.service.list()).items.length,1);}finally{await rm(f.dir,{recursive:true,force:true});}
});
