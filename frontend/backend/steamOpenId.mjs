import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const ENDPOINT = 'https://steamcommunity.com/openid/login';
const NS = 'http://specs.openid.net/auth/2.0';
const IDENTIFIER = `${NS}/identifier_select`;
const REQUIRED_SIGNED = ['op_endpoint', 'claimed_id', 'identity', 'return_to', 'response_nonce', 'assoc_handle'];

// Passing only the URL lets installed Chrome use its existing browser session.
export function createSteamBrowserLauncher({ openExternal, env = process.env, platform = process.platform, fileStat = stat, spawnBrowser = spawn } = {}) {
  return async (url, {signal} = {}) => {
    const target = new URL(url);
    if (target.origin !== 'https://steamcommunity.com' || target.pathname !== '/openid/login' || target.username || target.password) throw new Error('invalid-browser-url');
    if (platform === 'win32') {
      const candidates = [...new Set([env.ProgramFiles, env['ProgramFiles(x86)'], env.LOCALAPPDATA].filter(Boolean).map(root => join(root, 'Google', 'Chrome', 'Application', 'chrome.exe')))];
      for (const executable of candidates) {
        let installed = false;
        try { installed = (await fileStat(executable)).isFile(); } catch {}
        signal?.throwIfAborted();
        if (!installed) continue;
        await new Promise((resolve, reject) => {
          const child = spawnBrowser(executable, [target.href], { detached:true, stdio:'ignore', windowsHide:true, shell:false });
          child.once('error', reject);
          child.once('spawn', () => { child.unref(); resolve(); });
        });
        return;
      }
    }
    signal?.throwIfAborted();
    await openExternal(target.href);
  };
}

// Steam verifies the assertion itself. The browser only returns a claimed identity.
export class SteamOpenId {
  constructor({ openExternal, fetch = globalThis.fetch, now = Date.now, timeoutMs = 180_000 } = {}) {
    this.openExternal = openExternal; this.fetch = fetch; this.now = now; this.timeoutMs = timeoutMs;
    this.active = null;
  }
  cancel() { this.active?.finish({ error: 'cancelled' }); }
  connect() {
    if (this.active) return Promise.resolve({ error: 'connection-in-progress' });
    return new Promise(resolve => {
      const controller = new AbortController();
      const session = { settled: false, verifying: false, server: null, timer: null, finish: result => {
        if (session.settled) return;
        session.settled = true; clearTimeout(session.timer); controller.abort();
        session.server?.close(); session.server?.closeIdleConnections();
        if (result.error === 'cancelled' || result.error === 'timeout') session.server?.closeAllConnections();
        if (this.active === session) this.active = null;
        resolve(result);
      } };
      this.active = session;
      const state = randomBytes(32).toString('hex');
      let returnTo;
      const reply = (response, status, message) => {
        response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'" });
        response.end(message);
      };
      const server = createServer(async (request, response) => {
        if (request.method !== 'GET' || !request.url || request.url.length > 16_384) { reply(response, 400, 'Invalid Steam callback.'); return; }
        let callback;
        try { callback = new URL(request.url, returnTo); } catch { reply(response, 400, 'Invalid Steam callback.'); return; }
        const params = callback.searchParams;
        const duplicate = [...new Set(params.keys())].some(key => params.getAll(key).length !== 1);
        if (callback.origin !== new URL(returnTo).origin || callback.pathname !== '/steam/callback' || params.get('state') !== state || duplicate || session.settled || session.verifying) { reply(response, 400, 'Invalid Steam callback.'); return; }
        if (params.get('openid.mode') === 'cancel') { reply(response, 200, 'Steam connection cancelled. You can return to Nexus.'); session.finish({error:'cancelled'}); return; }
        const identity = params.get('openid.claimed_id') || '';
        const match = identity.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
        const nonce = params.get('openid.response_nonce') || '';
        const stamp = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ/.exec(nonce)?.[0];
        const age = this.now() - Date.parse(stamp || '');
        const signed = (params.get('openid.signed') || '').split(',');
        if (params.get('openid.ns') !== NS || params.get('openid.mode') !== 'id_res' || params.get('openid.op_endpoint') !== ENDPOINT || params.get('openid.return_to') !== returnTo || !match || params.get('openid.identity') !== identity || !Number.isFinite(age) || age < -30_000 || age > 300_000 || !REQUIRED_SIGNED.every(key => signed.includes(key)) || !params.get('openid.sig') || !params.get('openid.assoc_handle')) {
          reply(response, 400, 'Invalid Steam assertion.'); return;
        }
        session.verifying = true;
        const body = new URLSearchParams([...params].filter(([key]) => key.startsWith('openid.')));
        body.set('openid.mode', 'check_authentication');
        try {
          const verified = await this.fetch(ENDPOINT, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:body.toString(), redirect:'error', signal:AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) });
          const text = verified.ok ? await verified.text() : '';
          if (session.settled) { reply(response, 410, 'Steam connection closed.'); return; }
          if (!/^is_valid:true\r?$/m.test(text) || text.length > 16_384) { reply(response, 401, 'Steam could not verify this connection. Return to Nexus to retry.'); session.finish({error:'invalid-auth'}); return; }
          reply(response, 200, 'Steam account connected. You can close this tab and return to Nexus.');
          session.finish({steamId:match[1]});
        } catch { reply(response, 502, 'Steam verification failed. Return to Nexus to retry.'); session.finish({error:'invalid-auth'}); }
      });
      session.server = server;
      server.requestTimeout = 10_000; server.headersTimeout = 10_000; server.maxHeadersCount = 50;
      server.on('error', () => session.finish({error:'error'}));
      session.timer = setTimeout(() => session.finish({error:'timeout'}), this.timeoutMs);
      server.listen(0, '127.0.0.1', async () => {
        if (session.settled) { server.close(); return; }
        const origin = `http://127.0.0.1:${server.address().port}`;
        returnTo = `${origin}/steam/callback?state=${state}`;
        const url = new URL(ENDPOINT);
        Object.entries({'openid.ns':NS,'openid.mode':'checkid_setup','openid.return_to':returnTo,'openid.realm':`${origin}/`,'openid.identity':IDENTIFIER,'openid.claimed_id':IDENTIFIER}).forEach(([key,value]) => url.searchParams.set(key,value));
        try { await this.openExternal(url.href,{signal:controller.signal}); } catch { session.finish({error:'browser-error'}); }
      });
    });
  }
}
