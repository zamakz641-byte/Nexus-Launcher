// Steam data and notifications are adapters; optional helpers cannot prevent launch.
export class AchievementsModule {
  id = 'achievements';
  constructor({companion,monitor,progress,sessionFor,broadcast}) { Object.assign(this,{companion,monitor,progress,sessionFor,broadcast}); }
  async prepareLaunch(game) {
    const steam = game?.platform === 'Steam' || game?.steamMetadata?.appId || game?.metadata?.steamAppId;
    if (!steam) return {state:'disabled'};
    try { return await this.companion().ensureStarted(); } catch { return {state:'error'}; }
  }
  start({on}) {
    on('GameStarted', event => {
      const session = this.sessionFor(event.sessionId);
      if (session && event.notificationProvider !== 'san') this.monitor().start(event.game,session,event.locale);
    });
    on('GameStopped', async () => { await this.progress().getLibrary(true); this.broadcast(); });
  }
  stop() { this.monitor().stopAll(); }
}
