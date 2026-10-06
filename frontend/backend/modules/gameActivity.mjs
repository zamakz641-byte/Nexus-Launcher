import {readFile,mkdir,writeFile,rename,stat} from 'node:fs/promises';
import {join} from 'node:path';

export class GameActivity {
  id = 'game-activity';
  constructor(dir, {recordPlaytime = async () => {}} = {}) {
    this.file = join(dir,'game-activity.json'); this.recordPlaytime = recordPlaytime;
    this.sessions = []; this.writes = Promise.resolve();
  }
  async load() {
    if (this.loaded) return this.loaded;
    return this.loaded = (async () => {
      try {
        const info = await stat(this.file); if (info.size > 4*1024*1024) throw Error('oversized-history');
        const data = JSON.parse(await readFile(this.file,'utf8'));
        this.sessions = (Array.isArray(data.sessions) ? data.sessions : []).filter(s =>
          typeof s.sessionId === 'string' && typeof s.gameId === 'string' &&
          typeof s.title === 'string' && Number.isFinite(Date.parse(s.startedAt)) &&
          ['running','completed','interrupted'].includes(s.state) &&
          (s.durationSeconds === null || Number.isFinite(s.durationSeconds) && s.durationSeconds >= 0)
        ).slice(-2000).map(s => s.state === 'running' ? {...s,state:'interrupted',durationSeconds:null,stoppedAt:null} : s);
      } catch (error) { if (error.code !== 'ENOENT') this.readError = true; }
    })();
  }
  async persist() {
    const snapshot = JSON.stringify({version:1,sessions:this.sessions});
    const task = this.writes.then(async () => {
      // Preserve a corrupt existing journal for recovery; never silently overwrite it.
      if (this.readError) throw Error('activity-history-unreadable');
      await mkdir(join(this.file,'..'),{recursive:true});
      await writeFile(this.file+'.tmp',snapshot,'utf8'); await rename(this.file+'.tmp',this.file);
    });
    this.writes = task.catch(() => {}); return task;
  }
  async start({on,publish}) {
    await this.load();
    on('GameStarted', async event => {
      if (this.sessions.some(s => s.sessionId === event.sessionId)) return;
      this.sessions.push({sessionId:event.sessionId,gameId:event.gameId,title:event.title,
        startedAt:event.startedAt,stoppedAt:null,durationSeconds:null,state:'running'});
      if (this.sessions.length > 2000) { const old = this.sessions.findIndex(s => s.state !== 'running'); if (old >= 0) this.sessions.splice(old,1); }
      await this.persist(); void publish('ActivityChanged',{gameId:event.gameId});
    });
    on('GameStopped', async event => {
      const session = this.sessions.find(s => s.sessionId === event.sessionId);
      if (!session || session.state !== 'running') return;
      if (!Number.isFinite(event.durationSeconds) || event.durationSeconds < 0) throw Error('invalid-duration');
      Object.assign(session,{state:'completed',durationSeconds:Math.floor(event.durationSeconds),stoppedAt:event.stoppedAt});
      await this.persist(); await this.recordPlaytime(session.gameId,session.durationSeconds);
      void publish('ActivityChanged',{gameId:session.gameId});
    });
  }
  async history(gameId) {
    if (typeof gameId !== 'string' || !gameId || gameId.length > 240) throw Error('invalid-game');
    await this.load(); await this.writes;
    return {source:'Nexus',state:this.readError?'unavailable':'ready',
      sessions:this.sessions.filter(s => s.gameId === gameId).slice(-10).reverse().map(s => ({...s}))};
  }
  async stop() { await this.writes; }
}
