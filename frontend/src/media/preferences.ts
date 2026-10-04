export interface MediaPreferences { brightness: number; dimming: number; interval: number; slideshow: boolean; previewVideo: boolean; }
export const defaultMediaPreferences: MediaPreferences = { brightness: 100, dimming: 35, interval: 12, slideshow: true, previewVideo: false };
export function sanitizeMediaPreferences(value: Partial<Record<keyof MediaPreferences, unknown>>): MediaPreferences {
  const number = (key: 'brightness' | 'dimming' | 'interval', min: number, max: number) => typeof value[key] === 'number' && Number.isFinite(value[key]) ? Math.min(max, Math.max(min, value[key] as number)) : defaultMediaPreferences[key];
  return { brightness: number('brightness', 70, 120), dimming: number('dimming', 0, 70), interval: number('interval', 8, 30), slideshow: typeof value.slideshow === 'boolean' ? value.slideshow : true, previewVideo: typeof value.previewVideo === 'boolean' ? value.previewVideo : false };
}
export function readMediaPreferences(): MediaPreferences {
  try { return sanitizeMediaPreferences(JSON.parse(localStorage.getItem('nexus.media.v1') || '{}') || {}); }
  catch { return { ...defaultMediaPreferences }; }
}
