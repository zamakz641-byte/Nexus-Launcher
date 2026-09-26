import { useNexusStore } from "../state/useNexusStore";

export function useLibraryGames() {
  return useNexusStore((state) => state.discoveredGames);
}
