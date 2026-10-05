import { useNexusStore } from "../state/useNexusStore";
import type { Game } from "../types";

export interface LaunchResult { ok: true; requestId: string; }
export interface LauncherClient { launchGame(game: Game): Promise<LaunchResult>; }

class LocalLauncherClient implements LauncherClient {
  async launchGame(game: Game): Promise<LaunchResult> {
    if (game.executablePath) {
      if (window.nexusDesktop) {
        return window.nexusDesktop.launchGame(game.id,useNexusStore.getState().locale) as Promise<LaunchResult>;
      }
      const response = await fetch("/api/library/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id }),
      });
      if (!response.ok) throw new Error(`Lancement impossible (${response.status})`);
      return response.json() as Promise<LaunchResult>;
    }
    throw new Error("Aucun exécutable principal n’a été détecté pour ce jeu.");
  }
}

export const launcherClient: LauncherClient = new LocalLauncherClient();
