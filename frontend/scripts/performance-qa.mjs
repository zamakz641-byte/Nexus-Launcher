import { chromium } from "playwright-core";

const base = process.env.NEXUS_QA_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const scanCalls = [];
  const pageErrors = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/library/scan") scanCalls.push(request.url());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("nexus.onboarding.complete.v1", "true");
    window.__gamepadReads = 0;
    const getGamepads = navigator.getGamepads?.bind(navigator);
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => {
        window.__gamepadReads += 1;
        return getGamepads ? getGamepads() : [];
      },
    });
  });
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await page.locator(".nexus-shell").waitFor();
  const before = await page.evaluate(() => window.__gamepadReads);
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => window.__gamepadReads);
  const result = { scanCalls: scanCalls.length, idleGamepadReads: after - before, pageErrors };
  console.log(JSON.stringify(result, null, 2));
  if (result.scanCalls !== 1 || result.idleGamepadReads > 8 || pageErrors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
