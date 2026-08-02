import { Session } from "electron";
import path from "path";
import fs from "fs/promises";
import log from "electron-log";
import Conf from "conf";

import IIntegration from "../integration";
import MemoryStore from "../../memory-store";
import { ExtensionLoadError, LoadedExtension, MemoryStoreSchema, StoreSchema, UserExtension } from "../../../shared/store/schema";

type ExtensionManifest = {
  name?: string;
  version?: string;
  manifest_version?: number;
  default_locale?: string;
};

// Registered before any extension loads so their background pages find the APIs they expect
const shimPreloadPath = path.join(__dirname, "../renderer/windows/extension-shim/shim-preload.js");

export class ExtensionValidationError extends Error {}

/**
 * Loads unpacked Chrome extensions into the YTM view session.
 *
 * Electron only implements a subset of the Chrome extension APIs. chrome.webRequest is supported
 * (which is what Manifest V2 content blockers such as uBlock Origin rely on) but
 * chrome.declarativeNetRequest is not, so Manifest V3 blockers like uBlock Origin Lite will load
 * without ever blocking anything. Packed .crx files are not supported either.
 */
export default class Extensions implements IIntegration {
  private session: Session;
  private store: Conf<StoreSchema>;
  private memoryStore: MemoryStore<MemoryStoreSchema>;
  private isEnabled = false;

  private loaded: LoadedExtension[] = [];
  private errors: ExtensionLoadError[] = [];
  private shimPreloadScriptId: string | null = null;

  public provide(store: Conf<StoreSchema>, memoryStore: MemoryStore<MemoryStoreSchema>, session: Session): void {
    this.store = store;
    this.memoryStore = memoryStore;
    this.session = session;
  }

  public enable(): void {
    this.loadAll().catch(error => {
      log.error("Extensions failed to enable", error);
    });
  }

  public disable(): void {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    for (const extension of this.loaded) {
      this.unload(extension.id);
    }

    if (this.shimPreloadScriptId !== null) {
      this.session.unregisterPreloadScript(this.shimPreloadScriptId);
      this.shimPreloadScriptId = null;
    }

    this.loaded = [];
    this.errors = [];
    this.publishState();

    log.info("Extensions unloaded");
  }

  public getYTMScripts(): { name: string; script: string }[] {
    return [];
  }

  /**
   * Loads every extension configured in the store. Extensions that fail to load are reported
   * through the memory store instead of taking the rest of them down with it.
   */
  public async loadAll(): Promise<void> {
    if (!this.session) return;

    this.isEnabled = true;
    this.errors = [];

    if (this.shimPreloadScriptId === null) {
      this.shimPreloadScriptId = this.session.registerPreloadScript({
        type: "frame",
        filePath: shimPreloadPath
      });
    }

    for (const extension of this.store.get("adblocker").extensions ?? []) {
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

    const extensions = this.store.get("adblocker").extensions ?? [];
    if (extensions.some(existing => existing.path === extension.path)) {
      throw new ExtensionValidationError("This extension has already been added");
    }

    this.store.set("adblocker.extensions", [...extensions, extension]);

    if (this.isEnabled) {
      await this.load(extension.path);
      this.publishState();
    }

    return extension;
  }

  public remove(extensionPath: string): void {
    const extensions = this.store.get("adblocker").extensions ?? [];
    this.store.set(
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

  private async load(extensionPath: string): Promise<void> {
    try {
      await this.readManifest(extensionPath);

      const extension = await this.session.extensions.loadExtension(extensionPath, { allowFileAccess: false });
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
    try {
      this.session.extensions.removeExtension(extensionId);
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
    if (manifest.name.startsWith("__MSG_")) {
      return path.basename(extensionPath);
    }

    return manifest.name;
  }

  private publishState() {
    this.memoryStore.set("extensionsLoaded", this.loaded);
    this.memoryStore.set("extensionsLoadErrors", this.errors);
  }
}
