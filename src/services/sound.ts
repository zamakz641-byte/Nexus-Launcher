import type { SoundCue, SoundCueItem, SoundPackManifest } from '../types/game';

/**
 * Nexus sound engine.
 *
 * The app ships only redistributable audio. User-installed .nxsfx packs are
 * validated by the Python backend before Nexus exposes them to the renderer.
 */
export type SfxType =
  | 'focus'
  | 'confirm'
  | 'back'
  | 'launch'
  | 'success'
  | 'toggle'
  | 'hover'
  | 'wake'
  | 'sleep'
  | 'startup';

const FALLBACK_PACK: SoundPackManifest = {
  schema: 1,
  id: 'nexus-console',
  name: 'Nexus Console',
  author: 'Nexus / Kenney',
  version: '1.0.0',
  type: 'soundpack',
  license: 'CC0-1.0',
  builtin: true,
  assetBase: '/sfx/kenney/',
  cues: {
    focus: { file: 'tick_001.wav', gain: 0.22 },
    confirm: { file: 'select_001.wav', gain: 0.34 },
    back: { file: 'back_001.wav', gain: 0.28 },
    launch: [
      { file: 'open_001.wav', gain: 0.36, delayMs: 0 },
      { file: 'maximize_003.wav', gain: 0.22, delayMs: 250 },
      { file: 'confirmation_004.wav', gain: 0.26, delayMs: 600 },
    ],
    success: { file: 'confirmation_001.wav', gain: 0.34 },
    toggle: { file: 'toggle_001.wav', gain: 0.25 },
    hover: { file: 'click_003.wav', gain: 0.09 },
    wake: { file: 'open_001.wav', gain: 0.24 },
    sleep: { file: 'close_001.wav', gain: 0.22 },
    startup: [
      { file: 'open_001.wav', gain: 0.22, delayMs: 120 },
      { file: 'confirmation_004.wav', gain: 0.26, delayMs: 780 },
    ],
  },
};

const active = new Set<HTMLAudioElement>();
let globallySuspended = false;
let currentPack: SoundPackManifest = FALLBACK_PACK;
let packRegistry = new Map<string, SoundPackManifest>([[FALLBACK_PACK.id, FALLBACK_PACK]]);
let lastPlayedAt = new Map<string, number>();
let registryLoaded = false;

function cueItems(cue: SoundCue | undefined): SoundCueItem[] {
  if (!cue) return [];
  return Array.isArray(cue) ? cue : [cue];
}

function assetUrl(pack: SoundPackManifest, file: string): string {
  const base = pack.assetBase.endsWith('/') ? pack.assetBase : `${pack.assetBase}/`;
  return `${base}${file.replace(/^\/+/, '')}`;
}

function makeAudio(url: string, volume: number, rate = 1): HTMLAudioElement {
  const audio = new Audio(url);
  audio.preload = 'auto';
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.playbackRate = Math.max(0.5, Math.min(2, rate));
  return audio;
}

function playItem(item: SoundCueItem, masterVolume: number): void {
  if (globallySuspended || typeof Audio === 'undefined') return;
  const invoke = () => {
    if (globallySuspended) return;
    const audio = makeAudio(
      assetUrl(currentPack, item.file),
      masterVolume * Math.max(0, Math.min(1, item.gain ?? 1)),
      item.rate ?? 1,
    );
    active.add(audio);
    const cleanup = () => active.delete(audio);
    audio.addEventListener('ended', cleanup, { once: true });
    audio.addEventListener('error', cleanup, { once: true });
    void audio.play().catch(cleanup);
  };
  const delay = Math.max(0, item.delayMs ?? 0);
  if (delay) window.setTimeout(invoke, delay);
  else invoke();
}

function throttled(type: SfxType, minGapMs: number): boolean {
  const now = performance.now();
  const last = lastPlayedAt.get(type) || 0;
  if (now - last < minGapMs) return false;
  lastPlayedAt.set(type, now);
  return true;
}

export async function loadSoundPackRegistry(force = false): Promise<SoundPackManifest[]> {
  if (registryLoaded && !force) return [...packRegistry.values()];
  try {
    const response = await fetch('/__nexus_soundpacks__.json', { cache: 'no-store' });
    if (response.ok) {
      const payload = await response.json() as { packs?: SoundPackManifest[] };
      if (Array.isArray(payload.packs) && payload.packs.length) {
        packRegistry = new Map(payload.packs.map((pack) => [pack.id, pack]));
        if (!packRegistry.has(FALLBACK_PACK.id)) packRegistry.set(FALLBACK_PACK.id, FALLBACK_PACK);
        registryLoaded = true;
      }
    }
  } catch {
    // Vite dev server can run without the Python loopback endpoint.
  }
  return [...packRegistry.values()];
}

export async function configureSoundPack(packId: string): Promise<SoundPackManifest> {
  await loadSoundPackRegistry();
  currentPack = packRegistry.get(packId) || packRegistry.get(FALLBACK_PACK.id) || FALLBACK_PACK;
  preloadSfx();
  return currentPack;
}

export function activeSoundPack(): SoundPackManifest {
  return currentPack;
}

export function preloadSfx(): void {
  if (typeof Audio === 'undefined') return;
  const files = new Set<string>();
  for (const cue of Object.values(currentPack.cues)) {
    for (const item of cueItems(cue)) files.add(item.file);
  }
  for (const file of files) {
    const audio = new Audio(assetUrl(currentPack, file));
    audio.preload = 'auto';
    audio.load();
  }
}

export function playSfx(type: SfxType, enabled = true, masterVolume = 0.62): void {
  if (!enabled || masterVolume <= 0 || globallySuspended) return;
  if (type === 'focus' && !throttled(type, 68)) return;
  if (type === 'hover' && !throttled(type, 100)) return;
  if (type === 'launch' && !throttled(type, 800)) return;
  if (type === 'startup' && !throttled(type, 1600)) return;

  const master = Math.max(0, Math.min(1, masterVolume));
  const items = cueItems(currentPack.cues[type] || FALLBACK_PACK.cues[type]);
  for (const item of items) playItem(item, master);
}

export function suspendSfx(): void {
  globallySuspended = true;
  for (const audio of active) {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // Audio is decorative and must never block a game launch.
    }
  }
  active.clear();
}

export function resumeSfx(): void {
  globallySuspended = false;
}
