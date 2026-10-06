import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { configureDesktopRuntime, localLibraryPlugin } from "./backend/libraryRuntime.mjs";
export * from "./backend/libraryRuntime.mjs";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  configureDesktopRuntime({
    libraryRoot: env.NEXUS_GAMES_ROOT || process.env.NEXUS_GAMES_ROOT || "F:\\Games",
    steamGridDbApiKey: env.STEAMGRIDDB_API_KEY || process.env.STEAMGRIDDB_API_KEY || "",
  });
  return {
  build: {
    outDir: "dist/client",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("motion")) return "motion";
          if (id.includes("@phosphor-icons")) return "icons";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("i18next")) return "i18n";
          if (id.includes("react-router") || id.includes("react-dom") || id.includes("react/")) return "react-vendor";
          return undefined;
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "127.0.0.1",
    allowedHosts: ["terminal.local"],
    watch: { ignored: ["**/artifacts/**", "**/release/**"] },
    warmup: {
      clientFiles: ["./src/main.tsx"],
    },
  },
    plugins: [localLibraryPlugin(), react(), tailwindcss()],
  };
});
