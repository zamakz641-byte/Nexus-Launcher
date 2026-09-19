import { useEffect, useRef } from 'react';
import { ViewType } from '../types/game';
import { playSfx } from './sound';

interface ControllerProps {
  activeView: ViewType;
  switchView: (view: ViewType) => void;
  onSelectNextGame: () => void;
  onSelectPrevGame: () => void;
  onLaunchSelected: () => void;
  onOpenDetails: () => void;
  onOpenSearch: () => void;
  onBack: () => void;
  modalOpen: boolean;
  sfxEnabled: boolean;
}

const VIEWS_ORDER: ViewType[] = [
  'accueil',
  'bibliotheque',
  'collections',
  'succes',
  'statistiques',
  'parametres',
];

const FOCUSABLE = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type Direction = 'up' | 'down' | 'left' | 'right';

function visible(element: HTMLElement): boolean {
  if (element.dataset.controllerSkip === 'true') return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 1 || rect.height <= 1) return false;
  let node: HTMLElement | null = element;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity || 1) <= 0.03) return false;
    if (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('inert')) return false;
    node = node.parentElement;
  }
  return true;
}

function currentScope(modalOpen: boolean): HTMLElement | Document {
  if (!modalOpen) return document;
  const scopes = [...document.querySelectorAll<HTMLElement>('[data-controller-scope="true"]')].filter(visible);
  return scopes.at(-1) || document;
}

function focusables(scope: HTMLElement | Document): HTMLElement[] {
  return [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element, index, all) => {
    if (!visible(element)) return false;
    return all.indexOf(element) === index;
  });
}

function markFocused(element: HTMLElement, sfxEnabled: boolean): void {
  document.querySelectorAll('.nexus-controller-focus').forEach((node) => node.classList.remove('nexus-controller-focus'));
  element.classList.add('nexus-controller-focus');
  try { element.focus({ preventScroll: true }); } catch { element.focus(); }
  // Console navigation must feel immediate. Smooth scrolling made fast D-pad
  // presses look like focus was teleporting while the page was still moving.
  element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  if (element.dataset.controllerFocusSfx !== 'managed') playSfx('focus', sfxEnabled, 0.55);
}

function ensureFocus(scope: HTMLElement | Document, sfxEnabled: boolean, silent = false): HTMLElement | null {
  const items = focusables(scope);
  if (!items.length) return null;
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (active && items.includes(active) && visible(active)) return active;
  const preferred = items.find((item) => item.dataset.controllerDefault === 'true') || items[0];
  if (silent) {
    document.querySelectorAll('.nexus-controller-focus').forEach((node) => node.classList.remove('nexus-controller-focus'));
    preferred.classList.add('nexus-controller-focus');
    try { preferred.focus({ preventScroll: true }); } catch { preferred.focus(); }
  } else {
    markFocused(preferred, sfxEnabled);
  }
  return preferred;
}

function explicitTarget(active: HTMLElement, direction: Direction, scope: HTMLElement | Document): HTMLElement | null {
  const attr = `controller${direction[0].toUpperCase()}${direction.slice(1)}` as 'controllerUp' | 'controllerDown' | 'controllerLeft' | 'controllerRight';
  const selector = active.dataset[attr];
  if (!selector) return null;
  try {
    const element = scope.querySelector<HTMLElement>(selector);
    return element && visible(element) ? element : null;
  } catch {
    return null;
  }
}

function moveInRail(active: HTMLElement, direction: Direction, scope: HTMLElement | Document, sfxEnabled: boolean): boolean {
  if (active.dataset.controllerGameCard !== 'true' || (direction !== 'left' && direction !== 'right')) return false;
  const cards = [...scope.querySelectorAll<HTMLElement>('[data-controller-game-card="true"]')].filter(visible);
  const index = cards.indexOf(active);
  if (index < 0) return false;
  const next = index + (direction === 'right' ? 1 : -1);
  // Do not wrap into another UI zone. At the edge, focus simply stays put,
  // matching console carousels and preventing a Right press from jumping down.
  if (next < 0 || next >= cards.length) return true;
  markFocused(cards[next], sfxEnabled);
  return true;
}

