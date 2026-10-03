import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Game } from "../types";
import { applyImageFallback } from "../utils/imageFallback";

export function LaunchSequence({ game, phase, onReady }: { game: Game; phase: "enter" | "launching" | "error"; onReady?: () => void }) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [logoReady, setLogoReady] = useState(false);
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
        initial={reducedMotion ? false : { scale: 1.045, opacity: 0 }}
        animate={{ scale: 1, opacity: phase === "error" ? .3 : .88 }}
        transition={{ duration: reducedMotion ? 0 : .75, ease: [.22, 1, .36, 1] }}
      >
        <img src={game.heroArtwork ?? game.artwork} alt="" onError={(event) => applyImageFallback(event, game.artwork)} />
      </motion.div>
      <div className="launch-sequence__shade" />
      <motion.div
        className="launch-sequence__content"
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onAnimationComplete={onReady}
        transition={{ duration: reducedMotion ? 0 : .48, delay: reducedMotion ? 0 : .18, ease: [.16, 1, .3, 1] }}
      >
        <small>NEXUS / {t("home.playSession")}</small>
        {game.logoArtwork ? <img className="launch-sequence__logo" src={game.logoArtwork} alt={game.title} hidden={!logoReady} onLoad={() => setLogoReady(true)} onError={() => setLogoReady(false)} /> : null}
        <strong hidden={logoReady}>{game.title}</strong>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={phase} initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: reducedMotion ? 0 : .18 }}>
            <i aria-hidden="true" />
            {t(phase === "error" ? "home.failed" : phase === "launching" ? "home.opening" : "home.preparing")}
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
