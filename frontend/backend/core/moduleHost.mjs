export const NEXUS_EVENTS = Object.freeze([
  'GameStarted', 'GameStopped', 'AchievementUnlocked', 'ActivityChanged',
  'ControllerConnected', 'ScreenshotRequested', 'GameSuspended', 'GameResumed',
]);

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

// Backend-only: the renderer cannot publish events or load executable modules.
export class EventBus {
  listeners = new Map();
  subscribe(event, listener) {
    if (!NEXUS_EVENTS.includes(event) || typeof listener !== 'function') throw Error('invalid-event');
    const listeners = this.listeners.get(event) || new Set();
    listeners.add(listener); this.listeners.set(event, listeners);
    return () => { listeners.delete(listener); if (!listeners.size) this.listeners.delete(event); };
  }
  async publish(event, payload) {
    if (!NEXUS_EVENTS.includes(event)) throw Error('invalid-event');
    const snapshot = freeze(structuredClone(payload));
    // Enqueue synchronously so shutdown sees all events already published.
    return Promise.allSettled([...this.listeners.get(event) || []].map(listener => {
      try { return Promise.resolve(listener(snapshot)); } catch (error) { return Promise.reject(error); }
    }));
  }
}

export class ModuleHost {
  constructor(bus) { this.bus = bus; this.modules = new Map(); }
  async register(module) {
    if (!/^[a-z][a-z-]{1,40}$/.test(module.id) || this.modules.has(module.id)) throw Error('invalid-module');
    const entry = { id: module.id, state: 'starting', subscriptions: [], queue: Promise.resolve(), module };
    this.modules.set(module.id, entry);
    const on = (event, handler) => {
      entry.subscriptions.push(this.bus.subscribe(event, payload => {
        const task = entry.queue.then(() => handler(payload));
        entry.queue = task.catch(() => { entry.state = 'degraded'; });
        return task;
      }));
    };
    try { await module.start({ on, publish: (event, payload) => this.bus.publish(event, payload) }); entry.state = 'ready'; }
    catch { entry.state = 'failed'; entry.subscriptions.forEach(remove => remove()); }
  }
  status() { return [...this.modules.values()].map(({id,state}) => ({id,state})); }
  async dispose() {
    for (const entry of [...this.modules.values()].reverse()) {
      entry.subscriptions.forEach(remove => remove());
      await entry.queue;
      try { await entry.module.stop?.(); } catch { /* Shutdown must reach other modules. */ }
      entry.state = 'stopped';
    }
  }
}
