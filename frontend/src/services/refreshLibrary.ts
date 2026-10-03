import { libraryClient } from './libraryClient';
import { useNexusStore } from '../state/useNexusStore';
import { retryArtwork } from '../utils/imageFallback';

let pending: Promise<void> | null = null;
export function refreshLibrary() {
  if (pending) return pending;
  retryArtwork();
  const state = useNexusStore.getState(); state.beginLibraryScan();
  pending = libraryClient.scan(undefined, true).then(result => {
    state.completeLibraryScan(result.games, result.root, result.roots, result.manualGames, result.scanErrors);
    // Let React install newly discovered artwork before retrying remaining fallbacks.
    requestAnimationFrame(() => retryArtwork());
  }).catch(error => { state.failLibraryScan(error instanceof Error ? error.message : 'library.scanError'); })
    .finally(() => { pending = null; });
  return pending;
}
