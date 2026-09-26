import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const qaDir = resolve(root, "artifacts", "qa", "local");
mkdirSync(qaDir, { recursive: true });
const base = "http://127.0.0.1:4173";
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const failures = [];
const checks = [];

async function runViewport(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "fr-FR" });
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error") failures.push(`${label}: console: ${m.text()}`); });
  page.on("pageerror", (e) => failures.push(`${label}: page: ${e.message}`));
  await page.addInitScript(() => localStorage.setItem("nexus.onboarding.complete.v1", "true"));

  const capture = async (path, heading, file, after) => {
    await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: heading }).waitFor({ timeout: 20_000 });
    if (after) await after(page);
    await page.waitForTimeout(2200);
    await page.screenshot({ path: resolve(qaDir, `${label}-${file}.png`) });
    const size = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
    if (size.page > size.viewport + 2) failures.push(`${label}${path}: overflow ${size.page} > ${size.viewport}`);
    checks.push(`${label}: ${path}`);
  };

  await capture("/", /CALL OF DUTY.*BLACK OPS (?:2|II)/, "home");
  if (label === "desktop") {
    await page.locator('.game-tile[data-selected="true"]').focus();
    await page.keyboard.press("ArrowUp");
    if (!(await page.locator(".hero-game .nexus-button").first().evaluate((el) => el === document.activeElement))) failures.push("desktop: ArrowUp du rail ne rejoint pas l’action principale");
    await page.keyboard.press("ArrowUp");
    if (!(await page.evaluate(() => document.activeElement?.classList.contains("top-navigation__route") && document.activeElement?.getAttribute("aria-current") === "page"))) failures.push("desktop: ArrowUp du hero ne rejoint pas la navigation active");
    checks.push("desktop: navigation clavier Home rail → action → navigation");
  }
  await capture("/library", "Bibliothèque", "library", async (p) => {
    await p.locator(".library-focus").waitFor();
  });
  await capture("/search", "Recherche", "search", async (p) => {
    await p.getByPlaceholder("Titre, genre, studio…").fill("Red Dead");
    await p.getByText("RED DEAD REDEMPTION 2", { exact: true }).waitFor();
  });
  if (label === "desktop") {
    await page.getByPlaceholder("Titre, genre, studio…").focus();
    await page.keyboard.press("ArrowDown");
    if (!(await page.locator(".search-card").first().evaluate((el) => el === document.activeElement))) failures.push("desktop: ArrowDown depuis la recherche ne rejoint pas le premier résultat");
    checks.push("desktop: navigation spatiale Search");
  }

  await capture("/settings", "Paramètres", "settings", async (p) => {
    await p.getByRole("button", { name: "Bibliothèques" }).click();
    await p.getByText("F:\\Games", { exact: false }).waitFor();
  });
  if (label === "desktop") {
    await page.getByRole("button", { name: "Bibliothèques" }).focus();
    await page.keyboard.press("ArrowRight");
    const focusedText = await page.evaluate(() => document.activeElement?.textContent || "");
    if (!focusedText.includes("Ajouter une collection")) failures.push(`desktop: navigation spatiale Settings attendait "Ajouter une collection", reçu "${focusedText.trim()}"`);
    if (!await page.getByRole("button", { name: "Ajouter un jeu (.exe)" }).isEnabled()) failures.push("desktop: ajout d’un exécutable indisponible");
    checks.push("desktop: navigation spatiale Settings");
  }
  await capture("/downloads", "Téléchargements", "downloads");
  await capture("/game/local-call-of-duty-black-ops-2-ankergames", /CALL OF DUTY.*BLACK OPS (?:2|II)/, "detail");

  if (label === "narrow") {
    const box = await page.locator(".top-navigation__routes").boundingBox();
    if (!box || box.y < viewport.height * .7) failures.push("narrow: dock not anchored near bottom");
  }
  await context.close();
}

await runViewport("desktop", { width: 1920, height: 1080 });
await runViewport("narrow", { width: 640, height: 720 });

const prefsContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "en-US" });
const prefsPage = await prefsContext.newPage();
await prefsPage.addInitScript(() => {
  localStorage.setItem("nexus.onboarding.complete.v1", "true");
  localStorage.setItem("nexus.locale.v1", "en");
  localStorage.setItem("nexus.theme.v1", "solaris");
});
await prefsPage.goto(base, { waitUntil: "domcontentloaded" });
await prefsPage.getByText("Library", { exact: true }).waitFor({ timeout: 20_000 });
const persistedTheme = await prefsPage.evaluate(() => document.documentElement.dataset.theme);
if (persistedTheme !== "solaris") failures.push(`preferences: thème attendu solaris, reçu ${persistedTheme}`);
checks.push("preferences: langue et thème persistent après rechargement");
await prefsContext.close();

await browser.close();
console.log(JSON.stringify({ checks, failures, screenshots: qaDir }, null, 2));
if (failures.length) process.exitCode = 1;
