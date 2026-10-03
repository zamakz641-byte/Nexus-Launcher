import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { trackGameSession } from '../backend/gameSession.mjs';

test('session waits for game descendant after intermediate launcher exits', async () => {
  const child = new EventEmitter(); child.pid = 10;
  let rows = [{ pid: 10, parent: 1 }, { pid: 20, parent: 10 }];
  const session = trackGameSession(child, { listProcesses: async () => rows, interval: 10 });
  let ended = false; session.once('exit', () => { ended = true; });
  await new Promise(resolve => setTimeout(resolve, 25));
  rows = [{ pid: 20, parent: 10 }]; child.emit('exit', 0);
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(ended, false);
  const exit = new Promise(resolve => session.once('exit', resolve));
  rows = []; await exit;
  assert.equal(ended, true);
});

test('temporary process enumeration failure does not end a known running game', async () => {
  const child = new EventEmitter(); child.pid = 10;
  let fail = false, alive = true;
  const session = trackGameSession(child, { interval: 10, listProcesses: async () => {
    if (fail) throw new Error('temporary CIM timeout');
    return alive ? [{ pid: 20, parent: 10 }] : [];
  } });
  let ended = false; session.once('exit', () => { ended = true; });
  await new Promise(resolve => setTimeout(resolve, 20)); child.emit('exit'); fail = true;
  await new Promise(resolve => setTimeout(resolve, 25)); assert.equal(ended, false);
  const exit = new Promise(resolve => session.once('exit', resolve)); fail = false; alive = false; await exit;
});
