import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { AchievementMonitor } from '../backend/achievementNotifications.mjs';
const result=items=>({state:'ready',cached:false,achievements:items});
const item=(id,unlocked,unlockTime=null)=>({id,title:id,unlocked,unlockTime});
function fixture(values){
  const notices=[],timers=[];const service={generation:0,status:async()=>({configured:true,steamId:'A'}),getAchievements:async()=>values.shift()};
  const monitor=new AchievementMonitor(service,n=>notices.push(n),{schedule:fn=>{timers.push(fn);return fn;},cancel:()=>{},now:()=>20000,settings:async()=>({enabled:true,locale:'en'})});
  const session=new EventEmitter();return {service,notices,timers,monitor,session};
}
test('baseline suppresses existing unlocks, new unlock appears once, exit stops notifications',async()=>{
  const f=fixture([result([item('old',true,1),item('new',false)]),result([item('old',true,1),item('new',true,21)]),result([item('new',true,21)])]);
  const watch=f.monitor.start({title:'Game',metadata:{steamAppId:10}},f.session);await watch.ready;
  assert.equal(f.notices.length,0);await watch.poll();assert.equal(f.notices.length,1);assert.equal(f.notices[0].achievement.id,'new');
  await watch.poll();assert.equal(f.notices.length,1);f.session.emit('exit');await watch.poll();assert.equal(f.notices.length,1);
});
test('offline cached progress is never presented as a new live unlock',async()=>{
  const f=fixture([result([item('A',false)]),{state:'offline',cached:true,achievements:[item('A',true,21)]},result([item('A',true,21)])]);
  const watch=f.monitor.start({title:'Game',steamAppId:10},f.session);await watch.ready;await watch.poll();assert.equal(f.notices.length,0);await watch.poll();assert.equal(f.notices.length,1);
});
test('logout/account change during a request discards old progress',async()=>{
  const f=fixture([result([item('A',false)])]);const watch=f.monitor.start({title:'Game',steamAppId:10},f.session);await watch.ready;
  let release;f.service.getAchievements=()=>new Promise(resolve=>{release=resolve;});const pending=watch.poll();await new Promise(resolve=>setImmediate(resolve));f.service.generation++;release(result([item('A',true,21)]));await pending;assert.equal(f.notices.length,0);watch.stop();
});
test('closing the session during a request cannot display a late toast',async()=>{
  const f=fixture([result([item('A',false)])]);const watch=f.monitor.start({title:'Game',steamAppId:10},f.session);await watch.ready;
  let release;f.service.getAchievements=()=>new Promise(resolve=>{release=resolve;});const pending=watch.poll();await new Promise(resolve=>setImmediate(resolve));f.session.emit('exit');release(result([item('A',true,21)]));await pending;assert.equal(f.notices.length,0);
});

 test('registry metadata and Steam store IDs start real watchers at timestamp precision',async()=>{
  for(const game of [{title:'Game',steamMetadata:{appId:10}},{title:'Game',platform:'Steam',storeId:'10'}]){
    const f=fixture([result([item('A',false)]),result([item('A',true,20)])]);f.monitor.now=()=>20001;
    const watch=f.monitor.start(game,f.session,'en');await watch.ready;await watch.poll();assert.equal(f.notices.length,1);assert.equal(f.notices[0].locale,'en');watch.stop();
  }
});
