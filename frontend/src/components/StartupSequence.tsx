import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { createGlassScene } from "../motion/glassScene";

export function StartupSequence({ onSkip }: { onSkip?: () => void }) {
  const reducedMotion = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const { t } = useTranslation();
  useEffect(() => canvas.current ? createGlassScene(canvas.current, Boolean(reducedMotion)) : undefined, [reducedMotion]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (["Enter", "Escape", " "].includes(event.key)) { event.preventDefault(); event.stopImmediatePropagation(); onSkip?.(); } };
    let previousPressed = true;
    const controllerTimer = window.setInterval(() => {
      const pressed = Array.from(navigator.getGamepads?.() ?? []).some((pad) => pad?.buttons[0]?.pressed || pad?.buttons[1]?.pressed);
      if (pressed && !previousPressed) onSkip?.();
      previousPressed = pressed;
    }, 100);
    window.addEventListener("keydown", key, true);
    return () => { window.clearInterval(controllerTimer); window.removeEventListener("keydown", key, true); };
  }, [onSkip]);
  return (
    <motion.div className="startup-sequence" initial={false} exit={{ opacity: 0, scale: reducedMotion ? 1 : 1.055 }} transition={{ duration: reducedMotion ? 0 : .65, ease: [.22, 1, .36, 1] }}>
      <canvas ref={canvas} className="startup-sequence__scene" aria-hidden="true" />
      <motion.div className="startup-sequence__identity" initial={reducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 1, delay: reducedMotion ? 0 : .65 }}>
        <div className="startup-sequence__emblem"><img src="/assets/brand/nexus-mark.png" alt="" /></div>
        <strong>NEXUS</strong><span>{t("home.startupLibrary")}</span>
      </motion.div>
      <button className="startup-sequence__skip" onClick={onSkip}>{t("onboarding.skip")} <kbd>↵</kbd></button>
    </motion.div>
  );
}
