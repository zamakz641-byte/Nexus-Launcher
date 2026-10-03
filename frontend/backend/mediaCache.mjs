import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const limit = 12 * 1024 * 1024;
function allowed(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && ['steamstatic.com', 'steamgriddb.com', 'steamusercontent.com'].some(host => url.hostname === host || url.hostname.endsWith('.' + host)); }
  catch { return false; }
}

// Shared by Electron and the development proxy. Failed requests never enter the cache.
export class MediaCache {
  constructor(folder, fetcher = fetch) { this.folder = folder; this.fetcher = fetcher; this.pending = new Map(); this.memory = new Map(); this.pruning = null; }
  async get(url, refresh = false) {
    if (!allowed(url)) throw new Error('Media source not allowed');
    if (this.pending.has(url)) return this.pending.get(url);
    const request = this.load(url, refresh);
    this.pending.set(url, request);
    try { return await request; } finally { this.pending.delete(url); }
  }
  async load(url, refresh) {
    const key = createHash('sha256').update(url).digest('hex');
    const file = join(this.folder, key + '.json');
    let cached = this.memory.get(url);
    if (!cached) {
      try {
        const saved = JSON.parse(await readFile(file, 'utf8'));
        if (saved.contentType?.startsWith('image/') && saved.bytes) {
          const buffer = Buffer.from(saved.bytes, 'base64');
          if (buffer.length && buffer.length <= limit) cached = { buffer, contentType: saved.contentType };
        }
      } catch { /* Missing/corrupt cache is fetched again. */ }
    }
    if (cached && !refresh) return cached;
    let failure;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const remote = await this.fetcher(url, { signal: AbortSignal.timeout(8000) });
        if (!remote.ok || (remote.url && !allowed(remote.url))) throw new Error('Media unavailable');
        const contentType = remote.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) throw new Error('Unsupported media');
        if (Number(remote.headers.get('content-length')) > limit) throw new Error('Media too large');
        const chunks = []; let size = 0;
        for await (const chunk of remote.body) {
          size += chunk.length;
          if (size > limit) { throw new Error('Media too large'); }
          chunks.push(Buffer.from(chunk));
        }
        if (!size) throw new Error('Empty media');
        const result = { buffer: Buffer.concat(chunks), contentType };
        if (this.memory.size >= 32) this.memory.delete(this.memory.keys().next().value);
        this.memory.set(url, result);
        while ([...this.memory.values()].reduce((sum, item) => sum + item.buffer.length, 0) > 32 * 1024 * 1024) this.memory.delete(this.memory.keys().next().value);
        try {
          await mkdir(this.folder, { recursive: true });
          const temporary = file + '.tmp';
          await writeFile(temporary, JSON.stringify({ contentType, bytes: result.buffer.toString('base64') }));
          await rename(temporary, file);
          this.pruning ??= this.prune().finally(() => { this.pruning = null; });
        } catch { /* A read-only/full disk must not hide downloaded artwork. */ }
        return result;
      } catch (error) { failure = error; }
    }
    if (cached) return cached;
    throw failure;
  }
  async prune() {
    try {
      const files = await Promise.all((await readdir(this.folder)).filter(name => /^[a-f0-9]{64}\.json$/.test(name)).map(async name => ({ name, ...await stat(join(this.folder, name)) })));
      let size = files.reduce((sum, file) => sum + file.size, 0);
      for (const file of files.sort((a, b) => a.mtimeMs - b.mtimeMs)) {
        if (size <= 256 * 1024 * 1024) break;
        await unlink(join(this.folder, file.name)); size -= file.size;
      }
    } catch { /* Cache maintenance is best effort. */ }
  }
}
