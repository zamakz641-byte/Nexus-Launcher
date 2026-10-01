import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { Game } from "../types";
import { applyImageFallback } from "../utils/imageFallback";

export function LaunchSequence({ game, phase, onReady }: { game: Game; phase: "enter" | "launching" | "error"; onReady?: () => void }) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className="launch-sequence"
      data-phase={phase}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : .28 }}
      aria-live="polite"
    >
      <motion.div
        className="launch-sequence__backdrop"
        initial={reducedMotion ? false : { clipPath: "inset(0 100% 0 0)", opacity: 1 }}
        animate={{ clipPath: "inset(0 0 0 0)", opacity: phase === "error" ? .3 : .78 }}
        transition={{ duration: reducedMotion ? 0 : .72, ease: [.76, 0, .24, 1] }}
      >
        <img src={game.heroArtwork ?? game.artwork} alt="" onError={(event) => applyImageFallback(event, game.artwork)} />
      </motion.div>
      <div className="launch-sequence__shade" />
      <motion.div
        className="launch-sequence__content"
        initial={reducedMotion ? false : { opacity: 0, x: -28 }}
        animate={{ opacity: 1, x: 0 }}
        onAnimationComplete={onReady}
        transition={{ duration: reducedMotion ? 0 : .48, delay: reducedMotion ? 0 : .18, ease: [.16, 1, .3, 1] }}
      >
        <small>NEXUS / {t("home.playSession")}</small>
        <strong>{game.title}</strong>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={phase} initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: reducedMotion ? 0 : .18 }}>
            {t(phase === "error" ? "home.failed" : phase === "launching" ? "home.opening" : "home.preparing")}
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
