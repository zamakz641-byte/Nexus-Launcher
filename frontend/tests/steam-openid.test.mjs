import test from 'node:test';
import assert from 'node:assert/strict';
import { SteamOpenId, createSteamBrowserLauncher } from '../backend/steamOpenId.mjs';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';

const steamId = '76561198000000000';
test('Steam browser launcher prefers installed Chrome and passes only the OpenID URL to reuse the existing session', async () => {
  const launched=[];let fallback=0;
  const launcher=createSteamBrowserLauncher({platform:'win32',env:{ProgramFiles:'C:/Programs',LOCALAPPDATA:'C:/Local'},fileStat:async executable => ({isFile:()=>executable===join('C:/Local','Google','Chrome','Application','chrome.exe')}),openExternal:async()=>{fallback++;},spawnBrowser:(executable,args,options)=>{
    launched.push({executable,args,options});const child=new EventEmitter();child.unref=()=>{};queueMicrotask(()=>child.emit('spawn'));return child;
  }});
  const url='https://steamcommunity.com/openid/login?openid.mode=checkid_setup';await launcher(url);
  assert.equal(launched.length,1);assert.deepEqual(launched[0].args,[url]);assert.equal(launched[0].options.shell,false);assert.equal(launched[0].options.windowsHide,true);assert.equal(fallback,0);
});
test('Steam browser launcher falls back to the default browser when Chrome is absent', async () => {
  let opened;
  const launcher=createSteamBrowserLauncher({platform:'win32',env:{ProgramFiles:'C:/Programs'},fileStat:async()=>{throw new Error('absent');},openExternal:async url=>{opened=url;},spawnBrowser:()=>{throw new Error('unexpected');}});
  const url='https://steamcommunity.com/openid/login';await launcher(url);assert.equal(opened,url);
  await assert.rejects(launcher('https://evil.test/openid/login'));
});
test('Chrome launch errors report browser-error and close the connection without exposing native errors', async () => {
  const launcher=createSteamBrowserLauncher({platform:'win32',env:{ProgramFiles:'C:/Programs'},fileStat:async()=>({isFile:()=>true}),openExternal:async()=>{throw new Error('unexpected fallback');},spawnBrowser:()=>{const child=new EventEmitter();child.unref=()=>{};queueMicrotask(()=>child.emit('error',new Error('private native error')));return child;}});
  const service=new SteamOpenId({openExternal:launcher});assert.deepEqual(await service.connect(),{error:'browser-error'});assert.equal(service.active,null);
});
function assertion(login) {
  const callback = new URL(login.searchParams.get('openid.return_to'));
  const values = {'openid.ns':'http://specs.openid.net/auth/2.0','openid.mode':'id_res','openid.op_endpoint':'https://steamcommunity.com/openid/login','openid.return_to':callback.href,'openid.claimed_id':`https://steamcommunity.com/openid/id/${steamId}`,'openid.identity':`https://steamcommunity.com/openid/id/${steamId}`,'openid.response_nonce':`${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}random`,'openid.assoc_handle':'handle','openid.signed':'op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle','openid.sig':'signature'};
  for (const [key,value] of Object.entries(values)) callback.searchParams.set(key,value);
  return callback;
}
function fixture(options = {}) {
  let opened;
  const browserOpened = new Promise(resolve => { opened = resolve; });
  const requests = [];
  const service = new SteamOpenId({openExternal: async url => opened(new URL(url)),fetch:async (url,options) => {requests.push({url,options});return {ok:true,text:async () => 'ns:http://specs.openid.net/auth/2.0\nis_valid:true\n'};},...options});
  return {service,browserOpened,requests};
}
test('external browser callback verifies Steam assertion at fixed HTTPS provider', async () => {
  const f = fixture();
  const pending = f.service.connect();
  const login = await f.browserOpened;
  assert.equal(login.origin,'https://steamcommunity.com');
  assert.equal(login.searchParams.get('openid.mode'),'checkid_setup');
  assert.equal(new URL(login.searchParams.get('openid.return_to')).hostname,'127.0.0.1');
  const callback = assertion(login);
  const response = await fetch(callback);
  assert.equal(response.status,200);
  assert.deepEqual(await pending,{steamId});
  assert.equal(f.requests.length,1);
  assert.equal(f.requests[0].url,'https://steamcommunity.com/openid/login');
  assert.equal(f.requests[0].options.method,'POST');
  assert.equal(f.requests[0].options.redirect,'error');
  assert.equal(new URLSearchParams(f.requests[0].options.body).get('openid.mode'),'check_authentication');
  await assert.rejects(fetch(callback));
});
test('forged state, endpoint, identity, return URL, nonce and unsigned fields are rejected before provider access', async () => {
  const f = fixture(); const pending = f.service.connect(); const login = await f.browserOpened;
  const changes = [['state','forged'],['openid.op_endpoint','https://evil.test'],['openid.identity',`https://steamcommunity.com/openid/id/76561198000000001`],['openid.return_to','http://evil.test'],['openid.response_nonce','2000-01-01T00:00:00Zold'],['openid.signed','identity'],['openid.claimed_id',`https://steamcommunity.com.evil.test/openid/id/${steamId}`]];
  for (const [key,value] of changes) { const callback = assertion(login);callback.searchParams.set(key,value);assert.equal((await fetch(callback)).status,400); }
  const duplicate = assertion(login); duplicate.searchParams.append('openid.identity',duplicate.searchParams.get('openid.identity'));
  assert.equal((await fetch(duplicate)).status,400);
  assert.equal((await fetch(assertion(login),{method:'POST'})).status,400);
  assert.equal(f.requests.length,0);
  f.service.cancel();assert.deepEqual(await pending,{error:'cancelled'});
});
test('provider refusal cannot link an account', async () => {
  const f = fixture({fetch:async () => ({ok:true,text:async () => 'is_valid:false\n'})});
  const pending = f.service.connect(); const login = await f.browserOpened;
  assert.equal((await fetch(assertion(login))).status,401);
  assert.deepEqual(await pending,{error:'invalid-auth'});
});
test('cancel closes listener and only one browser connection is allowed', async () => {
  const f = fixture();const pending = f.service.connect();const login = await f.browserOpened;
  assert.deepEqual(await f.service.connect(),{error:'connection-in-progress'});
  f.service.cancel();assert.deepEqual(await pending,{error:'cancelled'});
  await assert.rejects(fetch(assertion(login)));
});
test('timeout closes listener and reports timeout', async () => {
  const f = fixture({timeoutMs:30});const pending=f.service.connect();const login=await f.browserOpened;
  assert.deepEqual(await pending,{error:'timeout'});
  await assert.rejects(fetch(assertion(login)));
});
test('cancelling during provider verification aborts it and cannot return a linked identity', async () => {
  let entered;const started=new Promise(resolve=>{entered=resolve;});
  const f=fixture({fetch:async (_url,options) => {entered();return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));}});
  const pending=f.service.connect();const login=await f.browserOpened;
  const callback=fetch(assertion(login)).catch(()=>null);await started;f.service.cancel();
  assert.deepEqual(await pending,{error:'cancelled'});await callback;
});
test('Steam browser cancellation and browser launch failure finish connection', async () => {
  const f=fixture();const pending=f.service.connect();const login=await f.browserOpened;
  const callback=new URL(login.searchParams.get('openid.return_to'));callback.searchParams.set('openid.mode','cancel');
  await fetch(callback);assert.deepEqual(await pending,{error:'cancelled'});
  const fail=new SteamOpenId({openExternal:async()=>{throw new Error('failed');}});
  assert.deepEqual(await fail.connect(),{error:'browser-error'});
});
