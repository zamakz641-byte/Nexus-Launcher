import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNexusStore } from "../state/useNexusStore";
import { sfx } from "../audio/sfx";
import { primaryRoutes } from "../motion/transitions";

const repeatDelay = 180;
const tabCooldown = 360;
const focusableSelector = [
  "a[href]", "button:not([disabled])", "input:not([disabled])",
  "select:not([disabled])", "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

type Direction = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

function keepsDirectionalKey(element: Element | null, direction: Direction) {
  if (!(element instanceof HTMLElement)) return false;
  if (element.matches("textarea, [contenteditable='true']")) return true;
  if (element.matches("input")) return direction === "ArrowLeft" || direction === "ArrowRight";
  return element.matches("select");
}

function visibleFocusableElements() {
  return Array.from(document.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 1 && rect.height > 1 && style.visibility !== "hidden" && style.display !== "none";
  });
}

function moveSpatially(direction: Direction) {
  const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const candidates = visibleFocusableElements();
  if (!candidates.length) return false;
  if (!current || current === document.body || !candidates.includes(current)) {
    candidates[0]?.focus({ preventScroll: true });
    return true;
  }

  const from = current.getBoundingClientRect();
  const fx = from.left + from.width / 2;
  const fy = from.top + from.height / 2;
  let best: { element: HTMLElement; score: number; aligned: boolean } | undefined;

  for (const element of candidates) {
    if (element === current) continue;
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const dx = x - fx;
    const dy = y - fy;
    const valid =
      (direction === "ArrowLeft" && dx < -6) ||
      (direction === "ArrowRight" && dx > 6) ||
      (direction === "ArrowUp" && dy < -6) ||
      (direction === "ArrowDown" && dy > 6);
    if (!valid) continue;

    const primary = direction === "ArrowLeft" || direction === "ArrowRight" ? Math.abs(dx) : Math.abs(dy);
    const secondary = direction === "ArrowLeft" || direction === "ArrowRight" ? Math.abs(dy) : Math.abs(dx);
    const crossAxisGap = direction === "ArrowLeft" || direction === "ArrowRight"
      ? Math.max(0, rect.top - from.bottom, from.top - rect.bottom)
      : Math.max(0, rect.left - from.right, from.left - rect.right);
    const crossAxisSize = direction === "ArrowLeft" || direction === "ArrowRight"
      ? Math.max(from.height, rect.height)
      : Math.max(from.width, rect.width);
    const aligned = crossAxisGap <= crossAxisSize;
    const alignmentPenalty = secondary > primary * 1.7 ? secondary * 2.2 : secondary * .72;
    const score = primary + alignmentPenalty;
    if (!best || (aligned && !best.aligned) || (aligned === best.aligned && score < best.score)) {
      best = { element, score, aligned };
    }
  }

  if (!best) {
    const group = current.closest<HTMLElement>("[data-focus-group]");
    const pool = group ? candidates.filter((element) => group.contains(element) && element !== current) : [];
    if (pool.length) {
      const scored = pool.map((element) => {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const secondary = direction === "ArrowLeft" || direction === "ArrowRight" ? Math.abs(y - fy) : Math.abs(x - fx);
        const edge = direction === "ArrowRight" ? x : direction === "ArrowLeft" ? -x : direction === "ArrowDown" ? y : -y;
        return { element, score: edge + secondary * .2 };
      });
      scored.sort((a, b) => a.score - b.score);
      best = scored[0] ? { ...scored[0], aligned: true } : undefined;
    }
  }

  if (!best) return false;
  best.element.focus({ preventScroll: true });
  best.element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  return true;
}

