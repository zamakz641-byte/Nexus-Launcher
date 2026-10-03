import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { extname, basename, dirname, join, resolve, sep } from "node:path";
import { spawn } from "node:child_process";
import { userInfo } from "node:os";
import { createHash } from "node:crypto";
import { LibraryRegistry } from "./backend/libraryRegistry.mjs";
import { discoverStoreGames } from "./backend/storeDiscovery.mjs";
import { pickWindowsGamePath } from "./backend/windowsPicker.mjs";
import { MediaCache } from "./backend/mediaCache.mjs";

let runtimeConfig = { libraryRoot: process.env.NEXUS_GAMES_ROOT || "F:\\Games", steamGridDbApiKey: process.env.STEAMGRIDDB_API_KEY || "" };
const ignoredFolder = /^(redist|_commonredist|support|installer|installers|rdr2 updated setup files)$/i;
const ignoredExecutable = /(unins|uninstall|setup|redist|trainer|crash|report|dxweb|vcredist|dotnet|physx|quick ?sfv|benchmark)/i;
const artworkNames = /^(cover|folder|hero|background|header|library_hero|capsule)[-_ ]?/i;
const steamAppIds = new Map([
  ["call-of-duty-black-ops-2", 202970],
  ["dragonsword-awakening", 4570720],
  ["formula-legends", 3194360],
  ["ghost-of-tsushima-director-s-cut", 2215430],
  ["mortal-kombat-1", 1971870],
  ["red-dead-redemption-2", 1174180],
  ["split-fiction", 2001120],
]);
const steamMetadataCache = new Map();
const steamGridDbCache = new Map();
const catalogSearchCache = new Map();
let remoteMediaCache;
let devRegistryPromise;
let devDiscoveryFingerprint = "";
let devPlaytimeRevision = 0;
let devDeliveredPlaytimeRevision = 0;
async function getDevRegistry() {
  if (!devRegistryPromise) devRegistryPromise = (async () => {
    const profile = join(process.env.LOCALAPPDATA || process.cwd(), "NexusLauncherDev", createHash("sha256").update(resolve(runtimeConfig.libraryRoot).toLowerCase()).digest("hex").slice(0, 12));
    await mkdir(profile, { recursive: true });
    const registry = new LibraryRegistry(profile, desktopScanLibrary);
    await registry.load();
    if (await stat(runtimeConfig.libraryRoot).then((info) => info.isDirectory()).catch(() => false)) await registry.addFolder(runtimeConfig.libraryRoot, "collection", false);
    const discovery = await discoverStoreGames();
    await registry.syncAutoSources(discovery.games);
    devDiscoveryFingerprint = JSON.stringify({ drives: discovery.drives, games: discovery.games.map((game) => [game.path, game.storeId]) });
    return registry;
  })();
  return devRegistryPromise;
}

async function refreshDevSources(registry) {
  const discovery = await discoverStoreGames();
  const next = JSON.stringify({ drives: discovery.drives, games: discovery.games.map((game) => [game.path, game.storeId]) });
  const changed = next !== devDiscoveryFingerprint;
  devDiscoveryFingerprint = next;
  await registry.syncAutoSources(discovery.games);
  return changed;
}
const cacheDirectory = resolve(process.env.NEXUS_CACHE_DIR || process.cwd(), ".nexus-cache");
const libraryCacheFile = (root, direct = false, titleHint = "", storeId = "") => join(cacheDirectory, `library-${createHash("sha256").update(`${resolve(root).toLowerCase()}:${direct}:${titleHint}:${storeId}`).digest("hex").slice(0, 16)}.json`);

function titleFromFolder(folder) {
  return folder
    .replace(/(?:-|\s)(?:AnkerGames|SteamRIP\.com).*$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\bDIRECTORS CUT\b/i, "Director's Cut")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)([a-z])/g, (_, space, letter) => `${space}${letter.toUpperCase()}`);
}

