import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { ControllerHints } from "../components/ControllerHints";
import { GameRail } from "../components/GameRail";
import { HeroGame } from "../components/HeroGame";
import { useLibraryGames } from "../hooks/useLibraryGames";
import { useNexusStore } from "../state/useNexusStore";
import { getGameAccent } from "../theme/gameAccents";
import { premiumEase } from "../motion/transitions";
import type { Game } from "../types";

interface HomeScreenProps { selectedGame: Game; onLaunch: () => void; }

export function HomeScreen({ selectedGame, onLaunch }: HomeScreenProps) {
  const navigate = useNavigate();
  const games = useLibraryGames();
  const locale = useNexusStore((state) => state.locale);
  const setSelectedGame = useNexusStore((state) => state.setSelectedGame);
  return (
    <section className="home-screen" style={{ "--game-accent": getGameAccent(selectedGame.id) } as CSSProperties}>
      <div className="home-atmosphere" aria-hidden="true" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div animate={{ opacity: 1, x: 0, scale: 1 }} className="hero-transition" exit={{ opacity: 0, x: -16, scale: .996 }} initial={{ opacity: 0, x: 22, scale: .988 }} key={selectedGame.id} transition={{ duration: .31, ease: premiumEase }}>
          <HeroGame game={selectedGame} locale={locale} onLaunch={onLaunch} onMore={() => navigate(`/game/${selectedGame.id}`)} />
        </motion.div>
      </AnimatePresence>
      <GameRail games={games} selectedId={selectedGame.id} onSelect={setSelectedGame} />
      <ControllerHints />
    </section>
  );
}
