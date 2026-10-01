import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, resolve, win32 } from "node:path";

const existsAsDirectory = async (path) => (await stat(path).catch(() => null))?.isDirectory() ?? false;
const key = (path) => resolve(path).toLocaleLowerCase();
const readText = async (path) => {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile() || info.size > 2 * 1024 * 1024) return "";
  return readFile(path, "utf8").catch(() => "");
};

export async function mountedDriveRoots() {
  if (process.platform !== "win32") return [];
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const results = await Promise.all(letters.map(async (letter) => {
    const path = `${letter}:\\`;
    return await existsAsDirectory(path) ? path : null;
  }));
  return results.filter(Boolean);
}

function vdfValue(text, field) {
  const match = text.match(new RegExp(`"${field}"\\s*"((?:\\\\.|[^"\\\\])*)"`, "i"));
  return match?.[1]?.replace(/\\\\/g, "\\").replace(/\\"/g, '"');
}

function steamLibraryPaths(text) {
  return [...text.matchAll(/"path"\s*"((?:\\.|[^"\\])*)"/gi)]
    .map((match) => match[1].replace(/\\\\/g, "\\").replace(/\\"/g, '"'));
}

async function discoverSteam(steamRoots) {
  const libraries = new Map();
  for (const root of steamRoots) {
    if (!await existsAsDirectory(join(root, "steamapps"))) continue;
    libraries.set(key(root), root);
    const list = await readText(join(root, "steamapps", "libraryfolders.vdf"));
    for (const path of steamLibraryPaths(list)) libraries.set(key(path), path);
  }
  const candidates = [];
  for (const root of libraries.values()) {
    const apps = join(root, "steamapps");
    const entries = await readdir(apps, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isFile() || !/^appmanifest_\d+\.acf$/i.test(entry.name)) continue;
      const text = await readText(join(apps, entry.name));
      const title = vdfValue(text, "name");
      const folder = vdfValue(text, "installdir");
      const appId = vdfValue(text, "appid") || entry.name.match(/\d+/)?.[0];
      if (!title || !folder || !appId || /steamworks common redistributables/i.test(title) || /[\\/]/.test(folder)) continue;
      const path = join(apps, "common", folder);
      if (await existsAsDirectory(path)) candidates.push({ path: await realpath(path), title, platform: "Steam", storeId: String(appId) });
    }
  }
  return candidates;
}

async function discoverEpic(manifestDirs) {
  const candidates = [];
  for (const folder of manifestDirs) {
    const entries = await readdir(folder, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".item")) continue;
      try {
        const manifest = JSON.parse(await readText(join(folder, entry.name)));
        const path = manifest.InstallLocation;
        if (typeof path !== "string" || typeof manifest.DisplayName !== "string" || !path || !(isAbsolute(path) || win32.isAbsolute(path))) continue;
        if (await existsAsDirectory(path)) candidates.push({ path: await realpath(path), title: manifest.DisplayName, platform: "Epic", storeId: String(manifest.AppName || manifest.CatalogItemId || "") });
      } catch { /* Ignore incomplete or invalid launcher manifests. */ }
    }
  }
  return candidates;
}

export async function discoverStoreGames(options = {}) {
  const drives = options.driveRoots ?? await mountedDriveRoots();
  const steamRoots = options.steamRoots ?? [
    ...drives.flatMap((drive) => [join(drive, "SteamLibrary"), join(drive, "Steam"), join(drive, "Program Files (x86)", "Steam"), join(drive, "Program Files", "Steam")]),
  ];
  const programData = process.env.ProgramData || "C:\\ProgramData";
  const epicManifestDirs = options.epicManifestDirs ?? [join(programData, "Epic", "EpicGamesLauncher", "Data", "Manifests"), ...drives.map((drive) => join(drive, "ProgramData", "Epic", "EpicGamesLauncher", "Data", "Manifests"))];
  const [steam, epic] = await Promise.all([discoverSteam(steamRoots), discoverEpic(epicManifestDirs)]);
  const distinct = new Map();
  for (const game of [...steam, ...epic]) if (!distinct.has(key(game.path))) distinct.set(key(game.path), game);
  return { drives, games: [...distinct.values()] };
}
