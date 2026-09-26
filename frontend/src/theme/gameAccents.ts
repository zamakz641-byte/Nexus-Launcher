import type { GameId } from "../types";

export const gameAccents: Record<GameId, string> = {
  "astra-veil": "#82ccff",
  emberfall: "#ff7a52",
  "nova-tide": "#51e2ef",
  "shattered-echoes": "#d6b7ff",
  "last-frontier": "#e6cb91",
};

const discoveredPalette = ["#72d6ff", "#ff8f70", "#8ee2b0", "#c9a8ff", "#f1cd78"];

export function getGameAccent(id: GameId) {
  if (gameAccents[id]) return gameAccents[id];
  const hash = [...id].reduce((value, character) => ((value << 5) - value + character.charCodeAt(0)) | 0, 0);
  return discoveredPalette[Math.abs(hash) % discoveredPalette.length] ?? "#82ccff";
}
