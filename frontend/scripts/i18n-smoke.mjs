import { chromium } from "playwright-core";

const base = process.env.NEXUS_I18N_QA_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const failures = [];

async function checkLanguage(locale, screens) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await context.addInitScript((value) => {
    localStorage.setItem("nexus.onboarding.complete.v1", "true");
    localStorage.setItem("nexus.locale.v1", value);
  }, locale);
  const page = await context.newPage();
  page.on("pageerror", (error) => failures.push(`${locale}: ${error.message}`));
  for (const [path, heading, content] of screens) {
    await page.goto(`${base}${path}`);
    await page.getByRole("heading", { name: heading, exact: true }).first().waitFor({ timeout: 20_000 });
    for (const value of content) {
      if (!await page.getByText(value, { exact: true }).count()) failures.push(`${locale} ${path}: missing ${value}`);
    }
    if (await page.locator("html").getAttribute("lang") !== locale) failures.push(`${locale} ${path}: html lang mismatch`);
    const text = await page.locator("body").innerText();
    if (/\b(?:settings|search|downloads|detail|library|home)\.[A-Za-z]+\b/.test(text)) failures.push(`${locale} ${path}: untranslated key visible`);
    if (locale === "en" && path === "/settings") await page.screenshot({ path: "artifacts/qa/settings-english-desktop.png" });
    if (locale === "en") {
      await page.setViewportSize({ width: 640, height: 720 });
      const size = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
      if (size.page > size.viewport + 2) failures.push(`${locale} ${path}: narrow overflow ${size.page} > ${size.viewport}`);
      if (path === "/settings") await page.screenshot({ path: "artifacts/qa/settings-english-narrow.png" });
      await page.setViewportSize({ width: 1920, height: 1080 });
    }
  }
  await context.close();
}

try {
  await checkLanguage("en", [
    ["/", /CALL OF DUTY.*BLACK OPS/i, ["Ready to play"]],
    ["/library", "Library", ["PERSONAL COLLECTION", "All games"]],
    ["/search", "Search", ["EXPLORE", "Steam Catalog"]],
    ["/settings", "Settings", ["CONTROL CENTER", "Visual theme"]],
    ["/settings?section=libraries", "Settings", ["Personal sources", "Detected executables"]],
    ["/settings?section=play", "Settings", ["Master volume", "UI sound effects"]],
    ["/downloads", "Downloads", ["TRANSFER MANAGER", "Your queue is empty"]],
    ["/game/local-call-of-duty-black-ops-2-ankergames", /CALL OF DUTY.*BLACK OPS/i, ["Back to library", "Overview"]],
  ]);
  await checkLanguage("fr", [
    ["/library", "Bibliothèque", ["COLLECTION PERSONNELLE", "Tous les jeux"]],
    ["/search", "Recherche", ["EXPLORER", "Catalogue Steam"]],
    ["/settings", "Paramètres", ["CENTRE DE CONTRÔLE", "Thème visuel"]],
    ["/downloads", "Téléchargements", ["GESTIONNAIRE DE TRANSFERTS", "Votre file est vide"]],
    ["/game/local-call-of-duty-black-ops-2-ankergames", /CALL OF DUTY.*BLACK OPS/i, ["Retour à la bibliothèque", "Aperçu"]],
  ]);
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem("nexus.onboarding.complete.v1", "true"));
  const page = await context.newPage();
  await page.goto(`${base}/settings`);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  try { await page.getByRole("heading", { name: "Settings" }).waitFor({ timeout: 3000 }); }
  catch { failures.push("Language switch did not update Settings immediately"); }
  await page.reload();
  try { await page.getByRole("heading", { name: "Settings" }).waitFor({ timeout: 5000 }); }
  catch { failures.push("Language switch did not persist after reload"); }
  await context.close();
  console.log(JSON.stringify({ failures }));
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
}
