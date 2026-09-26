import type { SyntheticEvent } from "react";

const brandFallback = "/assets/brand/nexus-mark.png";

export function applyImageFallback(event: SyntheticEvent<HTMLImageElement>, fallback?: string) {
  const image = event.currentTarget;
  const candidate = fallback && fallback !== image.getAttribute("src") ? fallback : brandFallback;
  if (image.dataset.fallbackStep !== "1") {
    image.dataset.fallbackStep = "1";
    image.src = candidate;
    return;
  }
  if (!image.src.endsWith(brandFallback)) image.src = brandFallback;
}
