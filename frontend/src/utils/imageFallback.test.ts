// @vitest-environment jsdom
import { expect, it } from 'vitest';
import type { SyntheticEvent } from 'react';
import { applyImageFallback, retryArtwork } from './imageFallback';
it('retries original artwork after two failed alternatives and resets for another game', () => {
  const image = document.createElement('img'); document.body.append(image);
  image.src = '/api/library/media?url=first';
  const event = { currentTarget: image } as SyntheticEvent<HTMLImageElement>;
  applyImageFallback(event, '/hero.jpg'); applyImageFallback(event);
  expect(image.getAttribute('src')).toBe('/assets/brand/nexus-mark.png');
  retryArtwork(); expect(image.src).toContain('url=first'); expect(image.src).toContain('retry=');
  image.src = '/api/library/media?url=second';
  applyImageFallback(event, '/second-hero.jpg');
  expect(image.getAttribute('src')).toBe('/second-hero.jpg');
  image.remove();
});
it('tries another provider before the brand image when cover and hero both fail', () => {
  const image = document.createElement('img'); image.src = '/sgdb-cover';
  const event = { currentTarget: image } as SyntheticEvent<HTMLImageElement>;
  const alternatives = ['/sgdb-hero', '/steam-header'];
  applyImageFallback(event, alternatives); expect(image.getAttribute('src')).toBe('/sgdb-hero');
  applyImageFallback(event, alternatives); expect(image.getAttribute('src')).toBe('/steam-header');
  applyImageFallback(event, alternatives); expect(image.getAttribute('src')).toBe('/assets/brand/nexus-mark.png');
});
