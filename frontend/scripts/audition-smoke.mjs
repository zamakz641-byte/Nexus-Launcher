import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
try {
  const page = await browser.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("http://127.0.0.1:4174/index.html");
  const cards = await page.locator(".card").count();
  if (cards !== 4) throw new Error(`Expected 4 listening families, received ${cards}`);
  for (const button of await page.locator(".card .cue button").all()) await button.click();
  await page.waitForTimeout(500);
  if (failures.length) throw new Error(failures.join("\n"));
  if (await page.getByText("Indisponible").count()) throw new Error("A sound sample did not load");
  console.log(`Audition board: ${cards} families and ${await page.locator(".card .cue button").count()} playable cues`);
} finally { await browser.close(); }
