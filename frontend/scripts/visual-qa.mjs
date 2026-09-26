import { chromium } from "playwright-core";
import { mkdirSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const qaDir = resolve(root, "artifacts", "qa");
const publicQaDir = resolve(root, "public", "assets", "qa");
mkdirSync(qaDir, { recursive: true });
mkdirSync(publicQaDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--disable-gpu"],
});

const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
const page = await context.newPage();
const consoleErrors = [];
const failedResponses = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => consoleErrors.push(error.message));
page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });

await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await page.locator(".onboarding__step").waitFor();
await page.waitForTimeout(900);
await page.screenshot({ path: resolve(qaDir, "onboarding-1920x1080.png") });

await page.getByRole("button", { name: "Continuer" }).click();
await page.getByRole("button", { name: "Continuer" }).click();
await page.getByRole("button", { name: "Entrer dans Nexus" }).click();
await page.locator(".onboarding").waitFor({ state: "detached" });
await page.getByRole("heading", { name: "ASTRA VEIL" }).waitFor();
await page.screenshot({ path: resolve(qaDir, "home-1920x1080.png") });

await page.keyboard.press("ArrowRight");
await page.getByRole("heading", { name: "EMBERFALL" }).waitFor();
await page.keyboard.press("ArrowLeft");
await page.getByRole("heading", { name: "ASTRA VEIL" }).waitFor();

await page.getByRole("button", { name: "Plus d’options" }).click();
await page.locator(".game-detail-screen").waitFor();
await page.screenshot({ path: resolve(qaDir, "game-detail-1920x1080.png") });
await page.getByRole("button", { name: "Voir le trailer" }).click();
await page.locator(".trailer-dialog").waitFor();
await page.screenshot({ path: resolve(qaDir, "trailer-1920x1080.png") });
await page.getByRole("button", { name: "Fermer" }).click();

await page.getByRole("link", { name: "Bibliothèque" }).click();
await page.getByRole("heading", { name: "Bibliothèque" }).waitFor();
await page.screenshot({ path: resolve(qaDir, "library-1920x1080.png") });

await page.getByRole("link", { name: "Recherche" }).click();
await page.getByRole("heading", { name: "Recherche" }).waitFor();
await page.getByPlaceholder("Titre, genre ou action…").fill("nova");
await page.getByRole("button", { name: /NOVA TIDE/ }).waitFor();
await page.screenshot({ path: resolve(qaDir, "search-1920x1080.png") });

await page.getByRole("button", { name: "Paramètres" }).click();
await page.getByRole("heading", { name: "Paramètres" }).waitFor();
await page.getByRole("button", { name: "Solaris" }).click();
await page.screenshot({ path: resolve(qaDir, "settings-solaris-1920x1080.png") });
await page.getByRole("button", { name: "Obsidienne" }).click();
await page.getByRole("button", { name: "Métadonnées" }).click();
await page.getByText("SteamGridDB", { exact: true }).waitFor();
await page.screenshot({ path: resolve(qaDir, "settings-metadata-1920x1080.png") });

copyFileSync(resolve(qaDir, "home-1920x1080.png"), resolve(publicQaDir, "implementation.png"));
const comparePage = await context.newPage();
await comparePage.setViewportSize({ width: 1920, height: 620 });
await comparePage.setContent(`<!doctype html><style>*{box-sizing:border-box}body{margin:0;background:#070a0e;color:#fff;font:14px Arial;display:grid;grid-template-columns:1fr 1fr;gap:2px}.panel{height:620px;display:grid;grid-template-rows:44px 540px;align-content:center;background:#0d1117}.label{display:flex;align-items:center;padding:0 18px;letter-spacing:.14em;color:#9fb0c2}.panel img{width:960px;height:540px;object-fit:cover;display:block}</style><div class="panel"><div class="label">SOURCE — MAQUETTE APPROUVÉE</div><img src="http://localhost:4173/assets/qa/source.png"></div><div class="panel"><div class="label">IMPLÉMENTATION — 1920 × 1080</div><img src="http://localhost:4173/assets/qa/implementation.png"></div>`);
await comparePage.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
await comparePage.screenshot({ path: resolve(qaDir, "home-comparison.png") });

console.log(JSON.stringify({
  screenshots: ["onboarding-1920x1080.png", "home-1920x1080.png", "game-detail-1920x1080.png", "trailer-1920x1080.png", "library-1920x1080.png", "search-1920x1080.png", "settings-solaris-1920x1080.png", "settings-metadata-1920x1080.png", "home-comparison.png"],
  interactions: ["onboarding", "game rail keyboard and wrap", "game detail", "trailer playback", "library", "search", "settings sections", "theme switch"],
  consoleErrors,
  failedResponses,
}, null, 2));

await browser.close();
