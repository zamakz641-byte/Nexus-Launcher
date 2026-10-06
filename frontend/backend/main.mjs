import { app, BrowserWindow, dialog, ipcMain, net, protocol, safeStorage, shell, screen } from "electron";
import { readFile, stat } from "node:fs/promises";
import { extname, isAbsolute, join, normalize, relative, resolve, dirname } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from 'node:crypto';
import { EventBus, ModuleHost } from './core/moduleHost.mjs';
import { GameActivity } from './modules/gameActivity.mjs';
import { AchievementsModule } from './modules/achievements.mjs';
import { NotificationOverlayModule } from './overlay/notifications.mjs';
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";
import { LibraryRegistry } from "./libraryRegistry.mjs";
import { discoverStoreGames } from "./storeDiscovery.mjs";
import { SecretStore } from "./secretStore.mjs";
import { MediaCache } from "./mediaCache.mjs";
import { trackGameSession } from "./gameSession.mjs";
import { AchievementMonitor } from './achievementNotifications.mjs';
import { AchievementOverlay } from './achievementOverlay.mjs';
import { SanCompanion } from './sanCompanion.mjs';
let sanCompanion;
function getSanCompanion(){return sanCompanion ||= new SanCompanion(app.getPath('userData'));}
import { LocalSteamProgress } from "./steamLocal.mjs";
import { SanInstaller } from "./sanInstaller.mjs";

import { StoreAccounts } from './storeAccounts.mjs';
import { createStoreLogin } from './storeLogin.mjs';

let achievementOverlay, achievementMonitor, mainWindow;
function getAchievementOverlay() {
  if(!achievementOverlay||achievementOverlay.disposed)achievementOverlay=new AchievementOverlay(BrowserWindow,()=>mainWindow&&!mainWindow.isDestroyed()?screen.getDisplayMatching(mainWindow.getBounds()):screen.getDisplayNearestPoint(screen.getCursorScreenPoint()));
  return achievementOverlay;
}
function getAchievementMonitor(){return achievementMonitor ||= new AchievementMonitor(getSteamAchievements(),notice=>void eventBus.publish('AchievementUnlocked',notice),{settings:()=>getSteamAchievements().notificationSettings()});}
function broadcastSteamData(){for(const window of BrowserWindow.getAllWindows())if(!window.isDestroyed()&&window.webContents.getURL().startsWith('nexus://app/'))window.webContents.send('nexus:steam-data-changed');}
let artworkCache;
const gameSessions = new Map();
const moduleSessions = new Map();
const eventBus = new EventBus();
const modules = new ModuleHost(eventBus);
let gameActivity, achievementsModule;
async function startModules() {
  gameActivity = new GameActivity(app.getPath('userData'), {recordPlaytime:async (id,seconds)=>{
    const registry=await getRegistry();await registry.recordPlaytime(id,seconds);
    for(const window of BrowserWindow.getAllWindows())if(!window.isDestroyed()&&window.webContents.getURL().startsWith('nexus://app/'))window.webContents.send('nexus:library-changed',registry.snapshot());
  }});
  achievementsModule = new AchievementsModule({companion:getSanCompanion,monitor:getAchievementMonitor,
    progress:getSteamAchievements,sessionFor:id=>moduleSessions.get(id),broadcast:broadcastSteamData});
  await modules.register(gameActivity);
  await modules.register(achievementsModule);
  await modules.register(new NotificationOverlayModule(getAchievementOverlay));
  eventBus.subscribe('ActivityChanged',({gameId})=>{
    for(const window of BrowserWindow.getAllWindows())if(!window.isDestroyed()&&window.webContents.getURL().startsWith('nexus://app/'))window.webContents.send('nexus:activity-changed',gameId);
  });
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: "nexus",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};
let backendPromise;
let registryPromise;
let secretStore;
let steamAchievements;
let sanInstaller;
function openSteam(){return shell.openExternal('steam://open/main');}
function getSanInstaller(){return sanInstaller ||= new SanInstaller(app.getPath('userData'),getSanCompanion(),{fetch:(url,options)=>net.fetch(url,options),openSteam,runInstaller:async(file)=>{
  await new Promise((resolve,reject)=>{const child=spawn(file,[],{shell:false,stdio:'ignore',windowsHide:false});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error('install-cancelled')));});
  for(let i=0;i<15;i++){if((await getSanCompanion().status()).installed)return;await new Promise(resolve=>setTimeout(resolve,2000));}
}});}

