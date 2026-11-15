import { defineConfig, loadEnv, Plugin } from "vite";

// @ghostery/adblocker-electron resolves the path to its own preload script out of node_modules at
// import time, which throws once the bundle lives inside an asar. We bundle and register that
// preload ourselves (see src/main/integrations/adblocker), so the module is stubbed out here.
const ghosteryPreloadPathId = "\0ytmd:ghostery-preload-path";
const stubGhosteryPreloadPath: Plugin = {
  name: "ytmd-stub-ghostery-preload-path",
  enforce: "pre",
  resolveId(source, importer) {
    if (source === "./preload_path.js" && importer && importer.includes("adblocker-electron")) {
      return ghosteryPreloadPathId;
    }

    return null;
  },
  load(id) {
    if (id === ghosteryPreloadPathId) {
      return "export const PRELOAD_PATH = undefined;";
    }

    return null;
  }
};

// https://vitejs.dev/config
export default defineConfig(config => {
  const env = loadEnv(config.mode, process.cwd(), "");

  return {
    build: {
      outDir: ".vite/main",
      rolldownOptions: {
        external: ["xosms"]
      }
    },
    plugins: [stubGhosteryPreloadPath],
    define: {
      YTMD_UPDATE_FEED_OWNER: JSON.stringify(env.YTMD_UPDATE_FEED_OWNER || "oPaozinh0"),
      YTMD_UPDATE_FEED_REPOSITORY: JSON.stringify(env.YTMD_UPDATE_FEED_REPOSITORY || "ytmdesktop"),
      YTMD_DISABLE_UPDATES: config.mode !== "production" && env.NODE_ENV !== "production",

      LASTFM_API_KEY: JSON.stringify(env.LASTFM_API_KEY || "2a69bcf769a7a28a8bf2f6a5100accad"),
      LASTFM_API_SECRET: JSON.stringify(env.LASTFM_API_SECRET || "46eea23770a459a49eb4d26cbf46b41c")
    }
  };
});
