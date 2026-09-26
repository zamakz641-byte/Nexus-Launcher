import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { Game } from "../types";
import { applyImageFallback } from "../utils/imageFallback";

export function LaunchSequence({ game, phase, onReady }: { game: Game; phase: "enter" | "launching" | "error"; onReady?: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.div
      className="launch-sequence"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: .22 }}
      aria-live="polite"
    >
      <motion.div
        className="launch-sequence__backdrop"
        initial={{ scale: 1.035, opacity: 0 }}
        animate={{ scale: 1, opacity: .38 }}
        transition={{ duration: .55, ease: [0.22, 1, 0.36, 1] }}
      >
        <img src={game.heroArtwork ?? game.artwork} alt="" onError={(event) => applyImageFallback(event, game.artwork)} />
      </motion.div>
      <div className="launch-sequence__shade" />
      <motion.div
        className="launch-sequence__content"
        initial={{ opacity: 0, y: 18, scale: .97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onAnimationComplete={onReady}
        transition={{ duration: .42, ease: [0.16, 1, 0.3, 1] }}
      >
        {game.logoArtwork
          ? <img className="launch-sequence__logo" src={game.logoArtwork} alt={game.title} />
          : <strong>{game.title}</strong>}
        <span>{t(phase === "error" ? "home.failed" : phase === "launching" ? "home.opening" : "home.preparing")}</span>
        <motion.i
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: .78, ease: [0.22, 1, 0.36, 1] }}
        />
      </motion.div>
    </motion.div>
  );
}
