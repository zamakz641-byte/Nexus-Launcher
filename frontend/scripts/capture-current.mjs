import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "artifacts", "qa");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: "fr-FR" });
const page = await context.newPage();
await page.addInitScript(() => localStorage.setItem("nexus.onboarding.complete.v1", "true"));
await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await page.waitForTimeout(8000);
await page.screenshot({ path: resolve(out, "current-home.png") });
console.log(await page.title());
console.log("url", page.url());
console.log("text", (await page.locator("body").innerText()).slice(0, 1200));
await browser.close();
