import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const directory = resolve(process.argv[2] ?? "artifacts/audio/playnite-open-candidates");
const files = (await readdir(directory)).filter((name) => /\.(ogg|wav)$/i.test(name));
const results = await Promise.all(files.map(async (name) => {
  const data = await readFile(resolve(directory, name));
  let durationMs;
  if (name.toLowerCase().endsWith(".ogg")) {
    const ident = data.indexOf(Buffer.from([1, 118, 111, 114, 98, 105, 115]));
    const lastPage = data.lastIndexOf(Buffer.from("OggS"));
    if (ident < 0 || lastPage < 0) throw new Error(`Invalid Ogg/Vorbis file: ${name}`);
    const sampleRate = data.readUInt32LE(ident + 12);
    const samples = Number(data.readBigUInt64LE(lastPage + 6));
    durationMs = Math.round(samples / sampleRate * 1000);
  } else {
    if (data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WAVE") {
      throw new Error(`Invalid WAV file: ${name}`);
    }
    let byteRate;
    let audioBytes;
    for (let offset = 12; offset + 8 <= data.length;) {
      const type = data.toString("ascii", offset, offset + 4);
      const size = data.readUInt32LE(offset + 4);
      if (type === "fmt ") byteRate = data.readUInt32LE(offset + 8 + 8);
      if (type === "data") audioBytes = size;
      offset += 8 + size + (size % 2);
    }
    if (!byteRate || audioBytes === undefined) throw new Error(`Missing WAV audio data: ${name}`);
    durationMs = Math.round(audioBytes / byteRate * 1000);
  }
  return { name, durationMs, bytes: data.byteLength };
}));
console.log(JSON.stringify(results, null, 2));
