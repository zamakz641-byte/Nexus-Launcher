import { sampleData } from "./sampleData";

export type SfxCue = "move" | "confirm" | "back" | "tab" | "launch" | "startup";

export interface AudioPreferences { masterVolume: number; uiVolume: number; muted: boolean; }
const preferenceKey = "nexus.audio.v1";
const defaults: AudioPreferences = { masterVolume: 0.72, uiVolume: 0.68, muted: false };
const clamp = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
function readPreferences(): AudioPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey) || "null");
    return saved ? { masterVolume: clamp(saved.masterVolume), uiVolume: clamp(saved.uiVolume), muted: Boolean(saved.muted) } : { ...defaults };
  } catch { return { ...defaults }; }
}
let preferences = readPreferences();
const lastCueAt = new Map<SfxCue, number>();

let context: AudioContext | null = null;
let master: GainNode | null = null;
const samples = new Map<SfxCue, Promise<{ buffer: AudioBuffer; offset: number; duration: number; peak: number }>>();

function audio() {
  if (!context) {
    context = new AudioContext({ latencyHint: "interactive" });
    master = context.createGain();
    master.gain.value = preferences.muted ? 0 : 0.65 * preferences.masterVolume * preferences.uiVolume;
    master.connect(context.destination);
  }
  if (context.state === "suspended") void context.resume();
  return { ctx: context, out: master! };
}

function sample(cue: SfxCue) {
  let pending = samples.get(cue);
  if (!pending) {
    const { ctx } = audio();
    pending = Promise.resolve().then(() => {
      const binary = atob(sampleData[cue]);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      return ctx.decodeAudioData(bytes.buffer);
    })
      .then((buffer) => {
        let peak = 0, first = buffer.length, last = 0;
        for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
          const values = buffer.getChannelData(ch);
          for (let i = 0; i < values.length; i++) peak = Math.max(peak, Math.abs(values[i]));
        }
        const threshold = Math.max(.002, peak * .015);
        for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
          const values = buffer.getChannelData(ch);
          for (let i = 0; i < values.length; i++) if (Math.abs(values[i]) > threshold) { first = Math.min(first, i); last = Math.max(last, i); }
        }
        return { buffer, peak, offset: Math.max(0, first / buffer.sampleRate - .005), duration: Math.min(buffer.duration, (last + 1) / buffer.sampleRate + .05) };
      }).catch((error: unknown) => { samples.delete(cue); throw error; });
    samples.set(cue, pending);
  }
  return pending;
}

async function playSample(cue: SfxCue) {
  const requestedAt = performance.now();
  const item = await sample(cue);
  if (preferences.muted || (cue === "move" && performance.now() - requestedAt > 140)) return;
  const { ctx, out } = audio();
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = item.buffer;
  gain.gain.value = Math.min(2, .24 / Math.max(item.peak, .01));
  source.connect(gain).connect(out);
  source.start(0, item.offset, Math.max(.02, item.duration - item.offset));
}

export const sfx = {
  getPreferences(): AudioPreferences { return { ...preferences }; },
  preload() {
    audio();
    void sample("move").catch(() => undefined);
    void sample("confirm").catch(() => undefined);
  },
  play(cue: SfxCue) {
    if (preferences.muted || preferences.masterVolume === 0 || preferences.uiVolume === 0) return;
    const now = performance.now();
    if (now - (lastCueAt.get(cue) ?? -Infinity) < (cue === "move" ? 78 : 55)) return;
    lastCueAt.set(cue, now);
    void playSample(cue).catch(() => undefined);
  },
  setPreferences(next: Partial<AudioPreferences>) {
    preferences = {
      masterVolume: next.masterVolume === undefined ? preferences.masterVolume : clamp(next.masterVolume),
      uiVolume: next.uiVolume === undefined ? preferences.uiVolume : clamp(next.uiVolume),
      muted: next.muted === undefined ? preferences.muted : Boolean(next.muted),
    };
    localStorage.setItem(preferenceKey, JSON.stringify(preferences));
    const { ctx, out } = audio();
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setTargetAtTime(preferences.muted ? 0 : 0.65 * preferences.masterVolume * preferences.uiVolume, ctx.currentTime, 0.015);
  },
  setMasterVolume(value: number) {
    this.setPreferences({ masterVolume: value });
  },
  delay(ms: number) {
    return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
  },
};
