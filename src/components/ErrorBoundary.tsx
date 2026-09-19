import React from 'react';
import { AlertTriangle, RefreshCw } from './UiIcon';

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Nexus] Renderer crash prevented:', error, info.componentStack);
    // Never leave the user trapped behind the startup screen if React itself
    // fails. Reveal the recovery UI immediately instead of a black frame.
    window.__nexusBootStatus?.('Mode récupération');
    window.__nexusBootForceReveal?.();
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid h-screen w-screen place-items-center bg-[#02070d] px-8 text-white">
        <div className="max-w-xl rounded-3xl border border-rose-400/20 bg-[#0a1119] p-7 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-rose-300/20 bg-rose-400/[.08] text-rose-200"><AlertTriangle className="h-5 w-5"/></div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.28em] text-rose-300/70">Nexus Recovery</div>
              <h1 className="mt-1 text-xl font-black">L’interface a rencontré une erreur</h1>
              <p className="mt-2 text-[10px] leading-5 text-slate-400">Nexus a intercepté le crash au lieu de laisser WebView2 afficher un écran noir.</p>
              <pre className="mt-4 max-h-28 overflow-auto rounded-xl border border-white/[.06] bg-black/30 p-3 text-[8.5px] text-rose-100/80">{this.state.error.message}</pre>
              <button onClick={() => window.location.reload()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[9.5px] font-black text-slate-950"><RefreshCw className="h-3.5 w-3.5"/>Recharger l’interface</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
