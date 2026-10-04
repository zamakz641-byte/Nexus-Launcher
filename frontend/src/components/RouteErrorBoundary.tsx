import { Component, type ReactNode } from 'react';

export class RouteErrorBoundary extends Component<{ children: ReactNode; locale: string; onReload: () => void; onHome?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    const fr = this.props.locale.startsWith('fr');
    return <section className="route-error" role="alert">
      <h1>{fr ? 'Cet écran n’a pas pu se charger' : 'This screen could not load'}</h1>
      <p>{fr ? 'Réessayez de charger Nexus. Votre bibliothèque est conservée.' : 'Try reloading Nexus. Your library is preserved.'}</p>
      <div><button className="screen-tool" onClick={this.props.onReload}>{fr ? 'Recharger Nexus' : 'Reload Nexus'}</button>
        {this.props.onHome && <button className="screen-tool" onClick={this.props.onHome}>{fr ? 'Accueil' : 'Home'}</button>}</div>
    </section>;
  }
}
