import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
try {
  const page = await browser.newPage();
  await page.goto("https://cyrex-studios.itch.io/universal-ui-soundpack");
  await page.getByRole("link", { name: /Download Now/i }).first().click();
  await page.waitForTimeout(800);
  await page.getByText("No thanks, just take me to the downloads").click();
  await page.waitForTimeout(1000);
  const folder = resolve("artifacts/audio/audition-modern");
  await mkdir(folder, { recursive: true });
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /^Download$/ }).first().click()]);
  await download.saveAs(resolve(folder, "cyrex.zip"));
  console.log({ file: resolve(folder, "cyrex.zip"), suggestedFilename: download.suggestedFilename() });
} finally { await browser.close(); }