function moveInsideRow(active: HTMLElement, direction: Direction, sfxEnabled: boolean): boolean {
  if (direction !== 'left' && direction !== 'right') return false;
  const row = active.closest<HTMLElement>('[data-controller-row="true"]');
  if (!row) return false;
  const items = focusables(row);
  const index = items.indexOf(active);
  if (index < 0) return false;
  const next = index + (direction === 'right' ? 1 : -1);
  if (next < 0 || next >= items.length) return true;
  markFocused(items[next], sfxEnabled);
  return true;
}

function moveFocus(direction: Direction, scope: HTMLElement | Document, sfxEnabled: boolean): void {
  const items = focusables(scope);
  if (!items.length) return;
  const active = document.activeElement instanceof HTMLElement && items.includes(document.activeElement as HTMLElement)
    ? (document.activeElement as HTMLElement)
    : ensureFocus(scope, sfxEnabled, true);
  if (!active) return;

  const explicit = explicitTarget(active, direction, scope);
  if (explicit) {
    markFocused(explicit, sfxEnabled);
    return;
  }

  if (moveInRail(active, direction, scope, sfxEnabled)) return;
  if (moveInsideRow(active, direction, sfxEnabled)) return;

  const a = active.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  let best: { element: HTMLElement; score: number } | null = null;

  for (const element of items) {
    if (element === active) continue;
    const r = element.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const dx = x - ax;
    const dy = y - ay;
    let primary = 0;
    let secondary = 0;
    if (direction === 'right') { if (dx <= 3) continue; primary = dx; secondary = Math.abs(dy); }
    if (direction === 'left') { if (dx >= -3) continue; primary = -dx; secondary = Math.abs(dy); }
    if (direction === 'down') { if (dy <= 3) continue; primary = dy; secondary = Math.abs(dx); }
    if (direction === 'up') { if (dy >= -3) continue; primary = -dy; secondary = Math.abs(dx); }

    // Reject extreme diagonal jumps. They were the main reason a horizontal
    // D-pad press could suddenly land on a button one section lower.
    const axisTolerance = Math.max(direction === 'left' || direction === 'right' ? a.height : a.width, 42);
    if (secondary > primary * 1.15 + axisTolerance * 1.35) continue;

    const score = primary * 1.65 + secondary * 0.92 + Math.hypot(dx, dy) * 0.08;
    if (!best || score < best.score) best = { element, score };
  }

  if (best) markFocused(best.element, sfxEnabled);
  // Deliberately no DOM-order fallback. A missing neighbour should keep focus
  // where it is, never wrap into an unrelated section of the interface.
}

function activateFocused(scope: HTMLElement | Document, sfxEnabled: boolean): boolean {
  const active = document.activeElement instanceof HTMLElement && scope.contains(document.activeElement)
    ? document.activeElement as HTMLElement
    : ensureFocus(scope, sfxEnabled, true);
  if (!active || !visible(active)) return false;

  if (active instanceof HTMLTextAreaElement || (active instanceof HTMLInputElement && !['button', 'checkbox', 'radio', 'submit'].includes(active.type))) {
    active.focus();
    return true;
  }

  active.click();
  playSfx('confirm', sfxEnabled, 0.55);
  return true;
}

function scopedBack(scope: HTMLElement | Document, onBack: () => void): void {
  const buttons = [...scope.querySelectorAll<HTMLElement>('[data-controller-back="true"]')].filter((element) => {
    // Back buttons can be controller-skip=true so they stay out of spatial
    // navigation while remaining the semantic B/Circle target.
    const rect = element.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.03;
  });
  const button = buttons.at(-1);
  if (button) {
    button.click();
    return;
  }
  onBack();
}

function connectedGamepad(): Gamepad | null {
  if (!navigator.getGamepads) return null;
  return [...navigator.getGamepads()].find((pad): pad is Gamepad => Boolean(pad?.connected)) || null;
}

