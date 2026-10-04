// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { sanitizeMediaPreferences } from './preferences';
it('clamps saved media controls and ignores invalid values', () => {
  expect(sanitizeMediaPreferences({ brightness: 400, dimming: -8, interval: 1, slideshow: 'yes' })).toEqual({ brightness: 120, dimming: 0, interval: 8, slideshow: true, previewVideo: false });
  expect(sanitizeMediaPreferences({ brightness: null, interval: NaN }).brightness).toBe(100);
});
