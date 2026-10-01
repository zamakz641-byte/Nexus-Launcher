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
        initial={reducedMotion ? false : { scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: phase === "error" ? .18 : .48 }}
        transition={{ duration: reducedMotion ? 0 : .72, ease: [0.22, 1, 0.36, 1] }}
      >
        <img src={game.heroArtwork ?? game.artwork} alt="" onError={(event) => applyImageFallback(event, game.artwork)} />
      </motion.div>
      <div className="launch-sequence__shade" />
      <motion.div className="launch-sequence__frame" initial={reducedMotion ? false : { opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reducedMotion ? 0 : .48 }} />
      <motion.div
        className="launch-sequence__content"
        initial={reducedMotion ? false : { opacity: 0, y: 20, scale: .98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onAnimationComplete={onReady}
        transition={{ duration: reducedMotion ? 0 : .42, ease: [0.16, 1, 0.3, 1] }}
      >
        <small>NEXUS / PLAY</small>
        {game.logoArtwork
          ? <img className="launch-sequence__logo" src={game.logoArtwork} alt={game.title} />
          : <strong>{game.title}</strong>}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={phase} initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: reducedMotion ? 0 : .18 }}>
            {t(phase === "error" ? "home.failed" : phase === "launching" ? "home.opening" : "home.preparing")}
          </motion.span>
        </AnimatePresence>
        <motion.i
          initial={{ scaleX: 0 }}
          animate={{ scaleX: phase === "error" ? 0 : phase === "launching" ? 1 : .42 }}
          transition={{ duration: reducedMotion ? 0 : phase === "enter" ? .4 : .24, ease: [0.22, 1, 0.36, 1] }}
        />
      </motion.div>
    </motion.div>
  );
}
