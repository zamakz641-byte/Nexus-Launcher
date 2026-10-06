export class NotificationOverlayModule {
  id = 'notification-overlay';
  constructor(overlay) { this.overlay = overlay; }
  start({on}) { on('AchievementUnlocked', notice => this.overlay().show(notice)); }
  stop() { this.overlay().dispose(); }
}
