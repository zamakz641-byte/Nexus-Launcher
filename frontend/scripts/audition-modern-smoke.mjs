import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
try {
  const page = await browser.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("response", (response) => {
    if (response.url().endsWith(".wav") && !response.ok()) failures.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("http://127.0.0.1:4175/index.html");
  const cards = await page.locator(".card").count();
  if (cards !== 2) throw new Error(`Expected 2 modern families, received ${cards}`);
  for (const button of await page.locator(".row button, .samples button").all()) await button.click();
  await page.waitForTimeout(400);
  if (failures.length) throw new Error(failures.join("\n"));
  if (await page.getByText(/indisponible/i).count()) throw new Error("A sound sample did not load");
  console.log(`Modern audition: ${cards} families, ${await page.locator(".row button").count()} mapped cues, ${await page.locator(".samples button").count()} source samples`);
} finally { await browser.close(); }
