import { ReplayPluginCard } from '../components/ReplayPluginCard';
import { SavesPluginCard } from '../components/SavesPluginCard';
import { captureCopy } from '../captureCopy';
import { useNexusStore } from '../state/useNexusStore';
export function DownloadsScreen(){const locale=useNexusStore(state=>state.locale),copy=captureCopy[locale==='fr'?'fr':'en'];return <section className="screen downloads-screen nexus-plugins-screen"><header className="screen-heading"><div><span className="screen-kicker">NEXUS</span><h1>{copy.plugins}</h1><p>{copy.pluginSubtitle}</p></div></header><ReplayPluginCard/><SavesPluginCard/></section>;}
