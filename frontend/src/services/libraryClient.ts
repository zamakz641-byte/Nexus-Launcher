import type { Game, SystemInfo } from "../types";

interface LocalGameRecord {
  id: string;
  legacyId?: string;
  title: string;
  folderPath: string;
  executablePath?: string;
  executableName?: string;
  modifiedAt: string;
  playtimeSeconds?: number;
  lastPlayedAt?: string;
  artworkUrl?: string;
  platform?: "Steam" | "Epic" | "Local";
  storeId?: string;
  steamMetadata?: {
    appId: number;
    title?: string;
    description?: string;
    developer?: string;
    publisher?: string;
    releaseDate?: string;
    genre?: string;
    features?: string[];
    trailerUrl?: string;
    trailerTitle?: string;
    trailers?: { id: string; title: string; url: string; poster?: string }[];
    screenshots?: string[];
    backgroundGallery?: string[];
    artworkUrl?: string;
    heroArtworkUrl?: string;
    artworkFallbackUrls?: string[];
    heroFallbackUrls?: string[];
    logoUrl?: string;
    metadataProvider?: string;
  };
}

interface ScanPayload {
  cancelled?: boolean;
  root?: string;
  roots?: { id: string; path: string; enabled: boolean; kind?: "collection" | "game"; platform?: "Steam" | "Epic"; auto?: boolean; title?: string }[];
  manualGames?: { id: string; executablePath: string; title: string }[];
  scanErrors?: Record<string, string>;
  scannedAt: string;
  cached?: boolean;
  games: LocalGameRecord[];
}

interface LibraryScanResult {
  root: string;
  roots: NonNullable<ScanPayload["roots"]>;
  manualGames: NonNullable<ScanPayload["manualGames"]>;
  scanErrors: NonNullable<ScanPayload["scanErrors"]>;
  scannedAt: string;
  cached?: boolean;
  games: Game[];
}

export interface CatalogGame {
  id: number;
  title: string;
  artwork: string;
  fallbackArtwork?: string;
  price: string;
  metascore?: string;
  controller: boolean;
  platforms: string[];
  storeUrl: string;
}

function normalizeMedia(value?: string) {
  if (!value) return value;
  if (!window.nexusDesktop) {
    return value.startsWith("http") ? `/api/library/media?url=${encodeURIComponent(value)}` : value;
  }
  if (value.startsWith("http")) return `nexus://media/remote?url=${encodeURIComponent(value)}`;
  if (value.startsWith("/api/library/media")) {
    const url = new URL(value, "http://nexus.local");
    const remote = url.searchParams.get("url");
    return remote ? `nexus://media/remote?url=${encodeURIComponent(remote)}` : value;
  }
  if (value.startsWith("/api/library/artwork")) {
    const url = new URL(value, "http://nexus.local");
    return `nexus://media/local?${url.searchParams.toString()}`;
  }
  return value;
}

function normalizeTrailer(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["steamstatic.com", "steamusercontent.com"].some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) return undefined;
    return url.href;
  } catch { return undefined; }
}

async function postLocal(path: string, body: Record<string, string>) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || `Local request failed (${response.status})`);
  }
  return response.json() as Promise<ScanPayload>;
}

