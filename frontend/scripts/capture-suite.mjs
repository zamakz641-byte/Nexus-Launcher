import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "artifacts", "qa", "suite");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const errors = [];
const desktop = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: "fr-FR" });
const page = await desktop.newPage();
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", e => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem("nexus.onboarding.complete.v1", "true"));
await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await page.waitForTimeout(8000);
await page.screenshot({ path: resolve(out, "home.png") });
for (const [path, name] of [
  ["/library", "library"],
  ["/search", "search"],
  ["/settings", "settings"],
  ["/downloads", "downloads"],
]) {
  await page.goto("http://127.0.0.1:4173" + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: resolve(out, name + ".png") });
}
await desktop.close();
const narrow = await browser.newContext({ viewport: { width: 640, height: 720 }, locale: "fr-FR" });
const mobile = await narrow.newPage();
mobile.on("console", m => { if (m.type() === "error") errors.push("narrow: " + m.text()); });
await mobile.addInitScript(() => localStorage.setItem("nexus.onboarding.complete.v1", "true"));
await mobile.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await mobile.waitForTimeout(7000);
await mobile.screenshot({ path: resolve(out, "home-640x720.png") });
await mobile.goto("http://127.0.0.1:4173/settings", { waitUntil: "networkidle" });
await mobile.waitForTimeout(1000);
await mobile.screenshot({ path: resolve(out, "settings-640x720.png") });
console.log(JSON.stringify({ errors }, null, 2));
await browser.close();
