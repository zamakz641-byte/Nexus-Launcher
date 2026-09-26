import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FolderSimplePlus, GameController, GlobeHemisphereWest, Sparkle } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNexusStore } from "../state/useNexusStore";
import type { Locale, ThemeId } from "../types";
import { NexusLogo } from "./NexusLogo";

interface OnboardingProps { open: boolean; onComplete: () => void; onAddFolder: () => Promise<void>; }

const steps = ["identity", "personalize", "library", "control"] as const;

export function Onboarding({ open, onComplete, onAddFolder }: OnboardingProps) {
  const { i18n, t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [importMessage, setImportMessage] = useState("");
  const locale = useNexusStore((state) => state.locale);
  const theme = useNexusStore((state) => state.theme);
  const setLocale = useNexusStore((state) => state.setLocale);
  const setTheme = useNexusStore((state) => state.setTheme);

  const chooseLocale = (value: Locale) => {
    setLocale(value);
    void i18n.changeLanguage(value);
    document.documentElement.lang = value;
    document.documentElement.dir = i18n.dir(value);
  };

  const next = () => {
    if (step === steps.length - 1) onComplete();
    else setStep((current) => current + 1);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.section className="onboarding" aria-label={t("onboarding.label")} initial={false} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.28 }}>
          <motion.div className="onboarding__ambient" initial={reducedMotion ? false : { opacity: 0, scale: 0.88 }} animate={{ opacity: 0.62, scale: 1 }} transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }} />
          <button className="onboarding__skip" onClick={onComplete} type="button">{t("onboarding.skip")}</button>
          <div className="onboarding__frame">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                className="onboarding__step"
                key={steps[step]}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ type: "spring", duration: 0.52, bounce: 0 }}
              >
                {step === 0 ? (
                  <>
                    <motion.div className="onboarding__mark" initial={reducedMotion ? false : { opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", duration: 0.8, bounce: 0 }}>
                      <NexusLogo />
                    </motion.div>
                    <span className="onboarding__eyebrow">{t("onboarding.version")}</span>
                    <h1 style={{ whiteSpace: "pre-line" }}>{t("onboarding.hero")}</h1>
                    <p>{t("onboarding.heroDesc")}</p>
                  </>
                ) : null}

                {step === 1 ? (
                  <>
                    <div className="onboarding__icon"><GlobeHemisphereWest size={34} weight="light" /></div>
                    <span className="onboarding__eyebrow">{t("onboarding.yours")}</span>
                    <h1 style={{ whiteSpace: "pre-line" }}>{t("onboarding.languageHero")}</h1>
                    <p>{t("onboarding.languageDesc")}</p>
                    <div className="onboarding__choices">
                      <div className="choice-group" role="group" aria-label={t("onboarding.language")}>
                        <button data-selected={locale === "fr"} onClick={() => chooseLocale("fr")} type="button">Français</button>
                        <button data-selected={locale === "en"} onClick={() => chooseLocale("en")} type="button">English</button>
                      </div>
                      <div className="choice-group" role="group" aria-label={t("onboarding.theme")}>
                        {(["obsidienne", "solaris"] as ThemeId[]).map((id) => <button data-selected={theme === id} key={id} onClick={() => setTheme(id)} type="button">{t(`system.${id}`)}</button>)}
                      </div>
                    </div>
                  </>
                ) : null}

                {step === 2 ? (
                  <>
                    <div className="onboarding__icon"><FolderSimplePlus size={38} weight="light" /></div>
                    <span className="onboarding__eyebrow">{t("onboarding.library")}</span>
                    <h1 style={{ whiteSpace: "pre-line" }}>{t("onboarding.libraryHero")}</h1>
                    <p>{t("onboarding.libraryDesc")}</p>
                    {window.nexusDesktop ? <button className="onboarding__next" onClick={() => void onAddFolder().then(() => setImportMessage("onboarding.libraryUpdated")).catch((error: unknown) => setImportMessage(error instanceof Error ? error.message : "settings.addError"))} type="button"><FolderSimplePlus size={18} />{t("onboarding.addFolder")}</button> : null}
                    {importMessage ? <p role="status">{importMessage === "onboarding.libraryUpdated" || importMessage === "settings.addError" ? t(importMessage) : importMessage}</p> : null}
                  </>
                ) : null}

                {step === 3 ? (
                  <>
                    <div className="onboarding__icon"><GameController size={38} weight="light" /></div>
                    <span className="onboarding__eyebrow">{t("onboarding.control")}</span>
                    <h1 style={{ whiteSpace: "pre-line" }}>{t("onboarding.controlHero")}</h1>
                    <p>{t("onboarding.controlDesc")}</p>
                    <div className="control-demo" aria-hidden="true"><kbd>↑</kbd><span><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><i /><kbd className="control-demo__confirm">A</kbd></div>
                  </>
                ) : null}
              </motion.div>
            </AnimatePresence>

            <footer className="onboarding__footer">
              <div className="onboarding__progress" aria-label={t("onboarding.step", { current: step + 1, total: steps.length })}>{steps.map((item, index) => <span data-active={index <= step} key={item} />)}</div>
              <button className="onboarding__next" onClick={next} type="button"><span>{step === steps.length - 1 ? t("onboarding.enter") : t("onboarding.continue")}</span><Sparkle size={18} weight="fill" /></button>
            </footer>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
