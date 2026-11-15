import { dialog, ipcMain } from "electron";
import path from "path";
import fs from "fs/promises";
import log from "electron-log";

import Integration from "../integration";
import ConfigStore from "../../services/configstore";
import MemoryStore from "../../services/memorystore";
import AppWindowManager from "../../services/windowmanager";
import YTMViewManager from "../../services/ytmviewmanager";
import { ExtensionLoadError, LoadedExtension, MemoryStoreSchema, UserExtension } from "../../../shared/store/schema";

type ExtensionManifest = {
  name?: string;
  version?: string;
  manifest_version?: number;
  default_locale?: string;
};

// Registered before any extension loads so their background pages find the APIs they expect
const shimPreloadPath = path.join(__dirname, "../preload/windows/extension-shim/shim-preload.cjs");

export class ExtensionValidationError extends Error {}

/**
 * Loads unpacked Chrome extensions into the YTM view session.
 *
 * Electron only implements a subset of the Chrome extension APIs. chrome.webRequest is supported
 * (which is what Manifest V2 content blockers such as uBlock Origin rely on) but
 * chrome.declarativeNetRequest is not, so Manifest V3 blockers like uBlock Origin Lite will load
 * without ever blocking anything. Packed .crx files are not supported either.
 */
export default class Extensions extends Integration {
  public override name = "Extensions";
  public override storeEnableProperty: Integration["storeEnableProperty"] = "adblocker.extensionsEnabled";

  private extensionsActive = false;
  private loaded: LoadedExtension[] = [];
  private errors: ExtensionLoadError[] = [];
  private shimPreloadScriptId: string | null = null;

