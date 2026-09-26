import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173/");
  const result = await page.evaluate(async () => {
    const { sampleData } = await import("/src/audio/sampleData.ts");
    const context = new AudioContext();
    const durations = {};
    for (const [cue, encoded] of Object.entries(sampleData)) {
      const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      const buffer = await context.decodeAudioData(bytes.buffer);
      durations[cue] = buffer.duration;
    }
    await context.close();
    return durations;
  });
  console.log(JSON.stringify(result));
  if (Object.keys(result).length !== 6 || Object.values(result).some((duration) => duration <= 0)) process.exitCode = 1;
} finally { await browser.close(); }
