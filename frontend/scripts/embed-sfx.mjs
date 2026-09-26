import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const cues = {
  move: "Minimalist7.ogg",
  confirm: "Minimalist9.ogg",
  back: "Minimalist6.ogg",
  tab: "Minimalist10.ogg",
  launch: "Modern14.ogg",
  startup: "Modern16.ogg",
};
const entries = await Promise.all(Object.entries(cues).map(async ([cue, file]) => {
  const bytes = await readFile(resolve(root, "public", "audio", "nathan-gibson", file));
  return `  ${cue}: "${bytes.toString("base64")}",`;
}));
await writeFile(resolve(root, "src", "audio", "sampleData.ts"), `// Universal UI Soundpack by Nathan Gibson · CC BY 4.0. See public/audio/nathan-gibson/LICENSE.txt.\nexport const sampleData = {\n${entries.join("\n")}\n} as const;\n`);
