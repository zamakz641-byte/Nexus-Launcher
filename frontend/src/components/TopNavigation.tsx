import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CaretDown, DownloadSimple, GameController, GearSix, House, MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useNexusStore } from "../state/useNexusStore";
import type { Locale, ThemeId } from "../types";
import { motion } from "motion/react";
import { NexusLogo } from "./NexusLogo";

const routes = [
  { id: "home", path: "/", icon: House },
  { id: "library", path: "/library", icon: GameController },
  { id: "search", path: "/search", icon: MagnifyingGlass },
  { id: "settings", path: "/settings", icon: GearSix },
  { id: "downloads", path: "/downloads", icon: DownloadSimple },
] as const;

export function TopNavigation() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const locale = useNexusStore((state) => state.locale);
  const theme = useNexusStore((state) => state.theme);
  const setLocale = useNexusStore((state) => state.setLocale);
  const setTheme = useNexusStore((state) => state.setTheme);
  const systemInfo = useNexusStore((state) => state.systemInfo);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const profileName = systemInfo?.profileName || t("system.player");
  const initials = useMemo(() => profileName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), [profileName]);

  const updateLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    void i18n.changeLanguage(nextLocale);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = i18n.dir(nextLocale);
  };

  return (
    <header className="top-navigation" data-focus-group="navigation">
      <div className="top-navigation__primary">
        <NavLink className="top-navigation__brand" to="/" aria-label={`Nexus — ${t("nav.home")}`}><NexusLogo compact /></NavLink>
        <nav className="top-navigation__routes" aria-label={t("hints.navigate")}>
          {routes.map((route) => {
            const active = location.pathname === route.path || (route.id === "library" && location.pathname.startsWith("/game/"));
            return <NavLink aria-current={active ? "page" : undefined} className="top-navigation__route" data-active={active} key={route.id} to={route.path}>
              {active ? <motion.i className="top-navigation__route-indicator" layoutId="active-primary-route" transition={{ type: "spring", stiffness: 430, damping: 38 }} /> : null}
              <motion.b className="top-navigation__route-icon" animate={{ x: active ? 1 : 0, scale: active ? 1.06 : 1 }} transition={{ duration: .22 }}><route.icon aria-hidden="true" size={25} weight={active ? "fill" : "regular"} /></motion.b>
              <span>{t(`nav.${route.id}`)}</span>
            </NavLink>;
          })}
        </nav>
      </div>

      <div className="top-navigation__system">
        <time className="top-navigation__clock" dateTime={now.toISOString()}>{new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(now)}</time>
        <span className="top-navigation__divider" aria-hidden="true" />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="system-trigger" aria-label={t("system.language")}>
            {locale.toUpperCase()} <CaretDown aria-hidden="true" size={14} weight="bold" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="nexus-menu" sideOffset={12} align="end">
              <DropdownMenu.Label className="nexus-menu__label">{t("system.language")}</DropdownMenu.Label>
              <DropdownMenu.RadioGroup value={locale} onValueChange={(value) => updateLocale(value as Locale)}>
                <DropdownMenu.RadioItem className="nexus-menu__item" value="fr">Français</DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem className="nexus-menu__item" value="en">English</DropdownMenu.RadioItem>
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <span className="top-navigation__divider" aria-hidden="true" />
        <button className="profile-button" type="button" aria-label={`${t("system.profile")} — ${profileName}`}>
          <span className="profile-button__avatar" aria-hidden="true">{initials}</span>
          <span>{profileName}</span><span className="profile-button__presence" aria-label={t("system.online")} />
        </button>
        <span className="top-navigation__divider" aria-hidden="true" />
        <button className="icon-button" type="button" aria-label={t("system.settings")} onClick={() => navigate("/settings")}>
          <GearSix aria-hidden="true" size={26} />
        </button>
        <span className="top-navigation__divider" aria-hidden="true" />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="theme-trigger" aria-label={t("system.theme")}>
            <span className="theme-trigger__swatch" aria-hidden="true" /><span>{t(`system.${theme}`)}</span>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="nexus-menu" sideOffset={12} align="end">
              <DropdownMenu.Label className="nexus-menu__label">{t("system.theme")}</DropdownMenu.Label>
              <DropdownMenu.RadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemeId)}>
                <DropdownMenu.RadioItem className="nexus-menu__item" value="obsidienne">{t("system.obsidienne")}</DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem className="nexus-menu__item" value="solaris">{t("system.solaris")}</DropdownMenu.RadioItem>
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