  public override onSetup(): void {
    ipcMain.handle("extensions:add", async event => {
      const windowManager = this.getService(AppWindowManager);
      const settingsWindow = windowManager.getWindow("Settings");
      if (!settingsWindow || event.sender !== settingsWindow.webContents) {
        return { cancelled: true };
      }

      const result = await dialog.showOpenDialog(settingsWindow._getElectronWindow(), {
        title: "Select an unpacked extension folder",
        properties: ["openDirectory"]
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { cancelled: true };
      }

      try {
        const extension = await this.add(result.filePaths[0]);
        if (this.extensionsActive) {
          this.reloadYTMView();
        }
        return { extension };
      } catch (error) {
        if (error instanceof ExtensionValidationError) {
          return { error: error.message };
        }

        log.error("Failed to add extension", error);
        return { error: "The extension could not be added" };
      }
    });

    ipcMain.handle("extensions:remove", (event, extensionPath: string) => {
      const windowManager = this.getService(AppWindowManager);
      const settingsWindow = windowManager.getWindow("Settings");
      if (!settingsWindow || event.sender !== settingsWindow.webContents) {
        return;
      }

      const wasLoaded = this.loaded.some(extension => extension.path === extensionPath);
      this.remove(extensionPath);
      if (this.extensionsActive && wasLoaded) {
        this.reloadYTMView();
      }
    });
  }

  public override async onEnabled(): Promise<void> {
    await this.loadAll();

    if (this.loaded.length > 0) {
      this.reloadYTMView();
    }
  }

  public override onDisabled(): void {
    if (!this.extensionsActive) return;
    this.extensionsActive = false;

    const configStore = this.getService(ConfigStore);
    const ytmViewManager = this.getService(YTMViewManager);
    const ytmSession = ytmViewManager.getSession();

    const hadLoaded = this.loaded.length > 0;
    for (const extension of this.loaded) {
      this.unload(extension.id);
    }

    if (this.shimPreloadScriptId !== null) {
      ytmSession.unregisterPreloadScript(this.shimPreloadScriptId);
      this.shimPreloadScriptId = null;
    }

    this.loaded = [];
    this.errors = [];
    this.publishState();

    log.info("Extensions unloaded");

    if (hadLoaded && !configStore.get("adblocker.extensionsEnabled")) {
      this.reloadYTMView();
    }
  }

  /**
   * Loads every extension configured in the store. Extensions that fail to load are reported
   * through the memory store instead of taking the rest of them down with it.
   */
  public async loadAll(): Promise<void> {
    const configStore = this.getService(ConfigStore);
    const ytmViewManager = this.getService(YTMViewManager);
    const ytmSession = ytmViewManager.getSession();

    this.extensionsActive = true;
    this.errors = [];

    if (this.shimPreloadScriptId === null) {
      this.shimPreloadScriptId = ytmSession.registerPreloadScript({
        type: "frame",
        filePath: shimPreloadPath
      });
    }

    for (const extension of configStore.get("adblocker").extensions ?? []) {
      if (this.loaded.some(loaded => loaded.path === extension.path)) continue;
      await this.load(extension.path);
    }

    this.publishState();
  }

  /**
   * Reads and validates an unpacked extension directory without loading it. Throws
   * ExtensionValidationError with a user presentable message when the directory isn't usable.
   */
  public async inspect(extensionPath: string): Promise<UserExtension> {
    const manifest = await this.readManifest(extensionPath);

    return {
      path: extensionPath,
      name: this.resolveName(manifest, extensionPath),
      version: manifest.version ?? null
    };
  }

  public async add(extensionPath: string): Promise<UserExtension> {
    const extension = await this.inspect(extensionPath);

    const configStore = this.getService(ConfigStore);
    const extensions = configStore.get("adblocker").extensions ?? [];
    if (extensions.some(existing => existing.path === extension.path)) {
      throw new ExtensionValidationError("This extension has already been added");
    }

    configStore.set("adblocker.extensions", [...extensions, extension]);

    if (this.extensionsActive) {
      await this.load(extension.path);
      this.publishState();
    }

    return extension;
  }

  public remove(extensionPath: string): void {
    const configStore = this.getService(ConfigStore);
    const extensions = configStore.get("adblocker").extensions ?? [];
    configStore.set(
      "adblocker.extensions",
      extensions.filter(existing => existing.path !== extensionPath)
    );

    const loaded = this.loaded.find(extension => extension.path === extensionPath);
    if (loaded) {
      this.unload(loaded.id);
      this.loaded = this.loaded.filter(extension => extension.id !== loaded.id);
    }

    this.errors = this.errors.filter(error => error.path !== extensionPath);
    this.publishState();
  }

  public getLoaded(): LoadedExtension[] {
    return this.loaded;
  }

  // --------------------------------------------------

  private reloadYTMView(): void {
    const ytmView = this.getService(YTMViewManager).getView();
    if (ytmView?.webContents && !ytmView.webContents.isDestroyed()) {
      ytmView.webContents.reload();
    }
  }

  private async load(extensionPath: string): Promise<void> {
    const ytmSession = this.getService(YTMViewManager).getSession();

    try {
      await this.readManifest(extensionPath);

      const extension = await ytmSession.extensions.loadExtension(extensionPath, { allowFileAccess: false });
      this.loaded.push({
        id: extension.id,
        name: extension.name,
        version: extension.version,
        path: extensionPath
      });

      log.info(`Extension loaded: ${extension.name} (${extension.version})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Extension failed to load from ${extensionPath}`, error);
      this.errors.push({ path: extensionPath, message });
    }
  }

  private unload(extensionId: string) {
    const ytmSession = this.getService(YTMViewManager).getSession();

    try {
      ytmSession.extensions.removeExtension(extensionId);
    } catch (error) {
      log.error(`Extension ${extensionId} could not be unloaded`, error);
    }
  }

  private async readManifest(extensionPath: string): Promise<ExtensionManifest> {
    const stats = await fs.stat(extensionPath).catch((): null => null);
    if (!stats || !stats.isDirectory()) {
      throw new ExtensionValidationError("The selected path is not a folder. Packed (.crx) extensions are not supported.");
    }

    const manifestPath = path.join(extensionPath, "manifest.json");
    const raw = await fs.readFile(manifestPath, "utf8").catch((): null => null);
    if (raw === null) {
      throw new ExtensionValidationError("No manifest.json found in the selected folder");
    }

    let manifest: ExtensionManifest;
    try {
      manifest = JSON.parse(raw);
    } catch {
      throw new ExtensionValidationError("The extension's manifest.json is not valid JSON");
    }

    if (!manifest.name || !manifest.version) {
      throw new ExtensionValidationError("The extension's manifest.json is missing a name or version");
    }

    return manifest;
  }

  /**
   * Extensions localise their name through __MSG_name__ placeholders which Electron resolves at
   * load time but we can't before the extension is loaded, so fall back to the folder name.
   */
  private resolveName(manifest: ExtensionManifest, extensionPath: string): string {
    if (!manifest.name || manifest.name.startsWith("__MSG_")) {
      return path.basename(extensionPath);
    }

    return manifest.name;
  }

  private publishState() {
    const memoryStore = this.getService(MemoryStore<MemoryStoreSchema>);
    memoryStore.set("extensionsLoaded", this.loaded);
    memoryStore.set("extensionsLoadErrors", this.errors);
  }
}
