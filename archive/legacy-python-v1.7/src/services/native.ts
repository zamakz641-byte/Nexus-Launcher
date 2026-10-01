import type {
  Game,
  IdentityCandidate,
  ImportCandidate,
  ImportJob,
  LauncherSettings,
  NativeBootstrap,
  PlaySession,
  SoundPackManifest,
} from '../types/game';
import { DEMO_BOOTSTRAP } from '../data/demoBootstrap';

type NexusNativeApi = {
  bootstrap?: () => Promise<NativeBootstrap>;
  choose_executable(): Promise<string>;
  inspect_executable(path: string): Promise<ImportCandidate>;
  scan_installed_games(): Promise<ImportCandidate[]>;
  start_import_executable(path: string): Promise<string>;
  start_import_candidate(candidate: ImportCandidate): Promise<string>;
  get_job(jobId: string): Promise<ImportJob | null>;
  list_games(): Promise<Game[]>;
  list_sessions(): Promise<PlaySession[]>;
  get_settings?: () => Promise<LauncherSettings>;
  active_game?: () => Promise<{ gameId: string; startedAt: string } | null>;
  update_game(gameId: string, patch: Partial<Game>): Promise<Game | null>;
  delete_game(gameId: string, deleteMedia?: boolean): Promise<boolean>;
  refresh_media(gameId: string): Promise<string>;
  sync_achievements(gameId: string): Promise<{ ok: boolean; error?: string; game?: Game; count?: number }>;
  search_identity_candidates(gameId: string): Promise<IdentityCandidate[]>;
  apply_identity_candidate(gameId: string, candidate: IdentityCandidate): Promise<string>;
  update_settings(patch: Partial<LauncherSettings>): Promise<LauncherSettings>;
  reset_settings(): Promise<LauncherSettings>;
  list_sound_packs(): Promise<SoundPackManifest[]>;
  choose_sound_pack(): Promise<string>;
  install_sound_pack(path: string): Promise<{ ok: boolean; error?: string; pack?: SoundPackManifest; packs?: SoundPackManifest[] }>;
  remove_sound_pack(packId: string): Promise<{ ok: boolean; error?: string; packs?: SoundPackManifest[] }>;
  reveal_extensions_folder(): Promise<boolean>;
  launch_game(gameId: string): Promise<{ ok: boolean; error?: string; gameId?: string; startedAt?: string }>;
  stop_game(): Promise<boolean>;
  toggle_fullscreen(): Promise<boolean>;
  reveal_data_folder(): Promise<boolean>;
  quit_launcher(): Promise<boolean>;
};

declare global {
  interface Window {
    pywebview?: { api?: NexusNativeApi };
  }
}

let cachedApi: NexusNativeApi | null = null;
let pendingApi: Promise<NexusNativeApi> | null = null;

function hasCoreApi(api: NexusNativeApi | undefined): api is NexusNativeApi {
  return Boolean(
    api &&
      typeof api.list_games === 'function' &&
      typeof api.list_sessions === 'function' &&
      typeof api.scan_installed_games === 'function'
  );
}

export function isNative(): boolean {
  return Boolean((cachedApi && hasCoreApi(cachedApi)) || hasCoreApi(window.pywebview?.api));
}

