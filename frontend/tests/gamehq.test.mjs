import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {EventEmitter} from 'node:events';
import {GameHQPipe} from '../backend/gamehqPipe.mjs';
import {GameHQCompanion} from '../backend/gamehqCompanion.mjs';

function frame(value){const body=Buffer.from(JSON.stringify(value)),out=Buffer.alloc(body.length+4);out.writeUInt32LE(body.length);body.copy(out,4);return out;}
async function fixture(reply){const sockets=new Set(),received=[];const server=createServer(socket=>{sockets.add(socket);let buffer=Buffer.alloc(0);socket.on('data',data=>{buffer=Buffer.concat([buffer,data]);while(buffer.length>=4&&buffer.length>=buffer.readUInt32LE()+4){const length=buffer.readUInt32LE(),message=JSON.parse(buffer.subarray(4,length+4));buffer=buffer.subarray(length+4);received.push(message);reply(socket,message);}});socket.on('close',()=>sockets.delete(socket));});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const pipe=new GameHQPipe({endpoint:{host:'127.0.0.1',port:server.address().port},timeout:300});return {pipe,received,close:async()=>{pipe.disconnect();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}};}
test('GameHQ handshake handles fragmented frames and synchronizes real sessions',async()=>{
 const f=await fixture((socket,message)=>{const result=message.type==='hello'?{type:'hello.ack',protocolSelected:1,capabilities:['game.lifecycle.v1']}:{type:'ack',acceptedType:message.type};const bytes=frame({...result,requestId:message.requestId});socket.write(bytes.subarray(0,2));setTimeout(()=>socket.write(bytes.subarray(2)),5);});
 try{await f.pipe.request('playnite.state.sync',{games:[{sessionId:'session',name:'Game'}]});assert.equal(f.received[0].client,'Nexus.Launcher');assert.equal(f.received[1].games[0].sessionId,'session');assert.equal(f.pipe.ready,true);}finally{await f.close();}
});
test('unsupported capabilities never send a game command',async()=>{const f=await fixture((socket,m)=>socket.write(frame({type:'hello.ack',protocolSelected:1,capabilities:[],requestId:m.requestId})));try{await assert.rejects(f.pipe.request('playnite.state.sync',{games:[]}),/incompatible/);assert.equal(f.received.length,1);}finally{await f.close();}});
test('an unresponsive engine times out and pending requests are cleared',async()=>{const f=await fixture(()=>{});try{await assert.rejects(f.pipe.connect(),/timeout/);assert.equal(f.pipe.pending.size,0);}finally{await f.close();}});
test('mismatched command acknowledgement is rejected',async()=>{const f=await fixture((socket,m)=>socket.write(frame(m.type==='hello'?{type:'hello.ack',protocolSelected:1,capabilities:['app.open_gallery'],requestId:m.requestId}:{type:'ack',acceptedType:'other.command',requestId:m.requestId})));try{await assert.rejects(f.pipe.request('app.open_gallery'),/incompatible/);}finally{await f.close();}});
test('companion opt-in, startup cooldown and maintenance protect ordinary launches',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nexus-gamehq-')),root=join(dir,'GameHQ');await mkdir(root);await writeFile(join(root,'GameHQ.exe'),'fixture');let starts=0;const pipe={ready:false,connect:async()=>{throw Error('offline');},disconnect(){},request:async()=>{}};
 const companion=new GameHQCompanion(dir,{platform:'win32',programRoots:[root],pipe,spawn:()=>{starts++;const child=new EventEmitter();child.unref=()=>{};queueMicrotask(()=>child.emit('spawn'));return child;}});
 try{assert.equal((await companion.ensureStarted()).state,'disabled');assert.equal(starts,0);await companion.enable(true);await companion.ensureStarted();await companion.ensureStarted();assert.equal(starts,1);await companion.enable(false);assert.equal((await companion.status()).enabled,false);companion.startedAt=0;await companion.enable(true);await mkdir(join(root,'.update'));await writeFile(join(root,'.update','maintenance.lock'),'');assert.equal((await companion.ensureStarted()).state,'maintenance');assert.equal(starts,1);}finally{companion.disconnect();await rm(dir,{recursive:true,force:true});}
});
test('lifecycle context uses the registry installation folder',()=>{const companion=new GameHQCompanion('unused',{pipe:{disconnect(){}}});assert.equal(companion.context({sessionId:'session',gameId:'game',title:'Game',startedAt:'2026-10-06T00:00:00Z',game:{folderPath:'D:\\Games\\Game'}}).installDirectory,'D:\\Games\\Game');});
