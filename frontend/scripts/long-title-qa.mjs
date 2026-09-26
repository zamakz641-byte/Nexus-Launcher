import { chromium } from "playwright-core";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const qaDir = resolve(root, "artifacts", "qa", "long-title");
mkdirSync(qaDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const context = await browser.newContext({ viewport: { width: 1908, height: 850 }, deviceScaleFactor: 1, locale: "fr-FR" });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript(() => localStorage.setItem("nexus.onboarding.complete.v1", "true"));
await page.goto("http://localhost:4173/library", { waitUntil: "domcontentloaded" });
await page.getByText(/CALL OF DUTY.*BLACK OPS (?:2|II)/, { exact: true }).waitFor({ timeout: 15_000 });
await page.getByText(/CALL OF DUTY.*BLACK OPS (?:2|II)/, { exact: true }).click();
await page.getByRole("heading", { name: /CALL OF DUTY.*BLACK OPS (?:2|II)/ }).waitFor();
await page.locator('a[href="/"]').first().click();
await page.getByRole("heading", { name: /CALL OF DUTY.*BLACK OPS (?:2|II)/ }).waitFor();
await page.waitForTimeout(700);
const capturePath = resolve(qaDir, process.argv.includes("--after") ? "02-after.png" : "01-before.png");
await page.screenshot({ path: capturePath });
const metrics = await page.evaluate(() => {
  const rect = (selector) => {
    const node = document.querySelector(selector);
    if (!node) return null;
    const box = node.getBoundingClientRect();
    return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height), right: Math.round(box.right), bottom: Math.round(box.bottom) };
  };
  return {
    viewport: { width: innerWidth, height: innerHeight },
    hero: rect(".hero-transition"),
    title: rect(".hero-game__logo") ?? rect(".hero-game h1"),
    actions: rect(".hero-game__actions"),
    rail: rect(".game-rail"),
    selected: rect('.game-tile[data-selected="true"]'),
    horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
  };
});
console.log(JSON.stringify({ metrics, errors }, null, 2));
if (process.argv.includes("--after")) {
  const comparison = await context.newPage();
  await comparison.setViewportSize({ width: 1908, height: 492 });
  const source = readFileSync("C:\\Users\\USER\\AppData\\Local\\Temp\\codex-clipboard-53678d69-acb9-4fcc-87f8-f6328da17417.png").toString("base64");
  const implementation = readFileSync(capturePath).toString("base64");
  await comparison.setContent(`<!doctype html><style>*{box-sizing:border-box}body{margin:0;background:#05080c;color:#dce8f4;font:12px Arial;display:grid;grid-template-columns:1fr 1fr;gap:2px}.panel{height:492px;display:grid;grid-template-rows:42px 425px;align-content:center;overflow:hidden}.label{padding:14px 16px;letter-spacing:.12em}.shot{position:relative;width:954px;height:425px;overflow:hidden}.source{position:absolute;width:954px;height:auto;top:-75px;left:0}.implementation{width:954px;height:425px;object-fit:cover}</style><div class="panel"><div class="label">SOURCE — ÉTAT SIGNALÉ</div><div class="shot"><img class="source" src="data:image/png;base64,${source}"></div></div><div class="panel"><div class="label">CORRECTION — MÊME ÉTAT</div><div class="shot"><img class="implementation" src="data:image/png;base64,${implementation}"></div></div>`);
  await comparison.waitForFunction(() => [...document.images].every((image) => image.complete));
  await comparison.screenshot({ path: resolve(qaDir, "03-comparison.png") });

  const narrowContext = await browser.newContext({ viewport: { width: 640, height: 720 }, deviceScaleFactor: 1, locale: "fr-FR" });
  const narrow = await narrowContext.newPage();
  await narrow.addInitScript(() => localStorage.setItem("nexus.onboarding.complete.v1", "true"));
  await narrow.goto("http://localhost:4173/library", { waitUntil: "domcontentloaded" });
  await narrow.getByText(/CALL OF DUTY.*BLACK OPS (?:2|II)/, { exact: true }).waitFor({ timeout: 15_000 });
  await narrow.getByText(/CALL OF DUTY.*BLACK OPS (?:2|II)/, { exact: true }).click();
  await narrow.getByRole("heading", { name: /CALL OF DUTY.*BLACK OPS (?:2|II)/ }).waitFor();
  await narrow.locator('.top-navigation__route[href="/"]').click();
  await narrow.getByRole("heading", { name: /CALL OF DUTY.*BLACK OPS (?:2|II)/ }).waitFor();
  await narrow.waitForTimeout(500);
  await narrow.screenshot({ path: resolve(qaDir, "04-narrow-after.png") });
  const narrowMetrics = await narrow.evaluate(() => {
    const title = (document.querySelector(".hero-game__logo") ?? document.querySelector(".hero-game h1"))?.getBoundingClientRect();
    const selected = document.querySelector('.game-tile[data-selected="true"]')?.getBoundingClientRect();
    return { titleBottom: Math.round(title?.bottom ?? 0), selectedTop: Math.round(selected?.top ?? 0), overflow: document.documentElement.scrollWidth - innerWidth };
  });
  console.log(JSON.stringify({ narrowMetrics }, null, 2));
  await narrowContext.close();
}
await browser.close();
