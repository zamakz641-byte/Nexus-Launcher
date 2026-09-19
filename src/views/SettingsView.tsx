import React, { useEffect, useState } from 'react';
import type { AccentTheme, LauncherSettings, SoundPackManifest } from '../types/game';
import { nativeApi } from '../services/native';
import { configureSoundPack, loadSoundPackRegistry, playSfx, type SfxType } from '../services/sound';
import {
  Database,
  FolderOpen,
  Gauge,
  Gamepad2,
  KeyRound,
  Monitor,
  Palette,
  Play,
  Power,
  RotateCcw,
  Sparkles,
  User,
  Volume2,
} from '../components/UiIcon';

interface SettingsViewProps {
  settings: LauncherSettings;
  onUpdateSettings: (partial: Partial<LauncherSettings>) => void;
  onResetDefaults: () => void;
  onQuit: () => void;
}

type Tab = 'interface' | 'audio' | 'launch' | 'media' | 'performance' | 'profile';

const ACCENT_THEMES: { id: AccentTheme; name: string; hex: string }[] = [
  { id: 'gold', name: 'Or Nexus', hex: '#f7cb58' },
  { id: 'cyan', name: 'Cyan', hex: '#38bdf8' },
  { id: 'crimson', name: 'Crimson', hex: '#ef4444' },
  { id: 'emerald', name: 'Émeraude', hex: '#10b981' },
  { id: 'purple', name: 'Violet', hex: '#c084fc' },
];

const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
  <button type="button" onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full border transition ${checked ? 'border-sky-300/30 bg-sky-400/25' : 'border-white/[0.09] bg-black/35'}`}>
    <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[23px]' : 'left-[3px]'}`} />
  </button>
);