export function toGame(record: LocalGameRecord): Game {
  const steam = record.steamMetadata;
  const appId = steam?.appId || (record.platform === "Steam" && /^\d+$/.test(record.storeId || "") ? Number(record.storeId) : undefined);
  const steamHeader = appId ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg` : undefined;
  const artworkFallbacks = [...new Set([...(steam?.artworkFallbackUrls || []), steam?.artworkUrl, steamHeader].map(normalizeMedia).filter((url): url is string => Boolean(url)))];
  const heroArtworkFallbacks = [...new Set([...(steam?.heroFallbackUrls || []), ...artworkFallbacks, record.artworkUrl].map(normalizeMedia).filter((url): url is string => Boolean(url)))];
  const executableLabel = record.executableName ? `Exécutable détecté : ${record.executableName}` : "Exécutable principal à confirmer";
  const modified = new Date(record.lastPlayedAt || record.modifiedAt);
  const lastPlayed = Number.isNaN(modified.valueOf())
    ? { fr: "Dossier local", en: "Local folder" }
    : record.lastPlayedAt
      ? { fr: `Joué le ${modified.toLocaleDateString("fr-FR")}`, en: `Played ${modified.toLocaleDateString("en-US")}` }
      : { fr: `Modifié le ${modified.toLocaleDateString("fr-FR")}`, en: `Modified ${modified.toLocaleDateString("en-US")}` };

  return {
    id: record.id,
    legacyId: record.legacyId,
    title: (steam?.title ?? record.title).replace(/[®™]/g, "").toUpperCase(),
    description: {
      fr: steam?.description || `${executableLabel}. Importé automatiquement depuis ${record.folderPath}.`,
      en: steam?.description || `${executableLabel}. Automatically imported from ${record.folderPath}.`,
    },
    genre: { fr: (steam?.genre ?? "JEU LOCAL").toUpperCase(), en: (steam?.genre ?? "LOCAL GAME").toUpperCase() },
    metadata: steam?.appId ? ["STEAM", "PC"] : ["LOCAL", "PC"],
    artwork: normalizeMedia(record.artworkUrl) ?? artworkFallbacks[0] ?? "/assets/brand/nexus-mark.png",
    heroArtwork: normalizeMedia(steam?.heroArtworkUrl),
    steamAppId: appId,
    backgroundGallery: [...new Set([steam?.heroArtworkUrl, ...(steam?.backgroundGallery || [])].map(normalizeMedia).filter((url): url is string => Boolean(url)))],
    screenshots: (steam?.screenshots || []).map(normalizeMedia).filter((url): url is string => Boolean(url)),
    trailers: (steam?.trailers || []).flatMap(trailer => {
      const url = normalizeTrailer(trailer.url);
      return url ? [{ id: trailer.id, title: { fr: trailer.title, en: trailer.title }, url, poster: normalizeMedia(trailer.poster) }] : [];
    }),
    artworkFallbacks,
    heroArtworkFallbacks,
    logoArtwork: normalizeMedia(steam?.logoUrl),
    metadataProvider: steam?.metadataProvider ?? "Fichiers locaux",
    installed: Boolean(record.executablePath),
    source: record.platform === "Steam" ? "Steam" : record.platform === "Epic" ? "Epic Games" : "Local",
    developer: steam?.developer ?? "Détecté localement",
    publisher: steam?.publisher ?? "Bibliothèque personnelle",
    releaseDate: steam?.releaseDate ?? "—",
    ageRating: "Non renseigné",
    playtimeHours: (record.playtimeSeconds || 0) / 3600,
    lastPlayedAt: record.lastPlayedAt,
    lastPlayed,
    version: "Locale",
    installSize: "Dossier local",
    achievementProgress: { unlocked: 0, total: 0 },
    rating: 0,
    trailer: { title: { fr: steam?.trailerTitle ?? "Aucun trailer disponible", en: steam?.trailerTitle ?? "No trailer available" }, duration: "", url: normalizeTrailer(steam?.trailerUrl) },
    features: steam?.features?.length ? steam.features.map((feature) => ({ fr: feature, en: feature })) : [
      { fr: "Installation locale", en: "Local installation" },
      { fr: "Lancement direct", en: "Direct launch" },
      { fr: "Métadonnées fichier", en: "File metadata" },
    ],
    executablePath: record.executablePath,
    libraryPath: record.folderPath,
    discovered: true,
  };
}

export const libraryClient = {
  onLibraryChanged(callback: (result: LibraryScanResult) => void) {
    return window.nexusDesktop?.onLibraryChanged((value) => {
      const payload = value as ScanPayload;
      callback({ ...payload, root: payload.roots?.[0]?.path ?? "", roots: payload.roots ?? [], manualGames: payload.manualGames ?? [], scanErrors: payload.scanErrors ?? {}, games: payload.games.map(toGame) });
    }) ?? (() => undefined);
  },
  async scan(root?: string, force = false): Promise<LibraryScanResult> {
    if (window.nexusDesktop) {
      const payload = await window.nexusDesktop.scanLibrary(root, force) as ScanPayload;
      return { ...payload, root: payload.roots?.[0]?.path ?? "", roots: payload.roots ?? [], manualGames: payload.manualGames ?? [], scanErrors: payload.scanErrors ?? {}, games: payload.games.map(toGame) };
    }
    const params = new URLSearchParams();
    if (root) params.set("root", root);
    if (force) params.set("refresh", "true");
    const response = await fetch(`/api/library/scan${params.size ? `?${params}` : ""}`);
    if (!response.ok) throw new Error(`Analyse impossible (${response.status})`);
    const payload = await response.json() as ScanPayload;
    return { ...payload, root: payload.root ?? payload.roots?.[0]?.path ?? "", roots: payload.roots ?? [], manualGames: payload.manualGames ?? [], scanErrors: payload.scanErrors ?? {}, games: payload.games.map(toGame) };
  },
  async pollChanges() {
    if (window.nexusDesktop) return null;
    const response = await fetch("/api/library/changes");
    if (!response.ok) return null;
    const payload = await response.json() as ScanPayload & { changed: boolean };
    return payload.changed ? { ...payload, root: payload.roots?.[0]?.path ?? "", roots: payload.roots ?? [], manualGames: payload.manualGames ?? [], scanErrors: payload.scanErrors ?? {}, games: payload.games.map(toGame) } : null;
  },
  async addFolder(path?: string) {
    const result = window.nexusDesktop ? await window.nexusDesktop.chooseLibraryFolder() as ScanPayload | null : path ? await postLocal("/api/library/add", { path, kind: "collection" }) : await postLocal("/api/library/pick", { kind: "collection" }) as ScanPayload & { cancelled?: boolean };
    if (result?.cancelled) return null;
    return result ? this.scan() : null;
  },
  async addExecutable(path?: string) {
    const result = window.nexusDesktop ? await window.nexusDesktop.addGameExecutable() as ScanPayload | null : path ? await postLocal("/api/library/add", { path, kind: "executable" }) : await postLocal("/api/library/pick", { kind: "executable" }) as ScanPayload & { cancelled?: boolean };
    if (result?.cancelled) return null;
    return result ? this.scan() : null;
  },
  async addGameFolder(path?: string) {
    const result = window.nexusDesktop ? await window.nexusDesktop.addGameFolder() as ScanPayload | null : path ? await postLocal("/api/library/add", { path, kind: "game" }) : await postLocal("/api/library/pick", { kind: "game" }) as ScanPayload & { cancelled?: boolean };
    if (result?.cancelled) return null;
    return result ? this.scan() : null;
  },
  async removeEntry(id: string) {
    if (window.nexusDesktop) await window.nexusDesktop.removeLibraryEntry(id);
    else await postLocal("/api/library/remove", { id });
    return this.scan();
  },
  async setTitle(id: string, title: string) {
    if (window.nexusDesktop) await window.nexusDesktop.setGameTitle(id, title);
    else await postLocal("/api/library/game-title", { id, title });
    return this.scan();
  },
  async chooseArtwork(id: string, role: "gridArtwork" | "heroArtwork" | "logoArtwork") {
    if (!window.nexusDesktop) throw new Error("Cette action nécessite l’application de bureau.");
    const result = await window.nexusDesktop.chooseGameArtwork(id, role);
    return result ? this.scan() : null;
  },
  async chooseExecutable(id: string) {
    if (!window.nexusDesktop) throw new Error("Cette action nécessite l’application de bureau.");
    const result = await window.nexusDesktop.chooseGameExecutable(id);
    return result ? this.scan() : null;
  },
  async searchCatalog(query: string, signal?: AbortSignal): Promise<CatalogGame[]> {
    if (window.nexusDesktop) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const items = await window.nexusDesktop.searchCatalog(query) as CatalogGame[];
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      return items.map((item) => ({
        ...item,
        artwork: normalizeMedia(item.artwork) ?? item.artwork,
        fallbackArtwork: normalizeMedia(item.fallbackArtwork),
      }));
    }
    const response = await fetch(`/api/library/catalog?q=${encodeURIComponent(query)}`, { signal });
    if (!response.ok) throw new Error(`Catalogue indisponible (${response.status})`);
    const payload = await response.json() as { items: CatalogGame[] };
    return payload.items;
  },
  async system(): Promise<SystemInfo> {
    if (window.nexusDesktop) return window.nexusDesktop.system() as Promise<SystemInfo>;
    const response = await fetch("/api/library/system");
    if (!response.ok) throw new Error(`Configuration indisponible (${response.status})`);
    return response.json() as Promise<SystemInfo>;
  },
};
