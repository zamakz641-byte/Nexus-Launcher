import { chromium } from "playwright-core";
import { resolve } from "node:path";

const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const base = process.env.NEXUS_SMOKE_URL || "http://127.0.0.1:5173";
try {
  for (const [label, viewport] of [["desktop", { width: 1920, height: 1080 }], ["narrow", { width: 640, height: 720 }]]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    const pending = new Set();
    page.on("request", (request) => pending.add(request.url()));
    page.on("requestfinished", (request) => pending.delete(request.url()));
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) => errors.push(`request: ${request.url()} ${request.failure()?.errorText}`));
    page.on("response", (response) => { if (response.status() >= 400) errors.push(`http: ${response.status()} ${response.url()}`); });
    await page.addInitScript(() => localStorage.setItem("nexus.onboarding.complete.v1", "true"));
    await page.goto(`${base}/library`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: resolve("artifacts", "qa", "local", `${label}-library-current.png`) });
    console.log(label, JSON.stringify({ title: await page.title(), games: await page.locator(".library-entry").count(), focus: await page.locator(".library-focus").count(), loading: await page.locator(".library-loading").count(), trailer: await page.locator(".library-focus__trailer").count(), text: (await page.locator("body").innerText()).slice(0, 180), pending: [...pending].slice(0, 15), errors }));
    await page.close();
  }
} finally { await browser.close(); }