const SettingRow: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <div className="flex items-center justify-between gap-8 py-3.5 first:pt-0 last:pb-0">
    <div className="min-w-0"><div className="text-[11.5px] font-bold text-slate-100">{title}</div><div className="mt-1 max-w-xl text-[9.5px] leading-4 text-slate-500">{description}</div></div>
    <div className="shrink-0">{children}</div>
  </div>
);

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings, onResetDefaults, onQuit }) => {
  const [activeTab, setActiveTab] = useState<Tab>('interface');
  const [showKeys, setShowKeys] = useState(false);
  const [dataMessage, setDataMessage] = useState('');
  const [soundPacks, setSoundPacks] = useState<SoundPackManifest[]>([]);
  const [soundPackMessage, setSoundPackMessage] = useState('');
  const previewSound = (type: SfxType) => playSfx(type, true, settings.sfxVolume);

  const refreshSoundPacks = async () => {
    try {
      const api = await nativeApi();
      const packs = await api.list_sound_packs();
      setSoundPacks(packs || []);
      await loadSoundPackRegistry(true);
    } catch {
      setSoundPacks(await loadSoundPackRegistry(true));
    }
  };

  useEffect(() => { void refreshSoundPacks(); }, []);

  const chooseSoundPack = async (packId: string) => {
    await configureSoundPack(packId);
    onUpdateSettings({ sfxPack: packId });
    setSoundPackMessage('Pack audio actif.');
    window.setTimeout(() => playSfx('confirm', true, settings.sfxVolume), 80);
  };

  const importSoundPack = async () => {
    setSoundPackMessage('');
    try {
      const api = await nativeApi();
      const path = await api.choose_sound_pack();
      if (!path) return;
      const result = await api.install_sound_pack(path);
      if (!result.ok || !result.pack) throw new Error(result.error || 'Installation impossible.');
      setSoundPacks(result.packs || []);
      await loadSoundPackRegistry(true);
      await chooseSoundPack(result.pack.id);
      setSoundPackMessage(`${result.pack.name} installé. Tous les sons requis sont présents.`);
    } catch (error) {
      setSoundPackMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const revealExtensions = async () => {
    try { const api = await nativeApi(); await api.reveal_extensions_folder(); }
    catch (error) { setSoundPackMessage(error instanceof Error ? error.message : String(error)); }
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'interface', label: 'Interface', icon: Monitor },
    { id: 'audio', label: 'Audio & SFX', icon: Volume2 },
    { id: 'launch', label: 'Lancement', icon: Sparkles },
    { id: 'media', label: 'Médias & API', icon: Database },
    { id: 'performance', label: 'Performances', icon: Gauge },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  const revealData = async () => {
    try { const api = await nativeApi(); await api.reveal_data_folder(); setDataMessage('Dossier ouvert.'); }
    catch (error) { setDataMessage(error instanceof Error ? error.message : String(error)); }
  };

  return (
    <div id="nexus-settings-view" data-controller-scope="true" className="relative min-h-full px-8 pt-24 pb-20 select-none nexus-view-surface">
      <div className="mb-6"><div className="mb-1 text-[8.5px] font-extrabold uppercase tracking-[.28em] text-slate-400">Configuration Nexus</div><h1 className="text-3xl font-black tracking-tight text-white">Paramètres</h1><p className="mt-1 text-[11px] text-slate-400">Tout ce qui touche aux médias, au comportement console et à l’impact en jeu.</p></div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="nexus-glass-card h-fit space-y-1 p-2">
          {tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} data-controller-default={activeTab === tab.id ? 'true' : undefined} onClick={() => setActiveTab(tab.id)} className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[10.5px] font-bold transition ${activeTab === tab.id ? 'border-sky-400/20 bg-sky-400/[0.1] text-sky-100 shadow-[0_8px_25px_rgba(0,0,0,.22)]' : 'border-transparent text-slate-500 hover:bg-white/[0.035] hover:text-white'}`}><Icon className="h-4 w-4"/><span>{tab.label}</span></button>; })}
        </div>

        <div className="space-y-4 lg:col-span-3">
          {activeTab === 'interface' && <>
            <div className="nexus-glass-card divide-y divide-white/[0.055] p-5"><SettingRow title="Langue de l’interface" description="Français, English ou Español. Les noms officiels des jeux ne sont jamais traduits."><select value={settings.language} onChange={(e) => onUpdateSettings({ language: e.target.value as LauncherSettings['language'] })} className="rounded-xl border border-white/[0.08] bg-[#07111b] px-3 py-2 text-[9px] font-bold text-slate-200 outline-none"><option value="fr">Français</option><option value="en">English</option><option value="es">Español</option></select></SettingRow><SettingRow title="Langue des métadonnées" description="Langue demandée à Steam pour descriptions, genres, succès et trailers lorsqu’elle est disponible."><select value={settings.metadataLanguage} onChange={(e) => onUpdateSettings({ metadataLanguage: e.target.value as LauncherSettings['metadataLanguage'] })} className="rounded-xl border border-white/[0.08] bg-[#07111b] px-3 py-2 text-[9px] font-bold text-slate-200 outline-none"><option value="fr">Français</option><option value="en">English</option><option value="es">Español</option></select></SettingRow></div>
            <div className="nexus-glass-card p-5"><div className="mb-4 flex items-center gap-2"><Palette className="h-4 w-4 text-amber-300"/><h3 className="text-sm font-bold text-white">Accent global</h3></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{ACCENT_THEMES.map((theme) => <button key={theme.id} onClick={() => onUpdateSettings({ accentTheme: theme.id })} className={`flex items-center gap-2 rounded-xl border p-3 transition ${settings.accentTheme === theme.id ? 'border-white/20 bg-white/[0.08]' : 'border-white/[0.05] bg-black/20 hover:border-white/15'}`}><span className="h-4 w-4 rounded-full shadow" style={{ backgroundColor: theme.hex }}/><span className="text-[9px] font-semibold text-slate-300">{theme.name}</span></button>)}</div></div>
            <div className="nexus-glass-card divide-y divide-white/[0.055] p-5"><SettingRow title="Indications manette" description="Affiche les raccourcis console dans le footer."><Toggle checked={settings.controllerHints} onChange={(value) => onUpdateSettings({ controllerHints: value })}/></SettingRow><SettingRow title="Horloge" description="Date et heure locales dans la barre supérieure."><Toggle checked={settings.showClock} onChange={(value) => onUpdateSettings({ showClock: value })}/></SettingRow><SettingRow title="Mouvement ambiant" description="Parallax et respiration très légère des Hero lorsque Nexus est visible."><Toggle checked={settings.ambientMotion} onChange={(value) => onUpdateSettings({ ambientMotion: value })}/></SettingRow></div>
          </>}

          {activeTab === 'audio' && <div className="space-y-4">
            <div className="nexus-glass-card p-5">
              <SettingRow title="Sons d’interface" description="Nexus joue des fichiers audio pré-rendus. Aucun son n’est synthétisé par du code pendant la navigation."><Toggle checked={settings.sfxEnabled} onChange={(value) => onUpdateSettings({ sfxEnabled: value })}/></SettingRow>
              <div className="mt-4 border-t border-white/[0.055] pt-4"><div className="mb-2 flex justify-between text-[10px] font-bold text-slate-300"><span>Volume interface</span><span>{Math.round(settings.sfxVolume * 100)}%</span></div><input type="range" min="0" max="1" step="0.02" value={settings.sfxVolume} onChange={(e) => onUpdateSettings({ sfxVolume: Number(e.target.value) })} className="w-full accent-sky-400"/></div>
              <div className="mt-5"><div className="mb-2 text-[8px] font-black uppercase tracking-[.2em] text-slate-500">Préécoute</div><div data-controller-row="true" className="flex flex-wrap gap-2">{([['focus','Focus'],['confirm','Valider'],['back','Retour'],['startup','Startup'],['launch','Lancement'],['success','Succès']] as [SfxType,string][]).map(([id,label]) => <button key={id} onClick={() => previewSound(id)} className="flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-[9px] font-semibold text-slate-300 hover:bg-white/[0.07] hover:text-white"><Play className="h-3 w-3"/>{label}</button>)}</div></div>
            </div>

            <div className="nexus-glass-card p-5">
              <div className="mb-4 flex items-start justify-between gap-4"><div><div className="text-[8px] font-black uppercase tracking-[.24em] text-sky-300/70">Extensions audio</div><h3 className="mt-1 text-sm font-bold text-white">Sound Packs Nexus</h3><p className="mt-1 max-w-2xl text-[9px] leading-4 text-slate-500">Un pack .nxsfx doit fournir focus, validation, retour, lancement, succès, toggle, hover, wake, sleep et startup. Nexus refuse automatiquement les packs incomplets.</p></div><div data-controller-row="true" className="flex shrink-0 gap-2"><button onClick={() => void importSoundPack()} className="rounded-xl border border-sky-300/15 bg-sky-400/[.07] px-3 py-2 text-[9px] font-bold text-sky-100">Importer .nxsfx</button><button onClick={() => void revealExtensions()} className="rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-2 text-[9px] font-bold text-slate-300"><FolderOpen className="mr-1.5 inline h-3.5 w-3.5"/>Dossier</button></div></div>
              <div className="grid gap-2 md:grid-cols-2">{soundPacks.map((pack) => <button key={pack.id} onClick={() => void chooseSoundPack(pack.id)} className={`rounded-2xl border p-4 text-left transition ${settings.sfxPack === pack.id ? 'border-sky-300/30 bg-sky-400/[.09] shadow-[0_10px_34px_rgba(0,0,0,.2)]' : 'border-white/[.06] bg-black/20 hover:border-white/[.14]'}`}><div className="flex items-center justify-between gap-3"><div className="text-[10.5px] font-black text-white">{pack.name}</div><span className={`rounded-full px-2 py-1 text-[7px] font-black uppercase tracking-wider ${pack.builtin ? 'bg-emerald-400/[.08] text-emerald-300' : 'bg-purple-400/[.09] text-purple-300'}`}>{pack.builtin ? 'Intégré' : 'Extension'}</span></div><div className="mt-1 text-[8.5px] text-slate-500">{pack.author} · {pack.version} · {pack.license}</div><div className="mt-2 text-[8.5px] leading-4 text-slate-400">{pack.description || 'Pack audio Nexus complet.'}</div></button>)}</div>
              {soundPackMessage && <div className="mt-3 text-[8.5px] text-sky-300">{soundPackMessage}</div>}
              <div className="mt-4 rounded-xl border border-amber-300/10 bg-amber-300/[.035] p-3 text-[8px] leading-4 text-amber-100/60">Les packs propriétaires PlayStation, Xbox ou Nintendo ne sont pas distribués avec Nexus. L’extension locale permet d’utiliser un pack que tu possèdes légalement, tandis que le catalogue GitHub Nexus ne contiendra que des sons redistribuables.</div>
            </div>
          </div>}

          {activeTab === 'launch' && <div className="nexus-glass-card divide-y divide-white/[0.055] p-5"><SettingRow title="Animation de démarrage Nexus" description="Signature visuelle et sonore courte au vrai démarrage du launcher. Elle ne se rejoue pas au retour d’un jeu."><Toggle checked={settings.startupAnimation} onChange={(value) => onUpdateSettings({ startupAnimation: value })}/></SettingRow><SettingRow title="Séquence Nexus plein écran" description="Voile cinématique, glyph Nexus, logo du jeu, bloom et transition avant le vrai démarrage."><Toggle checked={settings.launchAnimation} onChange={(value) => onUpdateSettings({ launchAnimation: value })}/></SettingRow><SettingRow title="Délai cinématique" description="Durée avant l’appel au processus. Ce n’est pas une fausse barre de chargement."><select value={settings.launchDelayMs} onChange={(e) => onUpdateSettings({ launchDelayMs: Number(e.target.value) })} className="rounded-xl border border-white/[0.08] bg-[#07111b] px-3 py-2 text-[9px] font-bold text-slate-200 outline-none"><option value={1700}>Rapide · 1,7 s</option><option value={2450}>Cinématique · 2,45 s</option><option value={3200}>Lent · 3,2 s</option></select></SettingRow><SettingRow title="Réouvrir Nexus après le jeu" description="Restaure la fenêtre quand le processus surveillé se ferme."><Toggle checked={settings.reopenAfterGame} onChange={(value) => onUpdateSettings({ reopenAfterGame: value })}/></SettingRow><SettingRow title="Démarrer en plein écran" description="Nexus ouvre directement son interface console."><Toggle checked={settings.startFullscreen} onChange={(value) => onUpdateSettings({ startFullscreen: value })}/></SettingRow></div>}

          {activeTab === 'media' && <>
            <div className="nexus-glass-card p-5"><div className="mb-4 flex items-center gap-2"><KeyRound className="h-4 w-4 text-sky-300"/><div><h3 className="text-sm font-bold text-white">APIs réelles</h3><p className="mt-0.5 text-[9px] text-slate-500">Les clés restent dans le profil Windows local de Nexus.</p></div><button onClick={() => setShowKeys((value) => !value)} className="ml-auto rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[8px] font-bold text-slate-400 hover:text-white">{showKeys ? 'Masquer' : 'Afficher'}</button></div>
              <div className="space-y-3"><label className="block"><span className="mb-1 block text-[9px] font-bold text-slate-400">SteamGridDB API Key</span><input type={showKeys ? 'text' : 'password'} value={settings.steamGridDbApiKey} onChange={(e) => onUpdateSettings({ steamGridDbApiKey: e.target.value.trim() })} placeholder="Bearer key SteamGridDB" className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 font-mono text-[10px] text-slate-200 outline-none focus:border-sky-400/35"/></label><div className="mt-4 rounded-xl border border-white/[0.055] bg-black/20 p-3"><div className="mb-2 text-[8px] font-black uppercase tracking-[.2em] text-slate-500">Optionnel · métadonnées supplémentaires</div><div className="grid gap-3 md:grid-cols-2"><label className="block"><span className="mb-1 block text-[9px] font-bold text-slate-400">IGDB / Twitch Client ID</span><input type={showKeys ? 'text' : 'password'} value={settings.igdbClientId} onChange={(e) => onUpdateSettings({ igdbClientId: e.target.value.trim() })} placeholder="Client ID IGDB" className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 font-mono text-[10px] text-slate-200 outline-none focus:border-sky-400/35"/></label><label className="block"><span className="mb-1 block text-[9px] font-bold text-slate-400">IGDB / Twitch Client Secret</span><input type={showKeys ? 'text' : 'password'} value={settings.igdbClientSecret} onChange={(e) => onUpdateSettings({ igdbClientSecret: e.target.value.trim() })} placeholder="Client Secret IGDB" className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 font-mono text-[10px] text-slate-200 outline-none focus:border-sky-400/35"/></label></div><p className="mt-2 text-[8px] leading-4 text-slate-600">Tu peux laisser ces deux champs vides. Nexus fonctionne avec SteamGridDB + Steam Store sans créer d’application Twitch. IGDB ne sert que de secours pour certains jeux non-Steam.</p></div><label className="mt-3 block"><span className="mb-1 block text-[9px] font-bold text-slate-400">Steam Web API Key</span><input type={showKeys ? 'text' : 'password'} value={settings.steamWebApiKey} onChange={(e) => onUpdateSettings({ steamWebApiKey: e.target.value.trim() })} placeholder="Clé Steam Web API" className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 font-mono text-[10px] text-slate-200 outline-none focus:border-sky-400/35"/></label><label className="block"><span className="mb-1 block text-[9px] font-bold text-slate-400">SteamID64</span><input type="text" value={settings.steamId64} onChange={(e) => onUpdateSettings({ steamId64: e.target.value.replace(/\D/g,'') })} placeholder="7656119…" className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 font-mono text-[10px] text-slate-200 outline-none focus:border-sky-400/35"/></label></div>
            </div>
            <div className="nexus-glass-card divide-y divide-white/[0.055] p-5"><SettingRow title="Télécharger les trailers" description="Met en cache local le meilleur trailer direct disponible. Si aucun MP4 n’existe, Nexus utilise le trailer IGDB/YouTube en streaming dans la fiche du jeu."><Toggle checked={settings.autoDownloadTrailer} onChange={(value) => onUpdateSettings({ autoDownloadTrailer: value })}/></SettingRow><SettingRow title="Télécharger les screenshots" description="Met en cache jusqu’à six captures Steam pour la fiche détaillée."><Toggle checked={settings.autoDownloadScreenshots} onChange={(value) => onUpdateSettings({ autoDownloadScreenshots: value })}/></SettingRow></div>
          </>}

          {activeTab === 'performance' && <div className="nexus-glass-card divide-y divide-white/[0.055] p-5"><SettingRow title="Mode faible impact" description="Nexus se met en veille, WebView2 passe en priorité Idle et le suivi du jeu utilise des attentes bloquantes plutôt qu’une boucle gourmande."><Toggle checked={settings.lowImpactMode} onChange={(value) => onUpdateSettings({ lowImpactMode: value })}/></SettingRow><SettingRow title="Masquer Nexus pendant le jeu" description="Le WebView est caché après le lancement afin d’éviter animations et rendu inutiles en arrière-plan."><Toggle checked={settings.hideDuringGame} onChange={(value) => onUpdateSettings({ hideDuringGame: value })}/></SettingRow><SettingRow title="Scanner Steam automatiquement" description="Autorise Nexus à proposer les installations Steam détectées lors de l’ajout d’un jeu."><Toggle checked={settings.autoScanSteam} onChange={(value) => onUpdateSettings({ autoScanSteam: value })}/></SettingRow></div>}

          {activeTab === 'profile' && <div className="nexus-glass-card p-5 space-y-4"><label className="block"><span className="mb-1 block text-[9px] font-bold text-slate-400">Pseudo</span><input value={settings.username} onChange={(e) => onUpdateSettings({ username: e.target.value })} className="w-full max-w-md rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 text-[10px] text-white outline-none"/></label><label className="block"><span className="mb-1 block text-[9px] font-bold text-slate-400">Statut</span><input value={settings.statusText} onChange={(e) => onUpdateSettings({ statusText: e.target.value })} className="w-full max-w-md rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 text-[10px] text-white outline-none"/></label><label className="block"><span className="mb-1 block text-[9px] font-bold text-slate-400">Avatar · URL facultative</span><input value={settings.avatarUrl} onChange={(e) => onUpdateSettings({ avatarUrl: e.target.value })} className="w-full max-w-md rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 text-[10px] text-white outline-none"/></label></div>}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-black/25 p-4"><div><div className="text-[10.5px] font-bold text-slate-300">Données locales Nexus</div><div className="mt-0.5 text-[8.5px] text-slate-500">Bibliothèque SQLite, cache média, logs et préférences.</div>{dataMessage && <div className="mt-1 text-[8px] text-sky-300">{dataMessage}</div>}</div><div data-controller-row="true" className="flex gap-2"><button onClick={revealData} className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[9px] font-bold text-slate-300 hover:bg-white/[0.08]"><FolderOpen className="h-3.5 w-3.5"/>Ouvrir le dossier</button><button onClick={onQuit} className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[9px] font-bold text-slate-200 hover:bg-white/[0.08]"><Power className="h-3.5 w-3.5"/>Quitter Nexus</button><button onClick={() => window.confirm('Réinitialiser uniquement les réglages Nexus ?') && onResetDefaults()} className="flex items-center gap-1.5 rounded-xl border border-rose-400/20 bg-rose-500/[0.07] px-3 py-2 text-[9px] font-bold text-rose-300 hover:bg-rose-500/[0.12]"><RotateCcw className="h-3.5 w-3.5"/>Réinitialiser</button></div></div>
        </div>
      </div>
    </div>
  );
};
