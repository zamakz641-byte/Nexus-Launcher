import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";

const emptyData = () => ({ version: 1, roots: [], manualGames: [], excludedPaths: [], overrides: {}, playtime: {} });
const pathKey = (value) => resolve(value).toLocaleLowerCase();
const idFor = (kind, value) => `${kind}-${createHash("sha256").update(pathKey(value)).digest("hex").slice(0, 16)}`;
export function titleFromExecutable(file) {
  const stem = basename(file, extname(file)).replace(/[_-]+/g, " ").trim();
  let parent = dirname(file);
  while (/^(bin|binaries|win64|x64|release|shipping)$/i.test(basename(parent)) && dirname(parent) !== parent) parent = dirname(parent);
  const folder = basename(parent).replace(/[_-]+/g, " ").trim();
  return /^(game|launcher|launch|start|client|shipping|win64|x64)$/i.test(stem) && folder ? folder : stem;
}

export function isWithin(candidate, root) {
  const rel = relative(root, candidate);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

export class LibraryRegistry {
  constructor(userData, scanFolder) {
    this.file = join(userData, "library-registry.json");
    this.scanFolder = scanFolder;
    this.data = emptyData();
    this.games = new Map();
    this.errors = {};
  }

  async load() {
    try {
      const parsed = JSON.parse(await readFile(this.file, "utf8"));
      if (parsed.version === 1 && Array.isArray(parsed.roots) && Array.isArray(parsed.manualGames)) {
        this.data = { ...emptyData(), ...parsed };
      }
    } catch { /* New profile or unreadable old registration. */ }
    return this.snapshot();
  }

  async persist() {
    const temporary = `${this.file}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(this.data, null, 2), "utf8");
    await rename(temporary, this.file);
  }

  snapshot() {
    return {
      roots: this.data.roots.map((root) => ({ ...root })),
      manualGames: this.data.manualGames.map((game) => ({ ...game })),
      games: [...this.games.values()].map((game) => {
        const override = this.data.overrides[game.id] || {};
        const steamMetadata = { ...game.steamMetadata };
        if (override.title) steamMetadata.title = override.title;
        if (override.heroArtwork) steamMetadata.heroArtworkUrl = `/api/library/artwork?file=${encodeURIComponent(override.heroArtwork)}`;
        if (override.logoArtwork) steamMetadata.logoUrl = `/api/library/artwork?file=${encodeURIComponent(override.logoArtwork)}`;
        return { ...game, title: override.title || game.title, artworkUrl: override.gridArtwork ? `/api/library/artwork?file=${encodeURIComponent(override.gridArtwork)}` : game.artworkUrl, steamMetadata, playtimeSeconds: this.data.playtime[game.id]?.seconds || 0, lastPlayedAt: this.data.playtime[game.id]?.lastPlayedAt };
      }),
      scanErrors: { ...this.errors },
      scannedAt: new Date().toISOString(),
    };
  }

  async addFolder(selectedPath, kind = "collection", scan = true) {
    const path = await realpath(selectedPath);
    if (!(await stat(path)).isDirectory()) throw new Error("Dossier invalide");
    if (!this.data.roots.some((item) => pathKey(item.path) === pathKey(path))) {
      this.data.roots.push({ id: idFor("root", path), path, enabled: true, kind });
      await this.persist();
    }
    return scan ? this.scan() : this.snapshot();
  }

  async addExecutable(selectedPath) {
    const path = await realpath(selectedPath);
    if (extname(path).toLowerCase() !== ".exe" || !(await stat(path)).isFile()) throw new Error("Exécutable invalide");
    if (!this.data.manualGames.some((item) => pathKey(item.executablePath) === pathKey(path))) {
      this.data.manualGames.push({ id: idFor("manual", path), executablePath: path, title: titleFromExecutable(path) });
      await this.persist();
    }
    return this.scan();
  }

  async syncAutoSources(candidates) {
    let changed = false;
    const excluded = new Set(this.data.excludedPaths.map(pathKey));
    for (const candidate of candidates) {
      const path = await realpath(candidate.path).catch(() => null);
      if (!path || excluded.has(pathKey(path)) || this.data.roots.some((root) => pathKey(root.path) === pathKey(path))) continue;
      this.data.roots.push({ id: idFor("root", path), path, enabled: true, kind: "game", auto: true, platform: candidate.platform, title: candidate.title, storeId: candidate.storeId });
      changed = true;
    }
    if (changed) await this.persist();
    return changed;
  }

  async remove(id) {
    const removed = this.data.roots.find((item) => item.id === id);
    if (removed?.auto && !this.data.excludedPaths.some((path) => pathKey(path) === pathKey(removed.path))) this.data.excludedPaths.push(removed.path);
    this.data.roots = this.data.roots.filter((item) => item.id !== id);
    this.data.manualGames = this.data.manualGames.filter((item) => item.id !== id);
    await this.persist();
    return this.scan();
  }

  async setTitle(gameId, value) {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Jeu inconnu");
    const title = String(value || "").trim().slice(0, 120);
    if (!title) throw new Error("Titre invalide");
    this.data.overrides[gameId] = { ...this.data.overrides[gameId], title };
    const manual = this.data.manualGames.find((item) => item.id === gameId);
    if (manual) manual.title = title;
    await this.persist();
    return this.scan(game.sourceId, true);
  }

  async recordPlaytime(gameId, seconds) {
    if (!this.games.has(gameId)) return;
    const elapsed = Math.max(0, Math.floor(Number(seconds) || 0));
    if (!elapsed) return;
    const current = this.data.playtime[gameId]?.seconds || 0;
    this.data.playtime[gameId] = { seconds: current + elapsed, lastPlayedAt: new Date().toISOString() };
    await this.persist();
  }

  trackLaunchedProcess(gameId, child, onRecorded) {
    const startedAt = Date.now();
    let recorded = false;
    const finish = () => {
      if (recorded) return;
      recorded = true;
      void this.recordPlaytime(gameId, Math.max(1, Math.round((Date.now() - startedAt) / 1000))).then(() => onRecorded?.(this.snapshot())).catch(() => undefined);
    };
    child.once("exit", finish);
    child.once("error", () => { recorded = true; });
  }

  async setExecutable(gameId, selectedPath) {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Jeu inconnu");
    const file = await realpath(selectedPath);
    const info = await stat(file);
    if (!info.isFile() || extname(file).toLowerCase() !== ".exe") throw new Error("Exécutable invalide");
    const manual = this.data.manualGames.find((item) => item.id === gameId);
    if (manual) manual.executablePath = file;
    else {
      const root = this.data.roots.find((item) => item.id === game.sourceId && item.enabled);
      if (!root || !isWithin(file, await realpath(root.path))) throw new Error("Exécutable hors du dossier inscrit");
      this.data.overrides[gameId] = { ...this.data.overrides[gameId], executablePath: file };
    }
    this.games.set(gameId, { ...game, executablePath: file, executableName: basename(file), executableSignature: `${info.size}:${info.mtimeMs}` });
    await this.persist();
    return this.snapshot();
  }

  async setArtwork(gameId, role, selectedPath) {
    if (!this.games.has(gameId) || !["gridArtwork", "heroArtwork", "logoArtwork"].includes(role)) throw new Error("Image non autorisée");
    const source = await realpath(selectedPath);
    const extension = extname(source).toLowerCase();
    const info = await stat(source);
    if (!info.isFile() || ![".jpg", ".jpeg", ".png", ".webp"].includes(extension) || info.size > 12 * 1024 * 1024) throw new Error("Image invalide ou trop grande");
    const header = (await readFile(source)).subarray(0, 12);
    const valid = extension === ".png" ? header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : extension === ".webp" ? header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP"
      : header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    if (!valid) throw new Error("Le format réel de l’image ne correspond pas au fichier");
    const folder = join(dirname(this.file), "nexus-artwork");
    await mkdir(folder, { recursive: true });
    const destination = join(folder, `${gameId}-${role}-${Date.now()}${extension}`);
    await copyFile(source, destination);
    this.data.overrides[gameId] = { ...this.data.overrides[gameId], [role]: destination };
    await this.persist();
    return this.snapshot();
  }

  async scan(sourceId, force = false) {
    const next = sourceId ? new Map(this.games) : new Map();
    const sources = this.data.roots.filter((item) => item.enabled && (!sourceId || item.id === sourceId));
    for (let start = 0; start < sources.length; start += 4) {
      const results = await Promise.all(sources.slice(start, start + 4).map(async (source) => {
        try { return { source, result: await this.scanFolder(source.path, force, source.kind === "game", source.title, source.platform, source.storeId) }; }
        catch (error) { return { source, error }; }
      }));
      for (const { source, result, error } of results) {
        for (const [id, game] of next) if (game.sourceId === source.id) next.delete(id);
        if (error || !result) { this.errors[source.id] = error instanceof Error ? error.message : "Analyse impossible"; continue; }
        for (const game of result.games) {
          const id = idFor("local", game.folderPath);
          let enriched = game;
          const correctedTitle = this.data.overrides[id]?.title;
          if (correctedTitle && correctedTitle !== game.title) {
            try { enriched = { ...game, ...(await this.scanFolder(game.folderPath, force, true, correctedTitle)).games[0] }; }
            catch { /* Preserve local discovery if remote metadata fails. */ }
          }
          const executablePath = this.data.overrides[id]?.executablePath || game.executablePath;
          const executableInfo = executablePath ? await stat(executablePath).catch(() => null) : null;
          next.set(id, { ...enriched, title: correctedTitle || source.title || game.title, platform: source.platform || "Local", storeId: source.storeId, id, legacyId: game.id, sourceId: source.id, executablePath, executableName: executablePath ? basename(executablePath) : undefined, executableSignature: executableInfo ? `${executableInfo.size}:${executableInfo.mtimeMs}` : undefined });
        }
        delete this.errors[source.id];
      }
    }
    for (const manual of this.data.manualGames) {
      const executableInfo = await stat(manual.executablePath).catch(() => null);
      const title = this.data.overrides[manual.id]?.title || manual.title;
      let metadata = {};
      try {
        const result = await this.scanFolder(dirname(manual.executablePath), force, true, title);
        metadata = result.games.find((game) => pathKey(game.folderPath) === pathKey(dirname(manual.executablePath))) || {};
      } catch { /* Keep manually selected executable when metadata is unavailable. */ }
      next.set(manual.id, {
        ...metadata, id: manual.id, sourceId: manual.id, title,
        folderPath: dirname(manual.executablePath), executablePath: manual.executablePath,
        executableName: basename(manual.executablePath), modifiedAt: executableInfo?.mtime.toISOString() || new Date().toISOString(), executableSignature: executableInfo ? `${executableInfo.size}:${executableInfo.mtimeMs}` : undefined,
      });
    }
    this.games = next;
    return this.snapshot();
  }

  async authorizedExecutable(gameId) {
    const game = this.games.get(gameId);
    if (!game?.executablePath || extname(game.executablePath).toLowerCase() !== ".exe") throw new Error("Jeu non autorisé");
    const file = await realpath(game.executablePath);
    const info = await stat(file);
    if (!info.isFile()) throw new Error("Exécutable introuvable");
    if (!game.executableSignature || game.executableSignature !== `${info.size}:${info.mtimeMs}`) throw new Error("Exécutable modifié depuis l’analyse");
    const manual = this.data.manualGames.find((item) => item.id === gameId);
    if (manual) {
      if (pathKey(file) !== pathKey(manual.executablePath)) throw new Error("Exécutable non autorisé");
    } else {
      const root = this.data.roots.find((item) => item.id === game.sourceId && item.enabled);
      if (!root || !isWithin(file, await realpath(root.path))) throw new Error("Exécutable non autorisé");
    }
    return file;
  }

  async authorizedArtwork(file) {
    try {
      const actual = await realpath(file);
      return this.data.roots.some((root) => root.enabled && isWithin(actual, root.path))
        || this.data.manualGames.some((game) => isWithin(actual, dirname(game.executablePath)))
        || Object.values(this.data.overrides).some((override) => [override.gridArtwork, override.heroArtwork, override.logoArtwork].some((image) => image && pathKey(image) === pathKey(actual)));
    } catch { return false; }
  }
}
