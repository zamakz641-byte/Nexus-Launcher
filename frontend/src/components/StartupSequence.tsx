import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { sfx } from "../audio/sfx";
import { useNexusStore } from "../state/useNexusStore";

export function StartupSequence({ onComplete }: { onComplete: () => void }) {
  const reducedMotion = useReducedMotion();
  const locale = useNexusStore((state) => state.locale);
  const film = `/assets/startup/nexus-startup-${locale}-v1.mp4`;
  const poster = `/assets/startup/nexus-startup-${locale}-v1-poster.jpg`;
  const video = useRef<HTMLVideoElement>(null);
  const finished = useRef(false);
  const [failed, setFailed] = useState(false);
  const preferences = sfx.getPreferences();
  const [muted, setMuted] = useState(() => !window.nexusDesktop || preferences.muted);
  const { t } = useTranslation();
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    video.current?.pause();
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const timer = window.setTimeout(finish, reducedMotion ? 650 : failed ? 500 : 12_000);
    return () => window.clearTimeout(timer);
  }, [finish, reducedMotion, failed]);

  useEffect(() => {
    const player = video.current;
    if (!player || reducedMotion || failed) return;
    let active = true;
    player.volume = preferences.masterVolume * preferences.uiVolume;
    player.muted = muted;
    void player.play().catch(() => {
      if (!active || finished.current) return;
      player.muted = true;
      setMuted(true);
      void player.play().catch(() => { if (active) setFailed(true); });
    });
    return () => { active = false; player.pause(); };
  }, [reducedMotion, failed, muted, film, preferences.masterVolume, preferences.uiVolume]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (["Enter", "Escape", " "].includes(event.key)) {
        // Allow the sound button to receive its normal keyboard activation.
        if (event.target instanceof Element && event.target.closest(".startup-sequence__sound") && event.key !== "Escape") return;
        event.preventDefault(); event.stopImmediatePropagation(); finish();
      }
    };
    let previousPressed = true;
    const timer = window.setInterval(() => {
      const pressed = Array.from(navigator.getGamepads?.() ?? []).some((pad) => pad?.buttons[0]?.pressed || pad?.buttons[1]?.pressed);
      if (pressed && !previousPressed) finish();
      previousPressed = pressed;
    }, 100);
    window.addEventListener("keydown", key, true);
    return () => { window.clearInterval(timer); window.removeEventListener("keydown", key, true); };
  }, [finish]);

  return (
    <motion.div className="startup-sequence" data-mode={reducedMotion ? "still" : "film"} initial={false} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .55 }} aria-label={t("onboarding.label")}>
      {failed ? <div className="startup-sequence__identity"><div className="startup-sequence__emblem"><img src="/assets/brand/nexus-mark.png" alt="" /></div><strong>NEXUS LAUNCHER</strong></div> : reducedMotion ? <img className="startup-sequence__film" src={poster} alt="Nexus Launcher" /> : <video ref={video} className="startup-sequence__film" src={film} playsInline preload="auto" muted={muted} onEnded={finish} onError={() => setFailed(true)} aria-hidden="true" />}
      {!reducedMotion && !failed && muted && !preferences.muted ? <button className="startup-sequence__sound" type="button" onClick={() => setMuted(false)}>{t("home.startupSound")}</button> : null}
      <button className="startup-sequence__skip" type="button" onClick={finish}>{t("onboarding.skip")} <kbd>↵</kbd></button>
    </motion.div>
  );
}
