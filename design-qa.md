# Design QA — Nexus Launcher 1.7

## Evidence

- Source visual truth: `C:\Users\USER\Downloads\image-gen-1(5).png`
- Supporting motion references: `image-gen-3(1).png` and `image-gen-4.png`
- Browser-rendered implementation: `http://127.0.0.1:5173/`
- Combined comparison surface: `http://127.0.0.1:5173/qa/compare.html`
- Browser evidence: Codex in-app Browser tab 3, captured 2026-09-19 after a 6.5 s startup handoff.
- Comparison viewport: 1920 × 1080 CSS px, device scale factor 1.
- Source pixels: 1677 × 943, scaled proportionally with `object-fit: contain` into a 960 × 1080 comparison pane.
- Implementation pixels: 960 × 1080 CSS px inside the adjacent live iframe; an additional full implementation check was performed at 1440 × 900.
- State: accueil, Aetherwalkers sélectionné, navigation visible, hero + rail + début de la grille éditoriale.

## Findings

No actionable P0, P1, or P2 issue remains.

- Fonts and typography: Geist Variable is bundled locally. The display title remains on one line at 1440 px, section hierarchy is clear, and normal text is large enough for desktop/TV viewing.
- Spacing and layout rhythm: the hero, negative space, rail overlap, margins, and 12-column editorial rhythm reproduce the intended cinematic hierarchy without clipped controls.
- Colors and visual tokens: the navy/cyan/platinum palette matches the source; gold remains a restrained reward/accent color. Focus and selected states remain distinguishable without relying on color alone.
- Image quality and asset fidelity: the generated 16:9 Nexus world art is sharp at 1440 × 900 and uses the same portal/cloud/cyan art direction. The official local Nexus mark is reused; no placeholder illustration or emoji replaces a visible asset.
- Copy and content: French labels are concise and product-specific. Primary actions are explicit (`Jouer maintenant`, `Voir les détails`) and do not expose design-prompt language.
- Interaction and motion: navigation, library, search, launch, cancel, and modal escape were exercised. GSAP view transitions are short and interruptible. Remotion renders the launch sequence without blocking its cancel control.
- Accessibility: semantic buttons/nav/headings are present, icon actions have accessible names, focus rings are visible, controls meet the 44 px target, and `prefers-reduced-motion` provides a static launch state.
- Console: no error or warning was present in the fresh comparison run.

## Comparison history

1. Initial implementation inspection found the launcher preview blocked by the native bridge and a transient duplicate-React hook failure from `@gsap/react` during hot reload.
2. Fixes: added a Vite-only demo bootstrap, replaced `@gsap/react` with a scoped GSAP `useLayoutEffect`, lazy-loaded the Remotion overlay, and added a development-only native launch simulation.
3. Post-fix evidence: fresh browser render at 1440 × 900, combined 1920 × 1080 reference/implementation comparison, working navigation/search/launch sequence, and a clean browser console.

## Focused comparison

The combined capture keeps the hero typography, primary actions, selected game card, rail density, navigation line, and source UI panel readable in the same image. A separate crop was not needed; the key fidelity surfaces were legible at the comparison viewport.

## Follow-up polish

- P3: when real libraries contain distinct artwork, the rail will gain more color variety than the demo dataset, where all preview games intentionally reuse one fallback hero.
- P3: future metadata may provide game logos for the hero; the current title treatment remains the stable fallback.

final result: passed