let storeAccounts;
function getStoreAccounts() { return storeAccounts ||= new StoreAccounts(app.getPath('userData'), safeStorage, { fetch: (url, options) => net.fetch(url, options), login: createStoreLogin(BrowserWindow) }); }
function getSteamAchievements() { return steamAchievements ||= new LocalSteamProgress(app.getPath("userData")); }
let discoveryFingerprint = "";
let discoveryBusy = false;
function getSecretStore() { return secretStore ||= new SecretStore(app.getPath("userData"), safeStorage); }

function insideRoot(candidate, root) {
  const resolvedRoot = resolve(root).toLowerCase();
  const resolvedCandidate = resolve(candidate).toLowerCase();
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + "\\");
}

function responseFromBuffer(buffer, contentType, cache = "no-store") {
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function getBackend() {
  if (!backendPromise) {
    process.env.NEXUS_GAMES_ROOT ||= process.platform === "win32" ? "F:\\Games" : join(homedir(), "Games");
    process.env.NEXUS_CACHE_DIR ||= app.getPath("userData");
    const configUrl = pathToFileURL(join(app.getAppPath(), "vite.config.mjs")).href;
    backendPromise = import(configUrl).then((module) => {
      module.configureDesktopRuntime?.({ libraryRoot: process.env.NEXUS_GAMES_ROOT });
      return module;
    }).then(async (module) => { module.setSteamGridDbApiKey?.(await getSecretStore().read()); return module; });
  }
  return backendPromise;
}
async function getRegistry() {
  if (!registryPromise) registryPromise = (async () => {
    const backend = await getBackend();
    const registry = new LibraryRegistry(app.getPath("userData"), (root, force, direct, title, platform, storeId) => backend.desktopScanLibrary(root, force, direct, title, platform, storeId));
    await registry.load();
    const discovery = await discoverStoreGames();
    await registry.syncAutoSources(discovery.games);
    discoveryFingerprint = JSON.stringify({ drives: discovery.drives, games: discovery.games.map((game) => [game.path, game.storeId]) });
    return registry;
  })();
  return registryPromise;
}

async function refreshStoreSources(registry) {
  const discovery = await discoverStoreGames();
  const fingerprint = JSON.stringify({ drives: discovery.drives, games: discovery.games.map((game) => [game.path, game.storeId]) });
  const changed = fingerprint !== discoveryFingerprint;
  discoveryFingerprint = fingerprint;
  await registry.syncAutoSources(discovery.games);
  return changed;
}

function watchLibraryVolumes() {
  const timer = setInterval(async () => {
    if (discoveryBusy) return;
    discoveryBusy = true;
    try {
      const registry = await getRegistry();
      if (await refreshStoreSources(registry)) {
        const snapshot = await registry.scan(undefined, true);
        for (const window of BrowserWindow.getAllWindows()) window.webContents.send("nexus:library-changed", snapshot);
      }
    } catch { /* A detached drive is retried on the next poll. */ }
    finally { discoveryBusy = false; }
  }, 15_000);
  timer.unref();
}
async function serveApp(url) {
  const clientRoot = resolve(app.getAppPath(), "dist", "client");
  const requested = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
  let filePath = resolve(clientRoot, normalize(requested));
  const relativePath = relative(clientRoot, filePath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    if (!(await stat(filePath)).isFile()) throw new Error("Not a file");
  } catch {
    filePath = join(clientRoot, "index.html");
  }
  const buffer = await readFile(filePath);
  const type = mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream";
  const cache = filePath.endsWith("index.html") ? "no-store" : "public, max-age=31536000, immutable";
  return responseFromBuffer(buffer, type, cache);
}

function isAllowedRemoteMedia(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      ["steamstatic.com", "steamgriddb.com", "steamusercontent.com"]
        .some((domain) => url.hostname === domain || url.hostname.endsWith("." + domain));
  } catch {
    return false;
  }
}
async function serveMedia(url) {
  if (url.pathname === "/local") {
    const file = url.searchParams.get("file");
    if (!file || !(await (await getRegistry()).authorizedArtwork(file))) return new Response("Forbidden", { status: 403 });
    const extension = extname(file).toLowerCase();
    const type = mimeTypes[extension];
    if (!type || !type.startsWith("image/")) return new Response("Unsupported media", { status: 415 });
    try {
      return responseFromBuffer(await readFile(file), type, "public, max-age=3600");
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  if (url.pathname === "/remote") {
    const value = url.searchParams.get("url") || "";
    if (!isAllowedRemoteMedia(value)) return new Response("Media source not allowed", { status: 403 });
    artworkCache ??= new MediaCache(join(app.getPath("userData"), "media-cache"), (value, options) => net.fetch(value, options));
    const { buffer, contentType } = await artworkCache.get(value, url.searchParams.has("retry"));
    return responseFromBuffer(buffer, contentType, "public, max-age=86400");
  }
  return new Response("Not found", { status: 404 });
}
async function registerDesktopProtocol() {
  protocol.handle("nexus", async (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname === "app") return await serveApp(url);
      if (url.hostname === "media") return await serveMedia(url);
      return new Response("Not found", { status: 404 });
    } catch (error) {
      return new Response(error instanceof Error ? error.message : "Internal error", { status: 500 });
    }
  });
}