export function useController({
  activeView,
  switchView,
  onSelectNextGame,
  onSelectPrevGame,
  onLaunchSelected,
  onOpenDetails,
  onOpenSearch,
  onBack,
  modalOpen,
  sfxEnabled,
}: ControllerProps) {
  const lastButtonTimeRef = useRef<Record<string, number>>({});

  void onSelectNextGame;
  void onSelectPrevGame;
  void onLaunchSelected;

  useEffect(() => {
    const id = window.setTimeout(() => ensureFocus(currentScope(modalOpen), sfxEnabled, true), modalOpen ? 70 : 0);
    return () => window.clearTimeout(id);
  }, [modalOpen, activeView, sfxEnabled]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const scope = currentScope(modalOpen);
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;

      if (e.key === 'Escape') {
        e.preventDefault();
        scopedBack(scope, onBack);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSearch();
        return;
      }
      if (typing && !['Escape', 'Enter'].includes(e.key)) return;

      const direction: Direction | null =
        e.key === 'ArrowRight' ? 'right' : e.key === 'ArrowLeft' ? 'left' :
        e.key === 'ArrowUp' ? 'up' : e.key === 'ArrowDown' ? 'down' : null;
      if (direction) {
        e.preventDefault();
        moveFocus(direction, scope, sfxEnabled);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        activateFocused(scope, sfxEnabled);
        return;
      }
      if (e.key === ' ' || e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        if (!modalOpen) onOpenDetails();
        return;
      }
      if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); if (!modalOpen) onOpenSearch(); return; }
      if (!modalOpen && (e.key === '[' || e.key === 'PageUp')) {
        e.preventDefault();
        const curIdx = VIEWS_ORDER.indexOf(activeView);
        switchView(VIEWS_ORDER[(curIdx - 1 + VIEWS_ORDER.length) % VIEWS_ORDER.length]);
      } else if (!modalOpen && (e.key === ']' || e.key === 'PageDown')) {
        e.preventDefault();
        const curIdx = VIEWS_ORDER.indexOf(activeView);
        switchView(VIEWS_ORDER[(curIdx + 1) % VIEWS_ORDER.length]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    let pollTimer = 0;
    const pollGamepad = () => {
      // A 30 Hz controller poll is indistinguishable from 60 Hz for menu input
      // and halves the permanent JS work. When hidden/in-game, reduce it to a
      // heartbeat so WebView2 can become genuinely idle.
      if (document.hidden || document.documentElement.classList.contains('nexus-sleep')) {
        pollTimer = window.setTimeout(pollGamepad, 280);
        return;
      }
      const gp = connectedGamepad();

      if (gp) {
        const now = performance.now();
        const throttle = (btnKey: string, delay = 190): boolean => {
          const last = lastButtonTimeRef.current[btnKey] || 0;
          if (now - last > delay) {
            lastButtonTimeRef.current[btnKey] = now;
            return true;
          }
          return false;
        };

        const scope = currentScope(modalOpen);
        const axisX = gp.axes[0] || 0;
        const axisY = gp.axes[1] || 0;
        const left = gp.buttons[14]?.pressed || axisX < -0.62;
        const right = gp.buttons[15]?.pressed || axisX > 0.62;
        const up = gp.buttons[12]?.pressed || axisY < -0.62;
        const down = gp.buttons[13]?.pressed || axisY > 0.62;

        if (up && throttle('dir_up')) moveFocus('up', scope, sfxEnabled);
        else if (down && throttle('dir_down')) moveFocus('down', scope, sfxEnabled);
        else if (right && throttle('dir_right')) moveFocus('right', scope, sfxEnabled);
        else if (left && throttle('dir_left')) moveFocus('left', scope, sfxEnabled);

        if (gp.buttons[0]?.pressed && throttle('btn_confirm', 240)) activateFocused(scope, sfxEnabled);
        if (gp.buttons[1]?.pressed && throttle('btn_back', 260)) {
          playSfx('back', sfxEnabled, 0.55);
          scopedBack(scope, onBack);
        }
        if (gp.buttons[2]?.pressed && throttle('btn_details', 280) && !modalOpen) onOpenDetails();
        if (gp.buttons[3]?.pressed && throttle('btn_search', 280) && !modalOpen) onOpenSearch();

        if (!modalOpen && gp.buttons[4]?.pressed && throttle('btn_lb', 300)) {
          const curIdx = VIEWS_ORDER.indexOf(activeView);
          switchView(VIEWS_ORDER[(curIdx - 1 + VIEWS_ORDER.length) % VIEWS_ORDER.length]);
        }
        if (!modalOpen && gp.buttons[5]?.pressed && throttle('btn_rb', 300)) {
          const curIdx = VIEWS_ORDER.indexOf(activeView);
          switchView(VIEWS_ORDER[(curIdx + 1) % VIEWS_ORDER.length]);
        }
      }
      pollTimer = window.setTimeout(pollGamepad, 32);
    };

    pollTimer = window.setTimeout(pollGamepad, 0);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(pollTimer);
    };
  }, [activeView, switchView, onOpenDetails, onOpenSearch, onBack, modalOpen, sfxEnabled]);
}
