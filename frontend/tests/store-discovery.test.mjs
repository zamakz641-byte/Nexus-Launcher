import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, realpath, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverStoreGames } from "../electron/storeDiscovery.mjs";
import { LibraryRegistry } from "../electron/libraryRegistry.mjs";

test("Steam libraries and Epic manifests discover installed games outside the default root", async () => {
  const profile = await mkdtemp(join(tmpdir(), "nexus-stores-"));
  const steam = join(profile, "Steam");
  const secondLibrary = join(profile, "Other Steam Library");
  const firstGame = join(steam, "steamapps", "common", "First Game");
  const secondGame = join(secondLibrary, "steamapps", "common", "Second Game");
  const epicGame = join(profile, "External Epic Game");
  const epicManifests = join(profile, "Epic", "Manifests");
  await Promise.all([mkdir(firstGame, { recursive: true }), mkdir(secondGame, { recursive: true }), mkdir(epicGame), mkdir(epicManifests, { recursive: true })]);
  await writeFile(join(steam, "steamapps", "libraryfolders.vdf"), `"libraryfolders" { "1" { "path" "${secondLibrary.replaceAll("\\", "\\\\")}" } }`);
  await writeFile(join(steam, "steamapps", "appmanifest_101.acf"), '"AppState" { "appid" "101" "name" "First Game" "installdir" "First Game" }');
  await writeFile(join(secondLibrary, "steamapps", "appmanifest_202.acf"), '"AppState" { "appid" "202" "name" "Second Game" "installdir" "Second Game" }');
  await writeFile(join(epicManifests, "installed.item"), JSON.stringify({ DisplayName: "Epic Example", InstallLocation: epicGame, AppName: "EpicExample" }));
  await writeFile(join(epicManifests, "missing.item"), JSON.stringify({ DisplayName: "Missing", InstallLocation: join(profile, "not-connected"), AppName: "Missing" }));
  await writeFile(join(epicManifests, "broken.item"), "{");

  const discovery = await discoverStoreGames({ driveRoots: [], steamRoots: [steam], epicManifestDirs: [epicManifests] });
  assert.deepEqual(discovery.games.map((game) => [game.title, game.platform, game.storeId]).sort((a, b) => a[0].localeCompare(b[0])), [
    ["Epic Example", "Epic", "EpicExample"],
    ["First Game", "Steam", "101"],
    ["Second Game", "Steam", "202"],
  ]);

  const registry = new LibraryRegistry(profile, async (root) => ({ games: [{ folderPath: root, title: "Folder Name" }] }));
  await registry.load();
  await registry.syncAutoSources(discovery.games);
  const snapshot = await registry.scan();
  assert.equal(snapshot.games.length, 3);
  const actualEpicGame = await realpath(epicGame);
  const actualFirstGame = await realpath(firstGame);
  assert.equal(snapshot.games.find((game) => game.folderPath === actualEpicGame)?.title, "Epic Example");
  const removed = snapshot.roots.find((root) => root.path === actualFirstGame);
  await registry.remove(removed.id);
  await registry.syncAutoSources(discovery.games);
  assert.equal(registry.snapshot().roots.some((root) => root.path === actualFirstGame), false);
  assert.equal((await stat(firstGame)).isDirectory(), true);
});
