import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {EventBus,ModuleHost} from '../backend/core/moduleHost.mjs';
import {GameActivity} from '../backend/modules/gameActivity.mjs';

test('listener failures are isolated, events immutable, disposal removes subscriptions',async()=>{
  const bus=new EventBus(),host=new ModuleHost(bus),seen=[];
  await host.register({id:'broken',start:({on})=>on('GameStarted',()=>{throw Error('failure');})});
  await host.register({id:'healthy',start:({on})=>on('GameStarted',event=>{seen.push(event.gameId);assert.throws(()=>{event.gameId='changed';});})});
  const payload={sessionId:'one',gameId:'game'};
  await bus.publish('GameStarted',payload);assert.deepEqual(seen,['game']);assert.equal(payload.gameId,'game');
  assert.equal(host.status().find(x=>x.id==='broken').state,'degraded');
  await host.dispose();await bus.publish('GameStarted',payload);assert.deepEqual(seen,['game']);
  assert.throws(()=>bus.subscribe('ArbitraryCode',()=>{}));
});

test('immediate shutdown drains an already published session before stopping modules',async()=>{
 const bus=new EventBus(),host=new ModuleHost(bus),seen=[];
 await host.register({id:'journal',start:({on})=>on('GameStopped',async()=>{await new Promise(r=>setTimeout(r,20));seen.push('written');}),stop:()=>seen.push('stopped')});
 const delivered=bus.publish('GameStopped',{});await host.dispose();assert.deepEqual(seen,['written','stopped']);await delivered;
});

test('activity records a session once, persists and recovers interruption without invented duration',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'nexus-activity-'));const recorded=[];
  try{
    const bus=new EventBus(),host=new ModuleHost(bus),activity=new GameActivity(dir,{recordPlaytime:async(id,seconds)=>recorded.push([id,seconds])});
    await host.register(activity);
    const start={sessionId:'one',gameId:'game',title:'My Game',startedAt:'2026-10-06T10:00:00.000Z'};
    await bus.publish('GameStarted',start);await bus.publish('GameStarted',start);
    await bus.publish('GameStopped',{sessionId:'one',stoppedAt:'2026-10-06T10:02:05.000Z',durationSeconds:125});
    await bus.publish('GameStopped',{sessionId:'one',durationSeconds:125});
    assert.deepEqual(recorded,[['game',125]]);assert.equal((await activity.history('game')).sessions[0].durationSeconds,125);
    await bus.publish('GameStarted',{...start,sessionId:'two'});await host.dispose();
    const next=new GameActivity(dir);await next.load();const result=await next.history('game');
    assert.equal(result.sessions.length,2);assert.equal(result.sessions[0].state,'interrupted');assert.equal(result.sessions[0].durationSeconds,null);assert.equal(result.sessions[1].durationSeconds,125);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('each module receives lifecycle events in order even when its writes are slow',async()=>{
  const bus=new EventBus(),host=new ModuleHost(bus),seen=[];
  await host.register({id:'ordered',start:({on})=>{on('GameStarted',async()=>{await new Promise(r=>setTimeout(r,20));seen.push('start');});on('GameStopped',()=>seen.push('stop'));}});
  await Promise.all([bus.publish('GameStarted',{}),bus.publish('GameStopped',{})]);assert.deepEqual(seen,['start','stop']);await host.dispose();
});
