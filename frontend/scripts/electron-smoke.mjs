import { _electron as electron } from "playwright-core";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const { ELECTRON_RUN_AS_NODE: _runAsNode, ...electronEnv } = process.env;
const app = await electron.launch({
  executablePath: resolve(root, "node_modules/electron/dist/electron.exe"),
  args: [root],
  cwd: root,
  env: { ...electronEnv, ELECTRON_DISABLE_SECURITY_WARNINGS: "false" },
});
try {
  const window = await app.firstWindow();
  await window.addInitScript(() => {
    localStorage.setItem("nexus.onboarding.complete.v1", "true");
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [] });
  });
  await window.reload();
  await window.locator('.game-tile[data-selected="true"]').waitFor({ timeout: 30_000 });
  await window.waitForTimeout(1900);
  await window.locator(".home-screen").waitFor();
  await window.waitForTimeout(800);
  const state = await window.evaluate(() => ({
    url: location.href,
    desktopBridge: Boolean(window.nexusDesktop),
    nodeIntegration: typeof window.require !== "undefined",
    selectedGame: document.querySelector('.game-tile[data-selected="true"]')?.getAttribute("aria-label"),
  }));
  const library = await window.evaluate(async () => {
    const snapshot = await window.nexusDesktop.scanLibrary();
    let rejectedForgedPath = false;
    try { await window.nexusDesktop.launchGame("C:\\Windows\\not-a-game.exe"); } catch { rejectedForgedPath = true; }
    const steamGridStatus = await window.nexusDesktop.getSteamGridStatus();
    return { roots: snapshot.roots?.length ?? 0, games: snapshot.games?.length ?? 0, rejectedForgedPath, statusHasNoKey: !Object.keys(steamGridStatus).some((name) => /key|secret|token/i.test(name)) };
  });
  await window.screenshot({ path: resolve(root, "artifacts/qa/local/electron-home.png") });
  console.log(JSON.stringify({ ...state, ...library }, null, 2));
  if (!state.url.startsWith("nexus://app/") || !state.desktopBridge || state.nodeIntegration || !state.selectedGame || !library.rejectedForgedPath || !library.statusHasNoKey) process.exitCode = 1;
} finally {
  await app.close();
}
