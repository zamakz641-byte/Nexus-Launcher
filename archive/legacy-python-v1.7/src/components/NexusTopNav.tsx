import React from 'react';
import { NexusMark } from './NexusMark';
import { Search, Settings as GearIcon } from './UiIcon';
import { ViewType } from '../types/game';

const NAV_ITEMS: Array<{ label: string; view: ViewType }> = [
  { label: 'Accueil', view: 'accueil' },
  { label: 'Jeux', view: 'bibliotheque' },
  { label: 'Collections', view: 'collections' },
  { label: 'Découvrir', view: 'succes' },
];

export const NexusTopNav: React.FC<{ activeView: ViewType; onNavigate: (v: ViewType) => void; onSearch: () => void; onSettings: () => void }> = ({ activeView, onNavigate, onSearch, onSettings }) => (
  <header className="nexus-v2-topnav" aria-label="Navigation principale">
    <button className="nexus-v2-brand" onClick={() => onNavigate('accueil')} aria-label="Retour à l’accueil Nexus">
      <NexusMark className="nexus-v2-brand-mark" />
      <span className="nexus-v2-wordmark"><b>NEXUS</b><small>LAUNCHER</small></span>
    </button>
    <nav aria-label="Sections">
      {NAV_ITEMS.map(({ label, view }) => (
        <button key={view} className={activeView === view ? 'active' : ''} aria-current={activeView === view ? 'page' : undefined} onClick={() => onNavigate(view)}>{label}</button>
      ))}
    </nav>
    <div className="nexus-v2-actions">
      <button onClick={onSearch} aria-label="Rechercher un jeu"><Search className="h-5 w-5" /></button>
      <button onClick={onSettings} aria-label="Ouvrir les paramètres"><GearIcon className="h-5 w-5" /></button>
      <span className="nexus-v2-avatar" aria-label="Profil NexusPlayer">N</span>
      <b aria-label="Heure actuelle">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b>
    </div>
  </header>
);
