import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";

const letters = ["N", "E", "X", "U", "S"] as const;

export function StartupSequence() {
  const reducedMotion = useReducedMotion();
  const { t } = useTranslation();
  return (
    <motion.div
      className="startup-sequence"
      initial={false}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : .12, delay: reducedMotion ? 0 : .7 }}
      aria-hidden="true"
    >
      <div className="startup-sequence__panels">
        {letters.map((letter, index) => (
          <motion.div
            className="startup-sequence__panel"
            key={letter}
            exit={{ y: reducedMotion ? 0 : index % 2 === 0 ? "-102%" : "102%" }}
            transition={{ duration: reducedMotion ? 0 : .72, ease: [.76, 0, .24, 1] }}
          >
            <motion.span
              initial={reducedMotion ? false : { opacity: 0, y: "105%", skewY: 8 }}
              animate={{ opacity: 1, y: 0, skewY: 0 }}
              transition={{ duration: reducedMotion ? 0 : .76, delay: reducedMotion ? 0 : index * .105, ease: [.16, 1, .3, 1] }}
            >
              {letter}
            </motion.span>
            <small>0{index + 1}</small>
          </motion.div>
        ))}
      </div>
      <motion.div className="startup-sequence__meta" exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .15 }}>
        <span>NEXUS / {t("home.startupCollection")}</span>
        <strong>{t("home.startupSession")}</strong>
      </motion.div>
      <motion.span className="startup-sequence__foot" exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .15 }}>{t("home.startupLibrary")}</motion.span>
    </motion.div>
  );
}
