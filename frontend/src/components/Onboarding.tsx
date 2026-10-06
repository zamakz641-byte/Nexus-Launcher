import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FolderSimplePlus, GameController, GlobeHemisphereWest, Sparkle, Trophy, Check } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNexusStore } from "../state/useNexusStore";
import type { Locale, ThemeId } from "../types";
import { NexusLogo } from "./NexusLogo";
import { useSteamNotifications } from "../hooks/useSteamNotifications";
import { steamConsoleCopy } from "../steamConsoleCopy";

interface OnboardingProps { open: boolean; onComplete: () => void; onAddFolder: () => Promise<{ folder: string; count: number } | null>; }

const steps = ["library", "personalize", "control"] as const;

export function Onboarding({ open, onComplete, onAddFolder }: OnboardingProps) {
  const { i18n, t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [importMessage, setImportMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [folder, setFolder] = useState("");
  const [libraryChoice, setLibraryChoice] = useState(false);
  const [notifyChoice,setNotifyChoice]=useState(false);
  const notifications=useSteamNotifications(open),notifyCopy=steamConsoleCopy[useNexusStore(state=>state.locale)];
  const notifyInitialized=useRef(false);
  useEffect(()=>{if(open&&notifications.status&&!notifyInitialized.current){notifyInitialized.current=true;setNotifyChoice(notifications.status.enabled||['downloading','installing'].includes(notifications.status.state));}},[open,notifications.status]);
  const frame = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const locale = useNexusStore((state) => state.locale);
  const theme = useNexusStore((state) => state.theme);
  const setLocale = useNexusStore((state) => state.setLocale);
  const setTheme = useNexusStore((state) => state.setTheme);
  const gameCount = useNexusStore((state) => state.discoveredGames.length);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (open) { setStep(0); setLibraryChoice(false); setFolder(""); setImportMessage(""); } }, [open]);
  const focusStep = useCallback((node: HTMLDivElement | null) => {
    if (!node || !open) return;
    requestAnimationFrame(() => {
      if (!node.isConnected) return;
      (node.querySelector<HTMLButtonElement>('button') || frame.current?.querySelector<HTMLButtonElement>('.onboarding__footer button'))?.focus();
    });
  }, [open]);
  const addFolder = async () => {
    if (importing) return;
    setImporting(true); setImportMessage("");
    try {
      const result = await onAddFolder();
      if (mounted.current && result) { setFolder(result.folder); setLibraryChoice(true); setImportMessage(t("onboarding.folderReady", { count: result.count })); }
    } catch (error) { if (mounted.current) setImportMessage(error instanceof Error ? error.message : t("settings.addError")); }
    finally { if (mounted.current) setImporting(false); }
  };

  const chooseLocale = (value: Locale) => {
    setLocale(value);
    void i18n.changeLanguage(value);
    document.documentElement.lang = value;
    document.documentElement.dir = i18n.dir(value);
  };

  const next = () => {
    if (step === steps.length - 1) {
      if(notifyChoice&&!notifications.status?.enabled&&!notifications.busy)void notifications.activate();
      else if(!notifyChoice){void notifications.desktop?.cancelSteamNotificationSetup();if(notifications.status?.enabled)void notifications.disable();}
      onComplete();
    }
    else setStep((current) => current + 1);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.section className="onboarding" role="dialog" aria-modal="true" aria-label={t("onboarding.label")} initial={false} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.28 }} onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
          if (!buttons.length) return;
          event.preventDefault();
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
        }}>
          <motion.div className="onboarding__ambient" initial={reducedMotion ? false : { opacity: 0, scale: 0.88 }} animate={{ opacity: 0.62, scale: 1 }} transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }} />
          <button className="onboarding__skip" disabled={importing} onClick={onComplete} type="button">{t("onboarding.later")}</button>
          <div className="onboarding__frame" ref={frame}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                className="onboarding__step"
                ref={focusStep}
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
                    <h1 style={{ whiteSpace: "pre-line" }}>{t("onboarding.folderHero")}</h1>
                    <p>{t("onboarding.folderDesc")}</p>
                    <div className="onboarding__folder-actions">
                      <button className="onboarding__next" disabled={importing} onClick={() => void addFolder()} type="button"><FolderSimplePlus size={22} />{t(importing ? "onboarding.scanning" : "onboarding.chooseFolder")}</button>
                      <button className="onboarding__auto" disabled={importing} aria-pressed={libraryChoice && !folder} onClick={() => { setLibraryChoice(true); setImportMessage(t("onboarding.autoReady", { count: gameCount })); }} type="button">{t("onboarding.useStores")}</button>
                    </div>
                    {folder ? <p className="onboarding__folder-path">{folder}</p> : null}
                    {importMessage ? <p className="onboarding__import-status" role="status">{importMessage}</p> : null}
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
                    <div className="onboarding__icon"><GameController size={38} weight="light" /></div>
                    <span className="onboarding__eyebrow">{t("onboarding.control")}</span>
                    <h1 style={{ whiteSpace: "pre-line" }}>{t("onboarding.controlHero")}</h1>
                    <p>{t("onboarding.controlDesc")}</p>
                    {notifications.desktop?.activateSteamNotifications&&<button className="onboarding-notification-choice" type="button" role="checkbox" aria-checked={notifyChoice} onClick={()=>setNotifyChoice(value=>!value)}><Trophy size={27} weight="duotone"/><span><strong>{notifyCopy.onboarding}</strong><small>{notifications.busy?notifyCopy.downloading+' '+(notifications.status?.progress||0)+'%':notifyCopy.onboardingHint}</small></span><i>{notifyChoice&&<Check size={17} weight="bold"/>}</i></button>}
                    <div className="control-demo" aria-hidden="true"><kbd>↑</kbd><span><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><i /><kbd className="control-demo__confirm">A</kbd></div>
                  </>
                ) : null}
              </motion.div>
            </AnimatePresence>

            <footer className="onboarding__footer">
              <div className="onboarding__progress" aria-label={t("onboarding.step", { current: step + 1, total: steps.length })}>{steps.map((item, index) => <span data-active={index <= step} key={item} />)}</div>
              <button className="onboarding__next" disabled={importing || (step === 0 && !libraryChoice)} onClick={next} type="button"><span>{step === steps.length - 1 ? t("onboarding.enter") : t("onboarding.continue")}</span><Sparkle size={18} weight="fill" /></button>
            </footer>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
