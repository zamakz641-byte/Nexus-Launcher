import type { SyntheticEvent } from "react";

const brandFallback = "/assets/brand/nexus-mark.png";

export function applyImageFallback(event: SyntheticEvent<HTMLImageElement>, fallback?: string | (string | undefined)[]) {
  const image = event.currentTarget;
  const source = image.getAttribute("src") || "";
  if (image.dataset.fallbackSource !== source) {
    image.dataset.originalSource = source;
    delete image.dataset.attemptedSources;
  }
  const normalize = (value: string) => new URL(value, window.location.href).href;
  const attempted = new Set<string>(JSON.parse(image.dataset.attemptedSources || '[]'));
  attempted.add(normalize(source));
  image.dataset.attemptedSources = JSON.stringify([...attempted]);
  const candidates = (Array.isArray(fallback) ? fallback : [fallback]).filter((value): value is string => Boolean(value));
  const candidate = [...candidates, brandFallback].find(value => !attempted.has(normalize(value)));
  if (candidate) { image.src = candidate; image.dataset.fallbackSource = candidate; }
}

export function retryArtwork() {
  for (const image of document.querySelectorAll<HTMLImageElement>('img')) {
    const source = image.dataset.originalSource || image.getAttribute('src');
    if (!source || (!image.dataset.originalSource && !source.includes('/media') && !source.includes('nexus://media'))) continue;
    delete image.dataset.originalSource; delete image.dataset.fallbackSource; delete image.dataset.attemptedSources;
    const url = new URL(source, window.location.href);
    url.searchParams.set('retry', String(Date.now()));
    image.src = url.href;
  }
}

export function clearRecoveredArtwork(event: Event) {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || image.getAttribute('src') === image.dataset.fallbackSource) return;
  delete image.dataset.originalSource; delete image.dataset.fallbackSource; delete image.dataset.attemptedSources;
}
