import { chromium } from "playwright-core";

const base = process.env.NEXUS_QA_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();
const failures = [];
const checks = ["held R1", "released R1", "audio preference persistence"];
await page.addInitScript(() => {
  localStorage.setItem("nexus.onboarding.complete.v1", "true");
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false }));
  window.__qaPad = { buttons, axes: [0, 0] };
  navigator.getGamepads = () => [window.__qaPad];
});
await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
await page.locator('.game-tile[data-selected="true"]').waitFor({ timeout: 20_000 });

await page.evaluate(() => { window.__qaPad.buttons[5].pressed = true; });
await page.waitForURL("**/library");
await page.waitForTimeout(750);
if (new URL(page.url()).pathname !== "/library") failures.push("Held R1 changed section more than once");
await page.evaluate(() => { window.__qaPad.buttons[5].pressed = false; });
await page.waitForTimeout(450);
await page.evaluate(() => { window.__qaPad.buttons[5].pressed = true; });
await page.waitForTimeout(650);
if (new URL(page.url()).pathname !== "/search") failures.push(`R1 after release reached ${new URL(page.url()).pathname} instead of Search`);
await page.evaluate(() => { window.__qaPad.buttons[5].pressed = false; });
await page.waitForTimeout(450);
await page.evaluate(() => { window.__qaPad.buttons[5].pressed = true; });
await page.waitForURL("**/settings");
await page.evaluate(() => { navigator.getGamepads = () => []; });
await page.waitForTimeout(350);
await page.evaluate(() => { navigator.getGamepads = () => [window.__qaPad]; window.dispatchEvent(new Event("gamepadconnected")); });
await page.waitForURL("**/downloads");
checks.push("reconnected pad starts a new button edge");
await page.evaluate(() => { window.__qaPad.buttons[5].pressed = false; });

await page.goto(`${base}/settings?section=play`, { waitUntil: "domcontentloaded" });
const volume = page.getByRole("slider", { name: "Volume global" });
await volume.waitFor();
await volume.fill("43");
await page.getByRole("button", { name: "SON ACTIF" }).click();
await page.reload();
if (await volume.inputValue() !== "43") failures.push("Master volume was not persisted");
if (!(await page.getByRole("button", { name: "SON COUPÉ" }).isVisible())) failures.push("Mute was not persisted");
await page.screenshot({ path: "artifacts/qa/local/desktop-settings-audio.png" });
await page.setViewportSize({ width: 640, height: 720 });
await page.getByRole("slider", { name: "Volume global" }).scrollIntoViewIfNeeded();
await page.screenshot({ path: "artifacts/qa/local/narrow-settings-audio.png" });
const narrowSize = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
if (narrowSize.content > narrowSize.viewport + 2) failures.push("Audio settings overflow narrow viewport");

await browser.close();
console.log(JSON.stringify({ checks, failures }, null, 2));
if (failures.length) process.exitCode = 1;
