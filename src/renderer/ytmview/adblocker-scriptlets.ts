// Scriptlet injection for the adblocker integration.
//
// The filter lists' anti-ad scriptlets have to run in the page's main world before YouTube Music's
// own scripts do, otherwise they patch APIs that have already been read (and, injected late, they
// end up fighting the player proxy this app installs). ipcRenderer.sendSync is what keeps this
// ordering: this preload runs at document start, and the page is held until the scriptlets are in.
import { ipcRenderer, webFrame } from "electron";

if (window === window.top) {
  const scripts: string[] = ipcRenderer.sendSync("ytmd:adblocker:getScriptlets", window.location.href) ?? [];

  if (scripts.length > 0) {
    // Every scriptlet carries the same preamble and helper functions and they expect to share one
    // scope, the way uBlock Origin compiles them into a single injected script. Running them as
    // separate global scripts instead makes them redefine each other's helpers and trip over each
    // other's property descriptors, so they go into one wrapper.
    try {
      webFrame.executeJavaScript(`(function(){\n${scripts.join("\n")}\n})();`);
    } catch (error) {
      // A scriptlet blowing up must never take the page down with it
      console.error("Adblocker scriptlets failed to run", error);
    }
  }
}
