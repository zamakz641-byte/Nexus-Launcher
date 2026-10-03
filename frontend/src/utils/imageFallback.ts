import type { SyntheticEvent } from "react";

const brandFallback = "/assets/brand/nexus-mark.png";

export function applyImageFallback(event: SyntheticEvent<HTMLImageElement>, fallback?: string) {
  const image = event.currentTarget;
  const source = image.getAttribute("src") || "";
  if (image.dataset.fallbackSource !== source) {
    image.dataset.originalSource = source;
    delete image.dataset.fallbackStep;
  }
  const candidate = fallback && fallback !== image.getAttribute("src") ? fallback : brandFallback;
  if (image.dataset.fallbackStep !== "1") {
    image.dataset.fallbackStep = "1";
    image.src = candidate;
    image.dataset.fallbackSource = candidate;
    return;
  }
  if (!image.src.endsWith(brandFallback)) { image.src = brandFallback; image.dataset.fallbackSource = brandFallback; }
}

export function retryArtwork() {
  for (const image of document.querySelectorAll<HTMLImageElement>('img')) {
    const source = image.dataset.originalSource || image.getAttribute('src');
    if (!source || (!image.dataset.originalSource && !source.includes('/media') && !source.includes('nexus://media'))) continue;
    delete image.dataset.originalSource; delete image.dataset.fallbackSource; delete image.dataset.fallbackStep;
    const url = new URL(source, window.location.href);
    url.searchParams.set('retry', String(Date.now()));
    image.src = url.href;
  }
}

export function clearRecoveredArtwork(event: Event) {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || image.getAttribute('src') === image.dataset.fallbackSource) return;
  delete image.dataset.originalSource; delete image.dataset.fallbackSource; delete image.dataset.fallbackStep;
}
