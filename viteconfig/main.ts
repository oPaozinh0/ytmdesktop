import { execSync } from "node:child_process";
import { defineConfig, Plugin } from "vite";

let gitBranch: string = "";
try {
  gitBranch = execSync("git rev-parse --abbrev-ref HEAD").toString();
} catch (e) {
  // User has likely downloaded from the YTM Desktop via the "Download ZIP".
  // We don't plan to support this, but at least provide users with a bit of improved UX
  // by providing them with what to do rather than just leaving them in the dust.
  e.message =
    " ======= Failed to get Git Info. ======= \n" +
    "Please make sure that when building this application you are cloning the repository from GitHub rather than using the Download ZIP option.\n" +
    "Follow the instructions in the README.md file to clone the repository and build the application from there.\n" +
    " ======= Failed to get Git Info. ======= \n\n" +
    e.message;
  // Re-throw the error so that the build fails with the updated message.
  throw e;
}

// HEAD is used for production builds as they check out version tags in a detached HEAD state
const devBuild = gitBranch !== "HEAD" && process.env.NODE_ENV === "development";

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
export default defineConfig({
  build: {
    outDir: ".vite/main",
    rollupOptions: {
      external: ["bufferutil", "utf-8-validate"]
    }
  },
  plugins: [stubGhosteryPreloadPath],
  define: {
    YTMD_DISABLE_UPDATES: devBuild,
    YTMD_UPDATE_FEED_OWNER: process.env.YTMD_UPDATE_FEED_OWNER ? `'${process.env.YTMD_UPDATE_FEED_OWNER}'` : "'ytmdesktop'",
    YTMD_UPDATE_FEED_REPOSITORY: process.env.YTMD_UPDATE_FEED_REPOSITORY ? `'${process.env.YTMD_UPDATE_FEED_REPOSITORY}'` : "'ytmdesktop'"
  }
});
