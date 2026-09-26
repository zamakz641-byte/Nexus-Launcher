import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const qaDir = resolve(root, "artifacts", "qa", "app");
mkdirSync(qaDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});

const failures = [];
const warnings = [];
const checks = [];

async function runViewport(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "fr-FR" });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") failures.push(`${label}: console: ${message.text()}`); });
  page.on("pageerror", (error) => failures.push(`${label}: page: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() < 400 || response.url().includes("favicon")) return;
    const message = `${label}: ${response.status()} ${response.url()}`;
    if (response.url().includes("/api/library/catalog")) warnings.push(`Réseau externe: ${message}`);
    else failures.push(message);
  });
  await page.addInitScript(() => localStorage.setItem("nexus.onboarding.complete.v1", "true"));

  const visit = async (path, expected, file) => {
    await page.goto(`http://localhost:4173${path}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: expected }).waitFor({ timeout: 15_000 });
    await page.waitForTimeout(2_800);
    await page.screenshot({ path: resolve(qaDir, `${label}-${file}.png`), fullPage: false });
    const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    if (overflow.width > overflow.viewport + 2) failures.push(`${label}/${path}: overflow horizontal ${overflow.width}px > ${overflow.viewport}px`);
    checks.push(`${label}: ${path}`);
  };

  await visit("/", /CALL OF DUTY.*BLACK OPS (?:2|II)/, "home");
  await visit("/library", "Bibliothèque", "library");
  const countText = await page.locator(".screen-heading p").textContent();
  if (!countText?.includes("7 jeux")) failures.push(`${label}: bibliothèque attendue à 7 jeux, reçu: ${countText}`);

  await page.goto("http://localhost:4173/search", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Recherche" }).waitFor();
  await page.waitForTimeout(2_800);
  await page.getByPlaceholder("Titre, genre, studio…").fill("Red Dead");
  await page.getByText("RED DEAD REDEMPTION 2", { exact: true }).waitFor();
  await page.screenshot({ path: resolve(qaDir, `${label}-search.png`) });
  checks.push(`${label}: /search + requête locale`);
  await page.getByRole("tab", { name: "Catalogue Steam" }).click();
  await page.getByPlaceholder("Rechercher sur Steam…").fill("Hades");
  try {
    await page.getByText("Hades II", { exact: true }).waitFor({ timeout: 15_000 });
    await page.waitForFunction(() => Array.from(document.querySelectorAll(".search-card img")).slice(0, 2).every((image) => image.complete && image.naturalWidth > 0), undefined, { timeout: 10_000 });
    await page.screenshot({ path: resolve(qaDir, `${label}-search-catalog.png`) });
    checks.push(`${label}: /search + catalogue Steam`);
  } catch {
    warnings.push(`${label}: catalogue Steam indisponible ou trop lent; test réseau ignoré`);
  }

  await page.goto("http://localhost:4173/settings", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Paramètres" }).waitFor();
  await page.waitForTimeout(2_800);
  await page.getByRole("button", { name: "Bibliothèques" }).click();
  await page.getByText("F:\\Games", { exact: false }).waitFor();
  await page.screenshot({ path: resolve(qaDir, `${label}-settings.png`) });
  checks.push(`${label}: /settings + bibliothèque locale`);

  await visit("/downloads", "Téléchargements", "downloads");

  await page.goto("http://localhost:4173/game/local-call-of-duty-black-ops-2-ankergames", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /CALL OF DUTY.*BLACK OPS (?:2|II)/ }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: resolve(qaDir, `${label}-detail-local.png`) });
  checks.push(`${label}: /game/local-call-of-duty-black-ops-2-ankergames`);

  if (label === "narrow") {
    const dock = page.locator(".top-navigation__routes");
    const box = await dock.boundingBox();
    if (!box || box.y < viewport.height * 0.7) failures.push(`${label}: navigation mobile non ancrée en bas`);
  }
  await context.close();
}

await runViewport("desktop", { width: 1920, height: 1080 });
await runViewport("narrow", { width: 640, height: 720 });

const directContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "fr-FR" });
const directPage = await directContext.newPage();
await directPage.addInitScript(() => localStorage.setItem("nexus.onboarding.complete.v1", "true"));
await directPage.goto("http://localhost:4173/game/local-call-of-duty-black-ops-2-ankergames", { waitUntil: "domcontentloaded" });
await directPage.getByRole("heading", { name: /CALL OF DUTY.*BLACK OPS (?:2|II)/ }).waitFor({ timeout: 15_000 });
if (!directPage.url().includes("/game/local-call-of-duty-black-ops-2-ankergames")) failures.push("direct: la fiche locale a redirigé");
checks.push("direct: ouverture d’une fiche locale après scan");
await directContext.close();
await browser.close();

console.log(JSON.stringify({ checks, warnings, failures, screenshots: qaDir }, null, 2));
if (failures.length > 0) process.exitCode = 1;
