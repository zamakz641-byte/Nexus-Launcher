import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LibraryRegistry, titleFromExecutable } from "../electron/libraryRegistry.mjs";

test("manual executable proposes a title, refreshes metadata after correction, and persists Nexus playtime", async () => {
  const profile = await mkdtemp(join(tmpdir(), "nexus-registry-"));
  const folder = join(profile, "The Great Game");
  await mkdir(folder);
  const exe = join(folder, "Game.exe");
  await writeFile(exe, "test");
  assert.equal(titleFromExecutable(exe), "The Great Game");
  const searched = [];
  const scan = async (root, _force, _direct, title) => {
    searched.push(title);
    return { games: [{ id: "local-game", title, folderPath: root, steamMetadata: { title, description: `${title} metadata` } }] };
  };
  const registry = new LibraryRegistry(profile, scan);
  await registry.load();
  const added = await registry.addExecutable(exe);
  const id = added.games[0].id;
  assert.equal(added.games[0].steamMetadata.description, "The Great Game metadata");
  const updated = await registry.setTitle(id, "Corrected Game");
  assert.equal(updated.games[0].title, "Corrected Game");
  assert.equal(updated.games[0].steamMetadata.description, "Corrected Game metadata");
  assert.deepEqual(searched, ["The Great Game", "Corrected Game"]);
  await registry.recordPlaytime(id, 125);
  const child = new EventEmitter();
  const updatedPlaytime = new Promise((resolve) => registry.trackLaunchedProcess(id, child, resolve));
  child.emit("exit", 0);
  await updatedPlaytime;
  const reopened = new LibraryRegistry(profile, scan);
  await reopened.load(); await reopened.scan();
  assert.equal(reopened.snapshot().games[0].playtimeSeconds, 126);
  assert.ok(reopened.snapshot().games[0].lastPlayedAt);
});

test("multiple sources persist, same game names have distinct IDs, and removal leaves files intact", async () => {
  const profile = await mkdtemp(join(tmpdir(), "nexus-registry-"));
  const first = join(profile, "one");
  const second = join(profile, "two");
  await mkdir(join(first, "Same"), { recursive: true });
  await mkdir(join(second, "Same"), { recursive: true });
  const standalone = join(profile, "standalone.exe");
  await writeFile(standalone, "test");
  const scan = async (root) => ({ games: [{ id: "local-same", title: "Same", folderPath: join(root, "Same"), executablePath: join(root, "Same", "game.exe") }] });
  const registry = new LibraryRegistry(profile, scan);
  await registry.load();
  await registry.addFolder(first);
  await registry.addFolder(second);
  await registry.addExecutable(standalone);
  assert.equal(registry.snapshot().roots.length, 2);
  assert.equal(registry.snapshot().games.length, 3);
  assert.equal(new Set(registry.snapshot().games.map((game) => game.id)).size, 3);
  await registry.addFolder(first);
  assert.equal(registry.snapshot().roots.length, 2);
  const reopened = new LibraryRegistry(profile, scan);
  await reopened.load();
  await reopened.scan();
  assert.equal(reopened.snapshot().games.length, 3);
  await reopened.remove(reopened.snapshot().manualGames[0].id);
  assert.equal((await stat(standalone)).isFile(), true);
  assert.equal(reopened.snapshot().manualGames.length, 0);
  const disk = JSON.parse(await readFile(join(profile, "library-registry.json"), "utf8"));
  assert.equal(disk.version, 1);
});

test("missing source does not erase another source", async () => {
  const profile = await mkdtemp(join(tmpdir(), "nexus-registry-"));
  const first = join(profile, "one");
  const second = join(profile, "two");
  await mkdir(first); await mkdir(second);
  const registry = new LibraryRegistry(profile, async (root) => {
    if (root === first) throw new Error("Source indisponible");
    return { games: [{ id: "local-okay", title: "Okay", folderPath: join(root, "Okay") }] };
  });
  await registry.load();
  await registry.addFolder(first);
  await registry.addFolder(second);
  const snapshot = await registry.scan();
  assert.equal(snapshot.games.length, 1);
  assert.match(snapshot.scanErrors[snapshot.roots[0].id], /indisponible/);
});

test("a direct game folder is scanned as one source", async () => {
  const profile = await mkdtemp(join(tmpdir(), "nexus-registry-"));
  const folder = join(profile, "My Game");
  await mkdir(folder);
  const calls = [];
  const registry = new LibraryRegistry(profile, async (root, _force, direct) => {
    calls.push({ root, direct });
    return { games: [{ id: "local-my-game", title: "My Game", folderPath: root }] };
  });
  await registry.load();
  await registry.addFolder(folder, "game");
  assert.equal(calls[0].direct, true);
  assert.equal(registry.snapshot().games.length, 1);
});

test("launch only resolves scanned game IDs and explicitly registered executables", async () => {
  const profile = await mkdtemp(join(tmpdir(), "nexus-registry-"));
  const exe = join(profile, "game.exe");
  await writeFile(exe, "test");
  const registry = new LibraryRegistry(profile, async () => ({ games: [] }));
  await registry.load();
  await assert.rejects(registry.authorizedExecutable(exe), /non autorisé/);
  const snapshot = await registry.addExecutable(exe);
  assert.equal(await registry.authorizedExecutable(snapshot.manualGames[0].id), exe);
  await writeFile(exe, "changed after scan");
  await assert.rejects(registry.authorizedExecutable(snapshot.manualGames[0].id), /modifié/);
});

test("changing a scanned game's executable cannot escape its registered folder", async () => {
  const profile = await mkdtemp(join(tmpdir(), "nexus-registry-"));
  const root = join(profile, "library");
  const gameFolder = join(root, "Game");
  await mkdir(gameFolder, { recursive: true });
  const safe = join(gameFolder, "safe.exe");
  const outside = join(profile, "outside.exe");
  await writeFile(safe, "safe"); await writeFile(outside, "outside");
  const registry = new LibraryRegistry(profile, async () => ({ games: [{ id: "local-game", title: "Game", folderPath: gameFolder }] }));
  await registry.load();
  const snapshot = await registry.addFolder(root);
  const id = snapshot.games[0].id;
  await assert.rejects(registry.setExecutable(id, outside), /hors du dossier/);
  await registry.setExecutable(id, safe);
  assert.equal(await registry.authorizedExecutable(id), safe);
});

test("manual artwork accepts only a real supported image and persists its override", async () => {
  const profile = await mkdtemp(join(tmpdir(), "nexus-registry-"));
  const exe = join(profile, "game.exe");
  const fake = join(profile, "fake.png");
  const image = join(profile, "real.png");
  await writeFile(exe, "exe"); await writeFile(fake, "not an image");
  await writeFile(image, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]));
  const registry = new LibraryRegistry(profile, async () => ({ games: [] }));
  await registry.load();
  const id = (await registry.addExecutable(exe)).games[0].id;
  await assert.rejects(registry.setArtwork(id, "gridArtwork", fake), /format réel/);
  const result = await registry.setArtwork(id, "gridArtwork", image);
  assert.match(result.games[0].artworkUrl, /nexus-artwork/);
  const reopened = new LibraryRegistry(profile, async () => ({ games: [] }));
  await reopened.load(); await reopened.scan();
  assert.match(reopened.snapshot().games[0].artworkUrl, /nexus-artwork/);
});