function registerIpc() {
  const accountIpc = (channel, handler) => ipcMain.handle(channel, (event, ...args) => {
    if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame || !event.senderFrame.url.startsWith('nexus://app/')) throw new Error('Store account access is restricted to Nexus.');
    return handler(event, ...args);
  });
  ipcMain.handle("nexus:choose-library", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
      title: "Choisir la bibliothèque Nexus",
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return (await (await getRegistry()).addFolder(result.filePaths[0], "collection"));
  });
  ipcMain.handle("nexus:add-game-folder", async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"], title: "Choisir le dossier d’un jeu" });
    if (result.canceled || !result.filePaths[0]) return null;
    return (await (await getRegistry()).addFolder(result.filePaths[0], "game"));
  });

  ipcMain.handle("nexus:add-executable", async () => {
    const result = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Jeux Windows", extensions: ["exe"] }], title: "Ajouter un jeu" });
    if (result.canceled || !result.filePaths[0]) return null;
    return (await (await getRegistry()).addExecutable(result.filePaths[0]));
  });
  ipcMain.handle("nexus:library-list", async () => { const registry = await getRegistry(); await refreshStoreSources(registry); return registry.scan(); });
  ipcMain.handle("nexus:library-remove", async (_event, id) => (await getRegistry()).remove(String(id)));
  ipcMain.handle("nexus:game-title", async (_event, id, title) => (await getRegistry()).setTitle(String(id), title));
  ipcMain.handle("nexus:game-executable", async (_event, id) => {
    const result = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Jeux Windows", extensions: ["exe"] }], title: "Choisir l’exécutable principal" });
    if (result.canceled || !result.filePaths[0]) return null;
    return (await getRegistry()).setExecutable(String(id), result.filePaths[0]);
  });
  ipcMain.handle("nexus:game-artwork", async (_event, id, role) => {
    const result = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }], title: "Choisir une image" });
    if (result.canceled || !result.filePaths[0]) return null;
    return (await getRegistry()).setArtwork(String(id), String(role), result.filePaths[0]);
  });

  ipcMain.handle("nexus:library-scan", async (_event, sourceId, force = false) => { const registry = await getRegistry(); await refreshStoreSources(registry); return registry.scan(sourceId || undefined, Boolean(force)); });
  ipcMain.handle("nexus:catalog-search", async (_event, query) => {
    const backend = await getBackend();
    return backend.desktopSearchCatalog(String(query || ""));
  });
  ipcMain.handle("nexus:system-info", async () => {
    const backend = await getBackend();
    return backend.desktopSystemInfo();
  });
  ipcMain.handle("nexus:steamgrid-status", async () => getSecretStore().status());
  ipcMain.handle("nexus:steam-account-status", async () => getSteamAchievements().status());
  accountIpc('nexus:steam-account-connect',async()=>{await openSteam();const result=await getSteamAchievements().connect();broadcastSteamData();return result;});
  accountIpc('nexus:steam-account-cancel',()=>getSteamAchievements().status());
  accountIpc('nexus:steam-notification-status',()=>getSanInstaller().status());
  accountIpc('nexus:steam-notification-activate',async()=>{await getSteamAchievements().connect();const result=await getSanInstaller().activate();broadcastSteamData();return result;});
  accountIpc('nexus:steam-notification-cancel',async()=>{getSanInstaller().cancel();return getSanInstaller().status();});
  accountIpc('nexus:steam-open',async()=>{await openSteam();return {ok:true};});
  accountIpc('nexus:game-activity',(_event,gameId)=>gameActivity.history(gameId));
  accountIpc('nexus:module-status',()=>modules.status());
  accountIpc('nexus:steam-library', async (_event, force) => getSteamAchievements().getLibrary(force === true));
  accountIpc('nexus:store-account-status', async (_event, provider) => getStoreAccounts().status(provider));
  accountIpc('nexus:store-account-connect', async (event, provider) => getStoreAccounts().connect(provider, BrowserWindow.fromWebContents(event.sender)));
  accountIpc('nexus:store-account-clear', async (_event, provider) => getStoreAccounts().clear(provider));
  accountIpc('nexus:store-library', async (_event, provider, force) => getStoreAccounts().library(provider, force === true));
  accountIpc('nexus:san-status',()=>getSanCompanion().status());
  accountIpc('nexus:san-download',async()=>{await shell.openExternal('https://github.com/SteamAchievementNotifier/SteamAchievementNotifier/releases/latest');return {ok:true};});
  accountIpc('nexus:san-choose',async(event)=>{
    const result=await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender),{properties:['openFile'],filters:[{name:'Steam Achievement Notifier',extensions:['exe']}],title:'Steam Achievement Notifier'});
    return result.canceled?getSanCompanion().status():getSanCompanion().choose(result.filePaths[0]);
  });
  accountIpc('nexus:san-enable',async(_event,enabled)=>{const status=await getSanCompanion().enable(enabled);if(!enabled)await getSanCompanion().stopOwned();return status;});
  accountIpc('nexus:san-launch',async()=>{
    const status=await getSanCompanion().status();if(!status.installed)throw Error('san-not-installed');
    const error=await shell.openPath(status.executable);if(error)throw Error('san-open-failed');
    return {state:'running'};
  });
  accountIpc('nexus:achievement-notification-settings',async()=>getSteamAchievements().notificationSettings());
  accountIpc('nexus:achievement-notification-save',async(_event,value)=>{
    const prefs=await getSteamAchievements().saveNotificationSettings(value);if(!prefs.enabled)achievementOverlay?.dispose();return prefs;
  });
  accountIpc('nexus:achievement-notification-test',async(_event,locale)=>{
    const fr=locale!=='en';getAchievementOverlay().show({test:true,locale:fr?'fr':'en',gameTitle:'Nexus Launcher · '+(fr?'Aperçu uniquement':'Preview only'),achievement:{title:fr?'Prêt pour votre prochain succès':'Ready for your next achievement'}});return {ok:true};
  });
  ipcMain.handle("nexus:steam-account-clear", async () => { achievementOverlay?.dispose(); return getSteamAchievements().clearAccount().then(result=>{broadcastSteamData();return result;}); });
  ipcMain.handle("nexus:steam-achievements", async (_event, appId, locale, force) => getSteamAchievements().getAchievements(appId, locale === 'fr' ? 'fr' : 'en', force === true));
  ipcMain.handle("nexus:steamgrid-save", async (_event, value) => {
    const validate = async (key) => {
      try {
        const response = await net.fetch("https://www.steamgriddb.com/api/v2/search/autocomplete/nexus", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(7000) });
        return response.status === 401 || response.status === 403 ? "invalid" : response.ok ? "valid" : "offline";
      } catch { return "offline"; }
    };
    const status = await getSecretStore().save(value, validate);
    if (status.configured && status.lastCheck !== "invalid") (await getBackend()).setSteamGridDbApiKey(await getSecretStore().read());
    return status;
  });
  ipcMain.handle("nexus:steamgrid-clear", async () => {
    const status = await getSecretStore().clear();
    (await getBackend()).setSteamGridDbApiKey("");
    return status;
  });
  ipcMain.handle("nexus:launch-game", async (event, gameId, locale) => {
    if (gameSessions.has(String(gameId))) throw new Error("Ce jeu est déjà en cours d’exécution dans Nexus.");
    const registry = await getRegistry();
    const file = await registry.authorizedExecutable(String(gameId));
    const game=registry.games.get(String(gameId));
    const companion=await achievementsModule.prepareLaunch(game);
    const child = spawn(file, [], { cwd: dirname(file), detached: true, stdio: "ignore", windowsHide: false });
    await new Promise((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
    const window = BrowserWindow.fromWebContents(event.sender);
    const session = trackGameSession(child);
    const sessionId=randomUUID(),startedAt=new Date().toISOString(),startedTick=performance.now();
    moduleSessions.set(sessionId,session);
    gameSessions.set(String(gameId), session);
    void eventBus.publish('GameStarted',{sessionId,gameId:String(gameId),title:game?.title||String(gameId),game,
      startedAt,locale:locale==='en'?'en':'fr',notificationProvider:companion.state==='running'?'san':'nexus'});
    session.once("exit", () => {
      gameSessions.delete(String(gameId));
      moduleSessions.delete(sessionId);
      void eventBus.publish('GameStopped',{sessionId,stoppedAt:new Date().toISOString(),durationSeconds:Math.max(0,Math.floor((performance.now()-startedTick)/1000))});
      if (!gameSessions.size && window && !window.isDestroyed()) { window.restore(); window.show(); window.focus(); }
    });
    if (window && !window.isDestroyed()) window.minimize();
    child.unref();
    return { ok: true, requestId: `local:${Date.now()}` };
  });
}

async function createWindow() {
  const clientRoot = resolve(app.getAppPath(), "dist", "client");
  const window = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#03070b",
    autoHideMenuBar: true,
    show: false,
    fullscreenable: true,
    fullscreen: true,
    icon: join(clientRoot, "assets", "brand", "nexus-mark.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      preload: join(app.getAppPath(), "backend", "preload.cjs"),
    },
  });

  mainWindow=window;
  window.once('closed',()=>{achievementMonitor?.stopAll();achievementOverlay?.dispose();if(mainWindow===window)mainWindow=null;});
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/store\.steampowered\.com\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F11" && input.type === "keyDown") {
      event.preventDefault();
      window.setFullScreen(!window.isFullScreen());
    }
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  await window.loadURL("nexus://app/");
}

app.whenReady().then(async () => {
  await registerDesktopProtocol();
  await startModules();
  registerIpc();
  watchLibraryVolumes();
  await createWindow();
  const marker=join(process.resourcesPath,'nexus-install-san');
  if(await stat(marker).catch(()=>null)){
    const helper=getSanCompanion(),prefs=await helper.preferences();
    if(!prefs.installerRequestHandled){await helper.save({...prefs,installerRequestHandled:true});void getSanInstaller().activate();}
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
// Finish queued journal writes before exiting; running games remain interrupted on restart.
let moduleShutdown=false;
app.on('before-quit',event=>{
  if(moduleShutdown)return;event.preventDefault();moduleShutdown=true;
  void modules.dispose().finally(()=>app.quit());
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
