import { useEffect, useRef } from 'react';

export function useHoldToLaunch(onLaunch: (id: string) => void) {
  const launch = useRef(onLaunch); launch.current = onLaunch;
  useEffect(() => {
    let active: HTMLElement | null = null, suppressed: HTMLElement | null = null;
    let timer = 0, keyboard = false, pointerId = -1, originX = 0, originY = 0;
    const cancel = () => { clearTimeout(timer); if (active) delete active.dataset.holding; active = null; };
    const start = (target: EventTarget | null, fromKeyboard: boolean) => {
      const button = target instanceof Element ? target.closest<HTMLElement>('[data-launch-game]') : null;
      const modal = document.querySelector('[role="dialog"]');
      if (!button || button.matches(':disabled') || active || button.closest('[inert], [aria-hidden="true"]') || (modal && !modal.contains(button)) || document.querySelector('.launch-sequence, .startup-sequence')) return false;
      suppressed = null; active = button; keyboard = fromKeyboard;
      button.dataset.holding = 'true';
      timer = window.setTimeout(() => {
        if (active !== button) return;
        suppressed = button; delete button.dataset.holding;
        launch.current(button.dataset.launchGame!);
      }, 650);
      return true;
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (start(event.target, false)) { pointerId = event.pointerId; originX = event.clientX; originY = event.clientY; }
    };
    const move = (event: PointerEvent) => { if (active && !keyboard && event.pointerId === pointerId && Math.hypot(event.clientX - originX, event.clientY - originY) > 12) cancel(); };
    const up = () => { if (!keyboard) cancel(); };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') { cancel(); return; }
      if (active && keyboard) { event.preventDefault(); return; }
      if (!event.repeat && start(event.target, true)) event.preventDefault();
    };
    const keyUp = (event: KeyboardEvent) => {
      if (!active || !keyboard || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault(); const button = active; const held = suppressed === button;
      cancel(); if (!held && button.isConnected) button.click();
    };
    const click = (event: MouseEvent) => {
      if (suppressed && event.target instanceof Node && suppressed.contains(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const blur = (event: FocusEvent) => { if (!(event.target instanceof Element) || (active && event.target === active)) cancel(); };
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('pointerdown', down, true); window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', cancel, true);
    window.addEventListener('keydown', keyDown, true); window.addEventListener('keyup', keyUp, true);
    window.addEventListener('click', click, true); window.addEventListener('blur', blur, true);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancel(); window.removeEventListener('pointerdown', down, true); window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', cancel, true);
      window.removeEventListener('keydown', keyDown, true); window.removeEventListener('keyup', keyUp, true);
      window.removeEventListener('click', click, true); window.removeEventListener('blur', blur, true);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
}
