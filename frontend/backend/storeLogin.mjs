import { randomUUID } from 'node:crypto';

export const EPIC_CLIENT = '34a02cf8f4414e29b15921876da36f9a';
export const GOG_CLIENT = '46899977096215655';
export const GOG_REDIRECT = 'https://embed.gog.com/on_login_success?origin=client';
export function validateProvider(provider) {
  if (provider !== 'epic' && provider !== 'gog') throw new Error('Unsupported store provider.');
  return provider;
}
export function isLoginNavigationSafe(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443'); } catch { return false; }
}
export function isEpicCodePage(value) {
  try { const u = new URL(value); return u.origin === 'https://www.epicgames.com' && u.pathname === '/id/api/redirect' && u.searchParams.get('clientId') === EPIC_CLIENT && u.searchParams.get('responseType') === 'code'; } catch { return false; }
}
export function readLoginCallback(provider, value, state) {
  validateProvider(provider);
  try {
    const u = new URL(value);
    if (!isLoginNavigationSafe(value)) return null;
    if (provider === 'gog' && (u.origin !== 'https://embed.gog.com' || u.pathname !== '/on_login_success' || u.searchParams.get('origin') !== 'client')) return null;
    if (provider === 'epic' && !isEpicCodePage(value)) return null;
    // GOG currently does not always echo state; a returned state must match this isolated login.
    if (u.searchParams.has('state') && u.searchParams.get('state') !== state) return null;
    const code = u.searchParams.get('code');
    return code && /^[A-Za-z0-9_.~-]{8,2048}$/.test(code) ? code : null;
  } catch { return null; }
}

export function createStoreLogin(BrowserWindow) {
  return (provider, { signal, parent, timeoutMs = 180000 } = {}) => {
    validateProvider(provider);
    const state = randomUUID();
    const redirect = new URL('https://www.epicgames.com/id/api/redirect');
    redirect.search = new URLSearchParams({ clientId: EPIC_CLIENT, responseType: 'code', state }).toString();
    const loginUrl = provider === 'epic'
      ? `https://www.epicgames.com/id/login?redirectUrl=${encodeURIComponent(redirect.href)}`
      : `https://auth.gog.com/auth?${new URLSearchParams({ client_id: GOG_CLIENT, redirect_uri: GOG_REDIRECT, response_type: 'code', layout: 'client2', state })}`;
    return new Promise((resolve, reject) => {
      if (signal?.aborted) { reject(new Error('Connection cancelled.')); return; }
      const window = new BrowserWindow({ width: 720, height: 800, title: provider === 'epic' ? 'Connect Epic Games' : 'Connect GOG', ...(parent ? { parent } : {}), autoHideMenuBar: true,
        webPreferences: { partition: `nexus-store-login-${randomUUID()}`, nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, devTools: false } });
      let finished = false;
      const finish = (error, code) => {
        if (finished) return;
        finished = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
        if (!window.isDestroyed()) window.destroy();
        error ? reject(error) : resolve(code);
      };
      const abort = () => finish(new Error('Connection cancelled.'));
      const timer = setTimeout(() => finish(new Error('Connection timed out. Please try again.')), timeoutMs);
      signal?.addEventListener('abort', abort, { once: true });
      window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
      window.webContents.session.setPermissionCheckHandler(() => false);
      window.webContents.session.on('will-download', event => event.preventDefault());
      window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      window.webContents.on('will-attach-webview', event => event.preventDefault());
      const navigate = (event, url) => {
        const code = readLoginCallback(provider, url, state);
        if (code) { event.preventDefault(); finish(null, code); }
        else if (!isLoginNavigationSafe(url)) event.preventDefault();
      };
      window.webContents.on('will-navigate', navigate);
      window.webContents.on('will-redirect', navigate);
      // Epic's official redirect returns JSON containing authorizationCode, rather than a query callback.
      window.webContents.on('did-finish-load', async () => {
        const url = window.webContents.getURL();
        if (provider !== 'epic' || !isEpicCodePage(url) || finished) return;
        const returnedState = new URL(url).searchParams.get('state');
        if (returnedState !== null && returnedState !== state) { finish(new Error('Epic sign-in could not be verified. Please try again.')); return; }
        try {
          const text = await window.webContents.executeJavaScript('document.body.innerText');
          if (finished || window.webContents.getURL() !== url) return;
          const code = JSON.parse(text).authorizationCode;
          if (typeof code === 'string' && /^[A-Za-z0-9_.~-]{8,2048}$/.test(code)) finish(null, code);
          else finish(new Error('Epic did not return an authorization code. Please try again.'));
        } catch { finish(new Error('Epic sign-in could not be completed. Please try again.')); }
      });
      // close fires before Chromium rejects a pending loadURL as ERR_ABORTED.
      // Mark user cancellation here so that load rejection cannot win the race.
      window.on('close', abort);
      window.on('closed', abort);
      window.loadURL(loginUrl).catch(() => finish(new Error('Store sign-in could not be loaded. Please check your connection.')));
    });
  };
}