export function useGamepadNavigation() {
  const setInputMode = useNexusStore((state) => state.setInputMode);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const location = useLocation();
  const locationRef = useRef({ pathname: location.pathname, key: location.key });

  useEffect(() => {
    navigateRef.current = navigate;
    locationRef.current = { pathname: location.pathname, key: location.key };
  }, [location.key, location.pathname, navigate]);

  useEffect(() => {
    let frame = 0;
    const active = new Set<string>();
    const lastActionAt = new Map<string, number>();
    let tabLockUntil = 0;

    const switchPrimaryRoute = (delta: -1 | 1) => {
      const now = performance.now();
      if (now < tabLockUntil) return;
      tabLockUntil = now + tabCooldown;

      const currentPath = locationRef.current.pathname.startsWith("/game/") ? "/library" : locationRef.current.pathname;
      const currentIndex = primaryRoutes.indexOf(currentPath as (typeof primaryRoutes)[number]);
      const baseIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextPath = primaryRoutes[(baseIndex + delta + primaryRoutes.length) % primaryRoutes.length];
      if (nextPath === currentPath) return;

      sfx.play("tab");
      navigateRef.current(nextPath, { state: { direction: delta } });
      window.setTimeout(() => {
        document.querySelector<HTMLElement>(`.top-navigation__route[href="${nextPath}"]`)?.focus({ preventScroll: true });
      }, 120);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector(".launch-sequence")) { event.preventDefault(); return; }
      if (event.isTrusted) setInputMode("keyboard");
      if (event.defaultPrevented) return;

      if (event.key === "GamepadLB" || event.key === "GamepadRB") {
        event.preventDefault();
        switchPrimaryRoute(event.key === "GamepadLB" ? -1 : 1);
        return;
      }

      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        const direction = event.key as Direction;
        const target = event.target instanceof Element ? event.target : null;
        const homeOwnsVerticalMove =
          locationRef.current.pathname === "/" &&
          (direction === "ArrowUp" || direction === "ArrowDown") &&
          Boolean(target?.closest(".hero-game, .top-navigation"));

        if (!homeOwnsVerticalMove && !keepsDirectionalKey(target, direction)) {
          const moved = moveSpatially(direction);
          if (moved) event.preventDefault();
        }
      }

      if (event.key === "Escape" && !document.querySelector('[role="dialog"]') && locationRef.current.pathname !== "/") {
        event.preventDefault();
        sfx.play("back");
        const { pathname, key } = locationRef.current;
        if (key === "default") navigateRef.current(pathname.startsWith("/game/") ? "/library" : "/", { replace: true });
        else navigateRef.current(-1);
      }
    };

    const onPointer = () => setInputMode("pointer");
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointer, { passive: true });

    const dispatch = (key: string) => {
      if (document.querySelector(".launch-sequence")) return;
      setInputMode("controller");
      const target = document.activeElement instanceof HTMLElement ? document.activeElement : document.body;
      if (key === "Enter" && target !== document.body) {
        target.click();
        return;
      }
      target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    };

    const poll = (timestamp: number) => {
      const gamepad = navigator.getGamepads?.()[0];
      if (gamepad) {
        const intents: Array<[string, boolean, string, boolean]> = [
          ["left", Boolean(gamepad.buttons[14]?.pressed || gamepad.axes[0] < -0.55), "ArrowLeft", true],
          ["right", Boolean(gamepad.buttons[15]?.pressed || gamepad.axes[0] > 0.55), "ArrowRight", true],
          ["up", Boolean(gamepad.buttons[12]?.pressed || gamepad.axes[1] < -0.55), "ArrowUp", true],
          ["down", Boolean(gamepad.buttons[13]?.pressed || gamepad.axes[1] > 0.55), "ArrowDown", true],
          ["confirm", Boolean(gamepad.buttons[0]?.pressed), "Enter", false],
          ["back", Boolean(gamepad.buttons[1]?.pressed), "Escape", false],
          ["tab-prev", Boolean(gamepad.buttons[4]?.pressed), "GamepadLB", false],
          ["tab-next", Boolean(gamepad.buttons[5]?.pressed), "GamepadRB", false],
        ];

        for (const [name, pressed, key, repeatable] of intents) {
          const wasActive = active.has(name);
          const last = lastActionAt.get(name) ?? 0;
          if (pressed && (!wasActive || (repeatable && timestamp - last > repeatDelay))) {
            active.add(name);
            lastActionAt.set(name, timestamp);
            dispatch(key);
          } else if (!pressed) {
            active.delete(name);
            lastActionAt.delete(name);
          }
        }
      }

      frame = requestAnimationFrame(poll);
    };

    frame = requestAnimationFrame(poll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [setInputMode]);
}
