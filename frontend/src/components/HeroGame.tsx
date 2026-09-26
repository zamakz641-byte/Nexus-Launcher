import { CalendarBlank, CheckCircle, DotsThree, HardDrive, Monitor, Tag } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "motion/react";
import type { Game, Locale } from "../types";
import { NexusButton } from "./NexusButton";
import { premiumEase } from "../motion/transitions";

interface HeroGameProps { game: Game; locale: Locale; onLaunch: () => void; onMore: () => void; }

export function HeroGame({ game, locale, onLaunch, onMore }: HeroGameProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => setLogoFailed(false), [game.logoArtwork]);
  const titleSize = game.title.length > 28 ? "long" : game.title.length > 18 ? "medium" : "short";
  const description = game.discovered && game.description[locale].includes(game.libraryPath ?? "__none__")
    ? t(game.installed ? "home.localReady" : "home.localConfigure")
    : game.description[locale];
  const releaseYear = game.releaseDate.match(/\b(?:19|20)\d{2}\b/)?.[0];
  return (
    <section className="hero-game" aria-labelledby="selected-game-title" data-title-size={titleSize}>
      <div className="hero-game__copy">
        {game.logoArtwork && !logoFailed ? <><motion.img className="hero-game__logo" src={game.logoArtwork} alt="" onError={() => setLogoFailed(true)} initial={reducedMotion ? false : { opacity: 0, y: 7, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .34, ease: premiumEase }} /><h1 className="sr-only" id="selected-game-title">{game.title}</h1></> : <motion.h1 id="selected-game-title" initial={reducedMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .34, ease: premiumEase }}>{game.title}</motion.h1>}
        <motion.p className="hero-game__description" initial={reducedMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3, delay: reducedMotion ? 0 : .05, ease: premiumEase }}>{description}</motion.p>
        <motion.div className="hero-game__metadata" aria-label={t("home.metadata")} initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .27, delay: reducedMotion ? 0 : .09, ease: premiumEase }}>
          <span><Tag aria-hidden="true" size={16} />{game.genre[locale]}</span>
          <span title={game.developer}><HardDrive aria-hidden="true" size={16} />{game.source}</span>
          <span><Monitor aria-hidden="true" size={16} />PC</span>
          {releaseYear ? <span><CalendarBlank aria-hidden="true" size={16} />{releaseYear}</span> : null}
          <span className="hero-game__ready"><CheckCircle aria-hidden="true" size={16} weight="fill" />{t(game.installed ? "status.ready" : "status.configure")}</span>
        </motion.div>
      </div>
      <motion.div className="hero-game__actions" data-focus-group="actions" initial={reducedMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .27, delay: reducedMotion ? 0 : .15, ease: premiumEase }}>
        <NexusButton data-sfx={game.installed ? "launch" : undefined} onClick={game.installed ? onLaunch : onMore} icon={<kbd className="controller-key controller-key--dark">A</kbd>}>
          {game.installed ? t("action.play") : t("action.configure")}
        </NexusButton>
        <NexusButton variant="ghost" onClick={onMore} aria-label={t("action.more")}><DotsThree aria-hidden="true" size={27} weight="bold" /></NexusButton>
      </motion.div>
    </section>
  );
}
