import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  const mediaRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("requestfailed", (request) => { if (request.failure()?.errorText !== "net::ERR_ABORTED") errors.push(`${request.url()} ${request.failure()?.errorText}`); });
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); if (/m3u8|hls|\.ts(\?|$)/.test(response.url())) mediaRequests.push(`${response.status()} ${response.url()}`); });
  await page.addInitScript(() => localStorage.setItem("nexus.onboarding.complete.v1", "true"));
  await page.goto("http://127.0.0.1:5173/library");
  const game = page.locator(".library-entry").filter({ hasText: "RED DEAD REDEMPTION 2" });
  await game.waitFor({ timeout: 20_000 });
  await game.focus();
  const button = page.getByRole("button", { name: "Bande-annonce", exact: true });
  await button.waitFor();
  await button.click();
  await page.locator(".trailer-dialog video").waitFor();
  await page.waitForTimeout(8000);
  const video = await page.locator(".trailer-dialog video").evaluate((element) => ({ readyState: element.readyState, paused: element.paused, currentTime: element.currentTime, currentSrc: element.currentSrc, src: element.getAttribute("src"), nativeHls: element.canPlayType("application/vnd.apple.mpegurl"), error: element.error?.message }));
  console.log(JSON.stringify({ video, hlsResponses: mediaRequests.filter((item) => item.includes("steamstatic.com")).length, dialogError: await page.getByText("Lecture vidéo indisponible").count(), errors }));
  if (errors.length || !video.readyState || video.error) process.exitCode = 1;
} finally { await browser.close(); }
