import { chromium } from "playwright-core";
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const qaDir = resolve(root, "artifacts", "qa");
const publicQaDir = resolve(root, "public", "assets", "qa");
mkdirSync(qaDir, { recursive: true });
mkdirSync(publicQaDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  locale: "fr-FR",
  reducedMotion: "no-preference",
});
const page = await context.newPage();
const consoleErrors = [];
const failedResponses = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => consoleErrors.push(error.message));
page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });

await page.addInitScript(() => localStorage.setItem("nexus.onboarding.complete.v1", "true"));
await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "ASTRA VEIL" }).waitFor();
const selected = page.locator('.game-tile[data-selected="true"]');
await selected.focus();
await page.waitForTimeout(450);
await page.screenshot({ path: resolve(qaDir, "home-glass-1920x1080.png") });

await page.locator(".game-tile").nth(3).hover();
await page.waitForTimeout(260);
await page.screenshot({ path: resolve(qaDir, "home-glass-hover-1920x1080.png") });

await selected.focus();
await page.keyboard.press("ArrowRight");
await page.getByRole("heading", { name: "EMBERFALL" }).waitFor();
await page.keyboard.press("ArrowLeft");
await page.getByRole("heading", { name: "ASTRA VEIL" }).waitFor();

copyFileSync(resolve(qaDir, "home-glass-1920x1080.png"), resolve(publicQaDir, "implementation.png"));
const comparePage = await context.newPage();
await comparePage.setViewportSize({ width: 1920, height: 620 });
await comparePage.setContent(`<!doctype html><style>*{box-sizing:border-box}body{margin:0;background:#070a0e;color:#fff;font:14px Arial;display:grid;grid-template-columns:1fr 1fr;gap:2px}.panel{height:620px;display:grid;grid-template-rows:44px 540px;align-content:center;background:#0d1117}.label{display:flex;align-items:center;padding:0 18px;letter-spacing:.14em;color:#9fb0c2}.panel img{width:960px;height:540px;object-fit:cover;display:block}</style><div class="panel"><div class="label">SOURCE — GLASS HOME</div><img src="http://localhost:4173/assets/qa/source.png"></div><div class="panel"><div class="label">IMPLÉMENTATION — 1920 × 1080</div><img src="http://localhost:4173/assets/qa/implementation.png"></div>`);
await comparePage.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
await comparePage.screenshot({ path: resolve(qaDir, "home-glass-comparison.png") });

console.log(JSON.stringify({
  screenshots: ["home-glass-1920x1080.png", "home-glass-hover-1920x1080.png", "home-glass-comparison.png"],
  interactions: ["selected focus", "pointer hover", "keyboard right/left navigation"],
  consoleErrors,
  failedResponses,
}, null, 2));
await browser.close();