function slug(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function insideRoot(candidate, root) {
  const resolvedRoot = resolve(root).toLowerCase();
  const resolvedCandidate = resolve(candidate).toLowerCase();
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${sep}`);
}

async function inspectGameFolder(folderPath, folderName) {
  const queue = [{ path: folderPath, depth: 0 }];
  const executables = [];
  const artworks = [];
  let visited = 0;
  while (queue.length > 0 && visited < 360) {
    const current = queue.shift();
    if (!current) break;
    let entries = [];
    try { entries = await readdir(current.path, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      visited += 1;
      const fullPath = join(current.path, entry.name);
      if (entry.isDirectory() && current.depth < 3 && !ignoredFolder.test(entry.name)) queue.push({ path: fullPath, depth: current.depth + 1 });
      if (!entry.isFile()) continue;
      const extension = extname(entry.name).toLowerCase();
      if (extension === ".exe" && !ignoredExecutable.test(entry.name)) executables.push(fullPath);
      if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) artworks.push(fullPath);
    }
  }

  const folderTokens = slug(folderName).split("-").filter((token) => token.length > 2);
  const scoreExecutable = (file) => {
    const name = slug(basename(file, extname(file)));
    return folderTokens.reduce((score, token) => score + (name.includes(token) ? 12 : 0), 0)
      + (/(shipping|win64|game|client|sp)$/i.test(name) ? 8 : 0)
      - file.split(/[\\/]/).length;
  };
  executables.sort((a, b) => scoreExecutable(b) - scoreExecutable(a));
  artworks.sort((a, b) => Number(artworkNames.test(basename(b))) - Number(artworkNames.test(basename(a))));
  return { executablePath: executables[0], artworkPath: artworks[0] };
}

async function getSteamMetadata(title, knownAppId) {
  let appId = knownAppId ? Number(knownAppId) : steamAppIds.get(slug(title));
  if (!appId) {
    try {
      const response = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=french&cc=FR`, { signal: AbortSignal.timeout(4500) });
      if (response.ok) {
        const payload = await response.json();
        const exact = (payload?.items ?? []).filter((item) => item?.type === "app" && slug(item.name) === slug(title));
        if (exact.length === 1) appId = exact[0].id;
      }
    } catch { /* Local artwork remains available offline. */ }
  }
  if (!appId) return undefined;
  if (steamMetadataCache.has(appId)) return steamMetadataCache.get(appId);
  try {
    const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=french&cc=fr`, { signal: AbortSignal.timeout(4500) });
    if (!response.ok) return undefined;
    const payload = await response.json();
    const data = payload?.[appId]?.data ?? Object.values(payload ?? {}).find((entry) => Number(entry?.data?.steam_appid) === Number(appId))?.data;
    if (!data) return undefined;
    const steamGridDb = await getSteamGridDbMetadata(appId, title);
    const metadata = {
      appId,
      title: data.name,
      description: String(data.short_description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      developer: data.developers?.join(", "),
      publisher: data.publishers?.join(", "),
      releaseDate: data.release_date?.date,
      genre: data.genres?.[0]?.description,
      features: data.categories?.slice(0, 3).map((category) => category.description).filter(Boolean),
      trailerUrl: data.movies?.[0]?.mp4?.max || data.movies?.[0]?.webm?.max || data.movies?.[0]?.hls_h264,
      trailerTitle: data.movies?.[0]?.name,
      artworkUrl: steamGridDb?.gridUrl || data.header_image,
      heroArtworkUrl: steamGridDb?.heroUrl || data.background_raw || data.background || data.header_image,
      artworkFallbackUrls: [data.header_image, `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`].filter(Boolean),
      heroFallbackUrls: [data.background_raw, data.background, data.header_image].filter(Boolean),
      logoUrl: steamGridDb?.logoUrl,
      metadataProvider: steamGridDb ? "Steam + SteamGridDB" : "Steam",
    };
    steamMetadataCache.set(appId, metadata);
    return metadata;
  } catch {
    return undefined;
  }
}

async function steamGridDbRequest(path) {
  if (!runtimeConfig.steamGridDbApiKey) return undefined;
  const response = await fetch(`https://www.steamgriddb.com/api/v2${path}`, {
    headers: { Authorization: `Bearer ${runtimeConfig.steamGridDbApiKey}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return undefined;
  const payload = await response.json();
  return payload?.success ? payload.data : undefined;
}

async function getSteamGridDbMetadata(appId, title) {
  if (!runtimeConfig.steamGridDbApiKey) return undefined;
  if (steamGridDbCache.has(appId)) return steamGridDbCache.get(appId);
  try {
    let [grids, heroes, logos] = await Promise.all([
      steamGridDbRequest(`/grids/steam/${appId}?dimensions=920x430,460x215&types=static`),
      steamGridDbRequest(`/heroes/steam/${appId}?dimensions=1920x620,3840x1240&types=static`),
      steamGridDbRequest(`/logos/steam/${appId}?styles=official`),
    ]);
    let gameId;
    if (!grids?.length && !heroes?.length && !logos?.length) {
      let game = await steamGridDbRequest(`/games/steam/${appId}`);
      if (!game?.id) {
        const matches = await steamGridDbRequest(`/search/autocomplete/${encodeURIComponent(title)}`);
        const exact = (matches ?? []).filter((item) => slug(item.name || "") === slug(title));
        game = exact.length === 1 ? exact[0] : undefined;
      }
      if (!game?.id) return undefined;
      gameId = game.id;
      [grids, heroes, logos] = await Promise.all([
        steamGridDbRequest(`/grids/game/${game.id}?dimensions=920x430,460x215&types=static`),
        steamGridDbRequest(`/heroes/game/${game.id}?dimensions=1920x620,3840x1240&types=static`),
        steamGridDbRequest(`/logos/game/${game.id}?styles=official`),
      ]);
    }
    const preferred = (items = []) => items.find((item) => !item.nsfw && !item.humor) ?? items[0];
    const metadata = { gameId, gridUrl: preferred(grids)?.url, heroUrl: preferred(heroes)?.url, logoUrl: preferred(logos)?.url };
    steamGridDbCache.set(appId, metadata);
    return metadata;
  } catch {
    return undefined;
  }
}

async function readLibraryCache(root, signature, direct = false, titleHint = "", storeId = "", allowStale = false) {
  try {
    const cached = JSON.parse(await readFile(libraryCacheFile(root, direct, titleHint, storeId), "utf8"));
    if (cached.root !== root || !Array.isArray(cached.games) || (!allowStale && cached.version !== 2)) return undefined;
    const fresh = Date.now() - new Date(cached.cachedAt).valueOf() < 5 * 60 * 1000;
    if (!allowStale && !fresh && (!signature || cached.signature !== signature)) return undefined;
    return cached.games;
  } catch {
    return undefined;
  }
}

async function writeLibraryCache(root, signature, games, direct = false, titleHint = "", storeId = "") {
  try {
    await mkdir(cacheDirectory, { recursive: true });
    await writeFile(libraryCacheFile(root, direct, titleHint, storeId), JSON.stringify({ version: 2, root, signature, cachedAt: new Date().toISOString(), games }), "utf8");
  } catch {
    // The library remains usable when the optional local cache cannot be written.
  }
}

async function searchSteamCatalog(query) {
  const normalized = query.trim().slice(0, 80);
  if (normalized.length < 2) return [];
  const cacheKey = normalized.toLocaleLowerCase("fr");
  const cached = catalogSearchCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < 10 * 60 * 1000) return cached.items;
  const response = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(normalized)}&l=french&cc=FR`, { signal: AbortSignal.timeout(4500) });
  if (!response.ok) throw new Error("Catalogue Steam indisponible");
  const payload = await response.json();
  const items = (payload?.items ?? []).filter((item) => item?.type === "app").slice(0, 12).map((item) => ({
    id: item.id,
    title: item.name,
    artwork: item.tiny_image ? `/api/library/media?url=${encodeURIComponent(item.tiny_image)}` : "/assets/brand/nexus-mark.png",
    price: item.price ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: item.price.currency }).format(item.price.final / 100) : "Voir sur Steam",
    metascore: item.metascore || undefined,
    controller: item.controller_support === "full",
    platforms: Object.entries(item.platforms ?? {}).filter(([, enabled]) => enabled).map(([platform]) => platform),
    storeUrl: `https://store.steampowered.com/app/${item.id}`,
  }));
  catalogSearchCache.set(cacheKey, { createdAt: Date.now(), items });
  return items;
}

function isAllowedMediaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["steamstatic.com", "steamgriddb.com", "steamusercontent.com"].some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

async function serveRemoteMedia(value, response, refresh = false) {
  if (!isAllowedMediaUrl(value)) { response.statusCode = 403; response.end("Media source not allowed"); return; }
  remoteMediaCache ??= new MediaCache(join(process.env.NEXUS_CACHE_DIR || process.cwd(), ".nexus-cache", "media"));
  const cached = await remoteMediaCache.get(value, refresh);
  response.setHeader("Content-Type", cached.contentType);
  response.setHeader("Cache-Control", "public, max-age=86400");
  response.end(cached.buffer);
}

async function scanLibrary(root, force = false, direct = false, titleHint, platform, storeId) {
  const previous = await readLibraryCache(root, undefined, direct, titleHint, storeId, true) || [];
  if (force) { steamMetadataCache.clear(); steamGridDbCache.clear(); }
  if (!force) {
    const freshGames = await readLibraryCache(root, undefined, direct, titleHint, storeId);
    if (freshGames) return { games: freshGames, cached: true };
  }
  const folders = await readdir(root, { withFileTypes: true });
  const childFolders = folders.filter((entry) => entry.isDirectory() && !ignoredFolder.test(entry.name));
  const rootExecutable = folders.some((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".exe" && !ignoredExecutable.test(entry.name));
  const supportOnlyChildren = childFolders.length > 0 && childFolders.every((entry) => /^(bin|binaries|content|data|engine|game|system|files|assets|win64|x64)$/i.test(entry.name));
  const directGame = direct || (childFolders.length === 0 && rootExecutable) || (supportOnlyChildren && rootExecutable);
  const gameFolders = directGame ? [{ name: basename(root) }] : childFolders;
  const folderStats = await Promise.all(gameFolders.map(async (folder) => ({ folder, info: await stat(directGame ? root : join(root, folder.name)) })));
  const signature = folderStats.map(({ folder, info }) => `${folder.name}:${info.mtimeMs}`).sort().join("|");
  if (!force) {
    const cachedGames = await readLibraryCache(root, signature, direct, titleHint, storeId);
    if (cachedGames) return { games: cachedGames, cached: true };
  }
  const games = await Promise.all(folderStats.map(async ({ folder, info: folderStat }) => {
    const folderPath = directGame ? root : join(root, folder.name);
    const title = direct && titleHint ? titleHint : titleFromFolder(folder.name);
    const [detected, fetchedMetadata] = await Promise.all([inspectGameFolder(folderPath, folder.name), getSteamMetadata(title, platform === "Steam" ? storeId : undefined)]);
    const previousGame = previous.find(game => game.folderPath === folderPath && game.title === title);
    const steamMetadata = fetchedMetadata || previousGame?.steamMetadata;
    return {
      id: `local-${slug(folder.name)}`,
      title,
      folderPath,
      executablePath: detected.executablePath,
      executableName: detected.executablePath ? basename(detected.executablePath) : undefined,
      artworkUrl: steamMetadata?.artworkUrl || (detected.artworkPath ? `/api/library/artwork?file=${encodeURIComponent(detected.artworkPath)}&root=${encodeURIComponent(root)}` : undefined),
      steamMetadata,
      modifiedAt: folderStat.mtime.toISOString(),
    };
  }));
  const sortedGames = games.sort((a, b) => a.title.localeCompare(b.title));
  await writeLibraryCache(root, signature, sortedGames, direct, titleHint, storeId);
  return { games: sortedGames, cached: false };
}

export function configureDesktopRuntime({ libraryRoot, steamGridDbApiKey } = {}) {
  runtimeConfig = {
    libraryRoot: libraryRoot || process.env.NEXUS_GAMES_ROOT || runtimeConfig.libraryRoot || "F:\\Games",
    steamGridDbApiKey: steamGridDbApiKey || process.env.STEAMGRIDDB_API_KEY || runtimeConfig.steamGridDbApiKey || "",
  };
}
export function setSteamGridDbApiKey(value) {
  runtimeConfig.steamGridDbApiKey = value || process.env.STEAMGRIDDB_API_KEY || "";
  steamGridDbCache.clear();
  steamMetadataCache.clear();
}

export async function desktopScanLibrary(root, force = false, direct = false, titleHint, platform, storeId) {
  const targetRoot = root || runtimeConfig.libraryRoot;
  const { games, cached } = await scanLibrary(targetRoot, force, direct, titleHint, platform, storeId);
  return { root: targetRoot, scannedAt: new Date().toISOString(), cached, games };
}

export async function desktopSearchCatalog(query) {
  return searchSteamCatalog(query);
}

export function desktopSystemInfo() {
  return {
    profileName: userInfo().username || "Joueur",
    libraryRoot: runtimeConfig.libraryRoot,
    providers: {
      local: true,
      steamStore: true,
      steamGridDb: Boolean(runtimeConfig.steamGridDbApiKey),
    },
  };
}

export function desktopLaunchGame(executablePath, root) {
  const targetRoot = root || runtimeConfig.libraryRoot;
  if (!executablePath || extname(executablePath).toLowerCase() !== ".exe" || !insideRoot(executablePath, targetRoot)) {
    throw new Error("Executable non autorisé");
  }
  spawn(executablePath, [], { cwd: dirname(executablePath), detached: true, stdio: "ignore", windowsHide: false }).unref();
  return { ok: true, requestId: `local:${Date.now()}` };
}

export function localLibraryPlugin() {
  return {
    name: "nexus-local-library",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url || "/", "http://nexus.local");
        if (!url.pathname.startsWith("/api/library/")) return next();
        const root = url.searchParams.get("root") || runtimeConfig.libraryRoot;
        response.setHeader("Cache-Control", "no-store");
        try {
          if (url.pathname === "/api/library/scan" && request.method === "GET") {
            const registry = await getDevRegistry();
            if (root && !registry.data.roots.some((entry) => resolve(entry.path).toLowerCase() === resolve(root).toLowerCase()) && await stat(root).then((info) => info.isDirectory()).catch(() => false)) await registry.addFolder(root, "collection", false);
            await refreshDevSources(registry);
            const snapshot = await registry.scan(undefined, url.searchParams.get("refresh") === "true");
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ root: runtimeConfig.libraryRoot, ...snapshot }));
            return;
          }
          if (url.pathname === "/api/library/changes" && request.method === "GET") {
            const registry = await getDevRegistry();
            const changed = await refreshDevSources(registry);
            const playtimeChanged = devPlaytimeRevision !== devDeliveredPlaytimeRevision;
            devDeliveredPlaytimeRevision = devPlaytimeRevision;
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify(changed || playtimeChanged ? { changed: true, ...(changed ? await registry.scan(undefined, true) : registry.snapshot()) } : { changed: false }));
            return;
          }
          if (url.pathname === "/api/library/add" && request.method === "POST") {
            let body = "";
            for await (const chunk of request) { body += chunk; if (body.length > 4096) throw new Error("Requête trop grande"); }
            const { path, kind } = JSON.parse(body || "{}");
            if (typeof path !== "string" || !path.trim() || !["collection", "game", "executable"].includes(kind)) { response.statusCode = 400; response.end("Invalid game path"); return; }
            const registry = await getDevRegistry();
            const snapshot = kind === "executable" ? await registry.addExecutable(path) : await registry.addFolder(path, kind);
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify(snapshot));
            return;
          }
          if (url.pathname === "/api/library/pick" && request.method === "POST") {
            let body = "";
            for await (const chunk of request) { body += chunk; if (body.length > 1024) throw new Error("Requête trop grande"); }
            const { kind } = JSON.parse(body || "{}");
            if (!["collection", "game", "executable"].includes(kind)) { response.statusCode = 400; response.end("Invalid picker type"); return; }
            const path = await pickWindowsGamePath(kind);
            if (!path) { response.setHeader("Content-Type", "application/json; charset=utf-8"); response.end(JSON.stringify({ cancelled: true })); return; }
            const registry = await getDevRegistry();
            const snapshot = kind === "executable" ? await registry.addExecutable(path) : await registry.addFolder(path, kind);
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify(snapshot));
            return;
          }
          if (url.pathname === "/api/library/remove" && request.method === "POST") {
            let body = "";
            for await (const chunk of request) { body += chunk; if (body.length > 4096) throw new Error("Requête trop grande"); }
            const { id } = JSON.parse(body || "{}");
            if (typeof id !== "string") { response.statusCode = 400; response.end("Invalid game ID"); return; }
            const snapshot = await (await getDevRegistry()).remove(id);
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify(snapshot));
            return;
          }
          if (url.pathname === "/api/library/game-title" && request.method === "POST") {
            let body = "";
            for await (const chunk of request) { body += chunk; if (body.length > 4096) throw new Error("Requête trop grande"); }
            const { id, title } = JSON.parse(body || "{}");
            const snapshot = await (await getDevRegistry()).setTitle(String(id), title);
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify(snapshot));
            return;
          }
          if (url.pathname === "/api/library/catalog" && request.method === "GET") {
            const items = await searchSteamCatalog(url.searchParams.get("q") || "");
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ items }));
            return;
          }
          if (url.pathname === "/api/library/system" && request.method === "GET") {
            const profileName = userInfo().username || "Joueur";
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify({
              profileName,
              libraryRoot: runtimeConfig.libraryRoot,
              providers: {
                local: true,
                steamStore: true,
                steamGridDb: Boolean(runtimeConfig.steamGridDbApiKey),
              },
            }));
            return;
          }
          if (url.pathname === "/api/library/artwork" && request.method === "GET") {
            const file = url.searchParams.get("file");
            if (!file || !(await (await getDevRegistry()).authorizedArtwork(file))) { response.statusCode = 403; response.end("Forbidden"); return; }
            const extension = extname(file).toLowerCase();
            const types = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
            if (!types[extension]) { response.statusCode = 415; response.end("Unsupported artwork"); return; }
            response.setHeader("Content-Type", types[extension]);
            createReadStream(file).on("error", () => { response.statusCode = 404; response.end("Not found"); }).pipe(response);
            return;
          }
          if (url.pathname === "/api/library/media" && request.method === "GET") {
            await serveRemoteMedia(url.searchParams.get("url") || "", response, url.searchParams.has("retry"));
            return;
          }
          if (url.pathname === "/api/library/launch" && request.method === "POST") {
            let body = "";
            for await (const chunk of request) body += chunk;
            const { gameId } = JSON.parse(body || "{}");
            const registry = await getDevRegistry();
            const actual = await registry.authorizedExecutable(String(gameId)).catch(() => "");
            if (!actual) {
              response.statusCode = 400; response.end(JSON.stringify({ error: "Executable non autorisé" })); return;
            }
            const child = spawn(actual, [], { cwd: dirname(actual), detached: true, stdio: "ignore", windowsHide: false });
            registry.trackLaunchedProcess(String(gameId), child, () => { devPlaytimeRevision += 1; });
            child.unref();
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ ok: true, requestId: `local:${Date.now()}` }));
            return;
          }
          response.statusCode = 404;
          response.end("Not found");
        } catch (error) {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  runtimeConfig = {
    libraryRoot: env.NEXUS_GAMES_ROOT || process.env.NEXUS_GAMES_ROOT || "F:\\Games",
    steamGridDbApiKey: env.STEAMGRIDDB_API_KEY || process.env.STEAMGRIDDB_API_KEY || "",
  };
  return {
  build: {
    outDir: "dist/client",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("motion")) return "motion";
          if (id.includes("@phosphor-icons")) return "icons";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("i18next")) return "i18n";
          if (id.includes("react-router") || id.includes("react-dom") || id.includes("react/")) return "react-vendor";
          return undefined;
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "127.0.0.1",
    allowedHosts: ["terminal.local"],
    watch: { ignored: ["**/artifacts/**", "**/release/**"] },
    warmup: {
      clientFiles: ["./src/main.tsx"],
    },
  },
    plugins: [localLibraryPlugin(), react(), tailwindcss()],
  };
});
