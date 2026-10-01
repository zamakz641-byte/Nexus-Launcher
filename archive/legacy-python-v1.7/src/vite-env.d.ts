/// <reference types="vite/client" />

declare global {
  interface Window {
    __nexusBootReady?: (options?: { animate?: boolean; status?: string }) => void;
    __nexusBootStatus?: (status: string) => void;
    __nexusBootFail?: (message?: string) => void;
    __nexusBootForceReveal?: () => void;
    __nexusBootAudioStarted?: boolean;
  }
}

export {};
