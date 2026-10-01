import { motion, useReducedMotion } from "motion/react";
import { NexusLogo } from "./NexusLogo";

export function StartupSequence() {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className="startup-sequence"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: reducedMotion ? 1 : 1.025 }}
      transition={{ duration: reducedMotion ? 0 : .42, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden="true"
    >
      <motion.div
        className="startup-sequence__frame"
        initial={reducedMotion ? false : { opacity: 0, scale: .96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reducedMotion ? 0 : .62, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="startup-sequence__halo"
        initial={reducedMotion ? false : { opacity: 0, scale: .88 }}
        animate={{ opacity: [.0, .38, .2], scale: [0.88, 1.04, 1] }}
        transition={{ duration: reducedMotion ? 0 : 1.18, times: [0, .58, 1], ease: "easeOut" }}
      />
      <motion.div
        className="startup-sequence__logo"
        initial={reducedMotion ? false : { opacity: 0, scale: .92, y: 12, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: reducedMotion ? 0 : .58, delay: reducedMotion ? 0 : .12, ease: [0.16, 1, 0.3, 1] }}
      >
        <NexusLogo />
      </motion.div>
      <motion.div
        className="startup-sequence__line"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: [0, 1, 1], opacity: [0, .78, 0] }}
        transition={{ duration: reducedMotion ? 0 : 1.06, delay: reducedMotion ? 0 : .3, times: [0, .56, 1], ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="startup-sequence__scan"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : .9, delay: reducedMotion ? 0 : .3, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.span
        className="startup-sequence__label"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: [.0, .56, 0], y: [8, 0, -4] }}
        transition={{ duration: reducedMotion ? 0 : 1.0, delay: reducedMotion ? 0 : .38, times: [0, .46, 1] }}
      >
        LAUNCHER
      </motion.span>
    </motion.div>
  );
}