export function waitForNative(timeoutMs = 20000): Promise<NexusNativeApi> {
  const liveApi = window.pywebview?.api;
  if (hasCoreApi(liveApi) && liveApi !== cachedApi) {
    cachedApi = liveApi;
    pendingApi = null;
    return Promise.resolve(liveApi);
  }
  if (cachedApi && hasCoreApi(cachedApi)) return Promise.resolve(cachedApi);
  if (cachedApi && !hasCoreApi(cachedApi)) cachedApi = null;
  if (pendingApi) return pendingApi;
  const existing = liveApi;
  if (hasCoreApi(existing)) {
    cachedApi = existing;
    return Promise.resolve(existing);
  }

  pendingApi = new Promise((resolve, reject) => {
    let done = false;
    let pollId = 0;

    const cleanup = () => {
      window.removeEventListener('pywebviewready', finish);
      if (pollId) window.clearInterval(pollId);
      window.clearTimeout(timer);
    };

    const finish = () => {
      if (done) return;
      const api = window.pywebview?.api;
      // pywebview can create window.pywebview.api slightly before the callable
      // methods are installed. Never resolve on the namespace alone.
      if (!hasCoreApi(api)) return;
      done = true;
      cachedApi = api;
      pendingApi = null;
      cleanup();
      resolve(api);
    };

    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      pendingApi = null;
      cleanup();
      const names = Object.keys(window.pywebview?.api || {}).join(', ');
      reject(new Error(`Le pont pywebview n’est pas prêt${names ? ` (${names})` : ''}.`));
    }, timeoutMs);

    window.addEventListener('pywebviewready', finish);
    // Guard against a renderer where React mounts after pywebviewready fired.
    pollId = window.setInterval(finish, 40);
    queueMicrotask(finish);
  });
}

export async function nativeApi(): Promise<NexusNativeApi> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await waitForNative(attempt === 0 ? 10000 : 5000);
    } catch (error) {
      lastError = error;
      cachedApi = null;
      pendingApi = null;
      await new Promise((resolve) => window.setTimeout(resolve, 120 + attempt * 120));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Le pont pywebview n’est pas prêt.');
}

export async function bootstrapNative(): Promise<NativeBootstrap> {
  // Vite preview deliberately uses a complete cinematic demo library. The
  // packaged WebView build never enters this branch and always uses SQLite.
  if (import.meta.env.DEV && !window.pywebview?.api) return DEMO_BOOTSTRAP;
  // Load the cheap HTTP snapshot first, but do not treat it as application
  // readiness. A fully usable first frame also requires the generated
  // pywebview methods to be callable.
  let snapshot: NativeBootstrap | null = null;
  try {
    const response = await fetch('/__nexus_bootstrap__.json', { cache: 'no-store' });
    if (response.ok) {
      const candidate = await response.json() as NativeBootstrap;
      if (Array.isArray(candidate.games) && Array.isArray(candidate.sessions)) {
        snapshot = candidate;
      }
    }
  } catch {
    // Vite development mode has no loopback bootstrap endpoint.
  }

  if (snapshot) {
    // The snapshot makes the first frame deterministic, while awaiting the
    // bridge guarantees that the revealed controls are immediately usable.
    window.__nexusBootStatus?.('Préparation de la bibliothèque…');
    await waitForNative(14000);
    return snapshot;
  }

  window.__nexusBootStatus?.('Initialisation du pont natif…');
  const api = await waitForNative(14000);

  // Some WebView2/pywebview combinations expose the namespace a fraction of a
  // second before every generated method is callable. Prefer bootstrap, but
  // never let that optional convenience method take the whole launcher down.
  try {
    const bootstrap = api && typeof api.bootstrap === 'function' ? api.bootstrap.bind(api) : null;
    if (bootstrap) return await bootstrap();
  } catch (error) {
    console.warn('[Nexus] Native bootstrap fallback:', error);
  }

  const stableApi = await waitForNative(6000);
  const [games, sessions, settings, activeGame] = await Promise.all([
    stableApi.list_games(),
    stableApi.list_sessions(),
    typeof stableApi.get_settings === 'function' ? stableApi.get_settings() : Promise.resolve({} as LauncherSettings),
    typeof stableApi.active_game === 'function' ? stableApi.active_game() : Promise.resolve(null),
  ]);

  return {
    version: 'runtime',
    games,
    sessions,
    settings,
    activeGame,
    dataDirectory: '',
    platform: 'win32',
  };
}

export async function pollJob(jobId: string, onProgress?: (job: ImportJob) => void): Promise<ImportJob> {
  const api = await nativeApi();
  while (true) {
    const job = await api.get_job(jobId);
    if (!job) throw new Error('Tâche d’import introuvable.');
    onProgress?.(job);
    if (job.status === 'done') return job;
    if (job.status === 'error') throw new Error(job.error || 'Échec de l’import.');
    await new Promise((resolve) => window.setTimeout(resolve, 280));
  }
}
