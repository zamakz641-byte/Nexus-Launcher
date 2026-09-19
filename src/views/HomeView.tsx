import React from 'react';
import { Game, LauncherSettings, PlaySession, ViewType } from '../types/game';
import { HeroBanner } from '../components/HeroBanner';
import { GameRail } from '../components/GameRail';

interface HomeViewProps {
  games: Game[]; sessions: PlaySession[]; selectedGame: Game | null;
  onSelectGame: (id: string) => void; onLaunchGame: (id: string) => void;
  onOpenDetails: () => void; onToggleFavorite: (id: string) => void;
  onNavigate: (view: ViewType) => void; onAddGame: () => void;
  ambientMotion: boolean; language?: LauncherSettings['language'];
}

export const HomeView: React.FC<HomeViewProps> = ({ games, selectedGame, onSelectGame, onLaunchGame, onOpenDetails, onToggleFavorite, onNavigate, onAddGame, ambientMotion }) => {
  if (!selectedGame) return (
    <div className="nexus-empty-library">
      <img src="/branding/nexus.png" alt="Nexus" />
      <h1>Ton prochain monde commence ici.</h1>
      <p>Ajoute un jeu ou lance la détection automatique pour construire ta bibliothèque.</p>
      <button onClick={onAddGame}>Ajouter un jeu</button>
    </div>
  );

  const featured = games.filter((game) => game.id !== selectedGame.id).slice(0, 3);
  return (
    <div id="nexus-home-view" className="nexus-v2-home relative min-h-full">
      <HeroBanner game={selectedGame} onLaunch={() => onLaunchGame(selectedGame.id)} onOpenDetails={onOpenDetails} onToggleFavorite={() => onToggleFavorite(selectedGame.id)} ambientMotion={ambientMotion} />
      <section className="nexus-v2-continue relative z-30" aria-labelledby="continue-title">
        <div className="nexus-v2-section-head"><h2 id="continue-title">Reprendre</h2><button onClick={() => onNavigate('bibliotheque')}>Voir la bibliothèque</button></div>
        <GameRail games={games} selectedGameId={selectedGame.id} onSelectGame={onSelectGame} onLaunchGame={onLaunchGame} />
      </section>
      <section className="nexus-v2-for-you relative z-30" aria-labelledby="for-you-title">
        <div className="nexus-v2-section-head"><h2 id="for-you-title">Choisis ton prochain monde</h2><span>Sélection Nexus</span></div>
        <div className="nexus-v2-feature-grid">
          {featured.map((game, index) => (
            <button key={game.id} className="nexus-v2-feature" onClick={() => onSelectGame(game.id)}>
              <img src={game.heroImage || game.coverImage || '/art/nexus-aetherfall-hero.png'} alt="" loading="lazy" decoding="async" />
              <div className="nexus-v2-feature-shade" />
              <div className="nexus-v2-feature-copy">
                <small>{index === 0 ? 'NOUVEL HORIZON' : index === 1 ? 'RETOUR CONSEILLÉ' : 'À PLUSIEURS'}</small>
                <strong>{game.title}</strong>
                <span>{game.genres?.join(' · ') || 'Une nouvelle aventure t’attend.'}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
      <div className="h-20" />
    </div>
  );
};
