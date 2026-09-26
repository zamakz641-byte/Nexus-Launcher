import { chromium } from "playwright-core";

const base = "http://127.0.0.1:4173";
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--disable-gpu"],
});
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: "fr-FR" });
const page = await context.newPage();
const failures = [];
const checks = [];
await page.addInitScript(() => localStorage.setItem("nexus.onboarding.complete.v1", "true"));

await page.goto(base, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: /CALL OF DUTY.*BLACK OPS (?:2|II)/ }).waitFor({ timeout: 20_000 });
await page.locator('.game-tile[data-selected="true"]').focus();
await page.keyboard.press("ArrowUp");
if (!(await page.locator(".hero-game .nexus-button").first().evaluate((el) => el === document.activeElement))) failures.push("Home: rail → action principale");
await page.keyboard.press("ArrowUp");
if (!(await page.evaluate(() => document.activeElement?.classList.contains("top-navigation__route") && document.activeElement?.getAttribute("aria-current") === "page"))) failures.push("Home: action → navigation active");
checks.push("Home: navigation verticale");

await page.goto(`${base}/search`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: "Recherche" }).waitFor();
await page.getByPlaceholder("Titre, genre, studio…").fill("Red Dead");
await page.getByText("RED DEAD REDEMPTION 2", { exact: true }).waitFor();
await page.getByPlaceholder("Titre, genre, studio…").focus();
await page.keyboard.press("ArrowDown");
if (!(await page.locator(".search-card").first().evaluate((el) => el === document.activeElement))) failures.push("Search: champ → résultat");
checks.push("Search: navigation spatiale");

await page.goto(`${base}/settings`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: "Paramètres" }).waitFor();
await page.getByRole("button", { name: "Bibliothèques" }).click();
await page.getByRole("button", { name: "Bibliothèques" }).focus();
await page.keyboard.press("ArrowRight");
const focusedText = await page.evaluate(() => document.activeElement?.textContent || "");
if (!focusedText.includes("Analyser")) failures.push(`Settings: section → contenu (focus: ${focusedText.trim()})`);
checks.push("Settings: navigation spatiale");

await context.close();
await browser.close();
console.log(JSON.stringify({ checks, failures }, null, 2));
if (failures.length) process.exitCode = 1;
