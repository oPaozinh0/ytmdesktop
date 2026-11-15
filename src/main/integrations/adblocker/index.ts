import { app, ipcMain, Session } from "electron";
import path from "path";
import fs from "fs/promises";
import log from "electron-log";
import { ElectronBlocker, fromElectronDetails } from "@ghostery/adblocker-electron";
import type { IBackgroundCallback } from "@ghostery/adblocker-electron-preload";
import { parse } from "tldts-experimental";

import Integration from "../integration";
import ConfigStore from "../../services/configstore";
import MemoryStore from "../../services/memorystore";
import YTMViewManager from "../../services/ytmviewmanager";
import { AdblockerFilterSet, BlockedRequestEntry, MemoryStoreSchema } from "../../../shared/store/schema";

// These are the ipc channels the adblocker preload script talks to. They're defined by
// @ghostery/adblocker-electron and must match exactly.
const INJECT_COSMETIC_FILTERS_CHANNEL = "@ghostery/adblocker/inject-cosmetic-filters";
const IS_MUTATION_OBSERVER_ENABLED_CHANNEL = "@ghostery/adblocker/is-mutation-observer-enabled";

// Ours, see src/renderer/ytmview/adblocker-scriptlets
const GET_SCRIPTLETS_CHANNEL = "ytmd:adblocker:getScriptlets";

// We register the preload ourselves rather than letting enableBlockingInSession do it. The path the
// library resolves points into node_modules which does not exist in a packaged build.
const preloadPath = path.join(__dirname, "../preload/windows/ytmview-adblocker/adblocker-preload.cjs");

const cacheMaxAge = 3 * 24 * 60 * 60 * 1000;

export default class Adblocker extends Integration {
  public override name = "Adblocker";
  public override storeEnableProperty: Integration["storeEnableProperty"] = "adblocker.blockerEnabled";
  public override dependentStoreProperties: Integration["dependentStoreProperties"] = [
    "adblocker.filterSet",
    "adblocker.cosmeticFilteringEnabled",
    "adblocker.scriptletsEnabled",
    "adblocker.customRules"
  ];

  private blocker: ElectronBlocker | null = null;
  private blockerFilterSet: AdblockerFilterSet | null = null;
  private blockerCosmeticFiltering = false;
  private scriptletsEnabled = false;
  private lastCustomRules: string | null = null;
  private preloadScriptId: string | null = null;
  private attached = false;
  private blockedCount = 0;
  private pendingLifetimeDelta = 0;
  private flushTimer: NodeJS.Timeout | null = null;
  private recentBlocked: BlockedRequestEntry[] = [];

  public override onSetup(): void {
    ipcMain.removeHandler("adblocker:refreshFilters");
    ipcMain.handle("adblocker:refreshFilters", () => this.forceRefresh());
    app.on("will-quit", () => {
      this.flushLifetimeStats();
    });
  }

  public override async onEnabled(): Promise<void> {
    await this.initialize();
  }

  public override onDisabled(): void {
    const configStore = this.getService(ConfigStore);
    const memoryStore = this.getService(MemoryStore<MemoryStoreSchema>);
    const ytmViewManager = this.getService(YTMViewManager);

    this.flushLifetimeStats();
    this.detach(ytmViewManager.getSession(), memoryStore);

    const ytmView = ytmViewManager.getView();
    if (ytmView?.webContents && !ytmView.webContents.isDestroyed() && !configStore.get("adblocker.blockerEnabled")) {
      ytmView.webContents.reload();
    }
  }

  public async forceRefresh(): Promise<boolean> {
    const configStore = this.getService(ConfigStore);
    const memoryStore = this.getService(MemoryStore<MemoryStoreSchema>);
    memoryStore.set("adblockerRefreshing", true);

    try {
      const filterSet = configStore.get("adblocker.filterSet");
      const cachePath = path.join(app.getPath("userData"), "adblocker", `engine-${filterSet}.bin`);
      await fs.rm(cachePath, { force: true });

      this.blocker = null;
      this.blockerFilterSet = null;
      this.lastCustomRules = null;

      if (this.isEnabled) {
        await this.initialize();
      } else {
        await this.buildEngine(filterSet, configStore.get("adblocker.customRules") ?? "");
      }

      return true;
    } catch (error) {
      log.error("Adblocker manual refresh failed", error);
      return false;
    } finally {
      memoryStore.set("adblockerRefreshing", false);
    }
  }

  private flushLifetimeStats(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.pendingLifetimeDelta <= 0) return;

    const configStore = this.getService(ConfigStore);
    const current = configStore.get("adblocker.totalBlockedLifetime") ?? 0;
    configStore.set("adblocker.totalBlockedLifetime", current + this.pendingLifetimeDelta);
    this.pendingLifetimeDelta = 0;
  }

  private recordBlockedRequest(memoryStore: MemoryStore<MemoryStoreSchema>, details: Electron.OnBeforeRequestListenerDetails, filter?: string): void {
    this.blockedCount++;
    this.pendingLifetimeDelta++;

    this.recentBlocked.unshift({
      url: details.url,
      resourceType: details.resourceType,
      filter,
      timestamp: Date.now()
    });
    if (this.recentBlocked.length > 30) {
      this.recentBlocked.length = 30;
    }

    memoryStore.set("adblockerBlockedCount", this.blockedCount);
    memoryStore.set("adblockerRecentBlocked", [...this.recentBlocked]);

    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushLifetimeStats();
      }, 5000);
    }
  }

  /**
   * Builds the filtering engine (from cache when possible) and attaches it to the session. Safe to
   * call multiple times, it will rebuild the engine if the configured filter set changed.
   */
  public async initialize(): Promise<void> {
    const configStore = this.getService(ConfigStore);
    const memoryStore = this.getService(MemoryStore<MemoryStoreSchema>);
    const ytmViewManager = this.getService(YTMViewManager);

    const settings = configStore.get("adblocker");
    const filterSet = settings.filterSet;
    const customRules = settings.customRules ?? "";

    if (
      this.attached &&
      this.blockerFilterSet === filterSet &&
      this.blockerCosmeticFiltering === settings.cosmeticFilteringEnabled &&
      this.scriptletsEnabled === settings.scriptletsEnabled &&
      this.lastCustomRules === customRules
    ) {
      return;
    }

    // Rebuilding means tearing down whatever is currently attached
    if (this.attached) {
      this.detach(ytmViewManager.getSession(), memoryStore);
    }

    memoryStore.set("adblockerFailed", false);

    if (!this.blocker || this.blockerFilterSet !== filterSet || this.lastCustomRules !== customRules) {
      try {
        this.blocker = await this.buildEngine(filterSet, customRules);
        this.blockerFilterSet = filterSet;
        this.lastCustomRules = customRules;
      } catch (error) {
        log.error("Adblocker engine could not be built", error);
        memoryStore.set("adblockerFailed", true);
        memoryStore.set("adblockerReady", false);
        return;
      }
    }

    this.scriptletsEnabled = settings.scriptletsEnabled;
    this.attach(ytmViewManager.getSession(), memoryStore, settings.cosmeticFilteringEnabled);

    const ytmView = ytmViewManager.getView();
    if (ytmView?.webContents && !ytmView.webContents.isDestroyed()) {
      ytmView.webContents.reload();
    }
  }

  // --------------------------------------------------

  private detach(ytmSession: Session, memoryStore: MemoryStore<MemoryStoreSchema>): void {
    if (!this.attached) return;
    this.attached = false;

    this.flushLifetimeStats();

    ytmSession.webRequest.onBeforeRequest(null);
    ytmSession.webRequest.onHeadersReceived(null);

    if (this.preloadScriptId !== null) {
      ytmSession.unregisterPreloadScript(this.preloadScriptId);
      this.preloadScriptId = null;
    }

    ipcMain.removeHandler(INJECT_COSMETIC_FILTERS_CHANNEL);
    ipcMain.removeHandler(IS_MUTATION_OBSERVER_ENABLED_CHANNEL);
    ipcMain.removeListener(GET_SCRIPTLETS_CHANNEL, this.onGetScriptlets);

    this.blockedCount = 0;
    memoryStore.set("adblockerBlockedCount", 0);
    memoryStore.set("adblockerReady", false);

    log.info("Adblocker blocking disabled");
  }

  /**
   * Serves the scriptlets for a page to the preload, which injects them into the main world before
   * the page's own scripts run. This is synchronous on purpose: injecting them any later means
   * they patch APIs YouTube Music has already captured.
   */
  private onGetScriptlets = (event: Electron.IpcMainEvent, url: string) => {
    if (!this.blocker || !this.scriptletsEnabled) {
      event.returnValue = [];
      return;
    }

    const parsed = parse(url);
    const { active, scripts } = this.blocker.getCosmeticsFilters({
      domain: parsed.domain ?? "",
      hostname: parsed.hostname ?? "",
      url,
      getBaseRules: false,
      getInjectionRules: true,
      getExtendedRules: false,
      getRulesFromHostname: true,
      getRulesFromDOM: false
    });

    event.returnValue = active === false ? [] : scripts;
  };

  /**
   * Our own version of ElectronBlocker.onInjectCosmeticFilters. It only handles element hiding —
   * scriptlets are served over GET_SCRIPTLETS_CHANNEL instead, because the library injects them
   * with webContents.executeJavaScript long after the page has started running.
   */
  private onInjectCosmeticFilters = async (event: Electron.IpcMainInvokeEvent, url: string, msg?: IBackgroundCallback) => {
    if (!this.blocker || !this.blockerCosmeticFiltering) return;

    const parsed = parse(url);
    // msg is undefined on the initial call and present for DOM updates
    const isFirstRun = msg === undefined;

    const { active, styles } = this.blocker.getCosmeticsFilters({
      domain: parsed.domain ?? "",
      hostname: parsed.hostname ?? "",
      url,
      classes: msg?.classes,
      hrefs: msg?.hrefs,
      ids: msg?.ids,
      getBaseRules: isFirstRun,
      getInjectionRules: false,
      getExtendedRules: false,
      getRulesFromHostname: isFirstRun,
      getRulesFromDOM: !isFirstRun,
      callerContext: {
        frameId: event.frameId,
        processId: event.processId,
        lifecycle: msg?.lifecycle
      }
    });

    if (active === false) return;

    if (styles.length > 0) {
      event.sender.insertCSS(styles, { cssOrigin: "user" });
    }
  };

  private applyCustomRules(blocker: ElectronBlocker, customRules: string): void {
    const customLines = customRules
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith("!") && !line.startsWith("["));
    if (customLines.length > 0) {
      blocker.updateFromDiff({ added: customLines });
    }
  }

  private async buildEngine(filterSet: AdblockerFilterSet, customRules = ""): Promise<ElectronBlocker> {
    const configStore = this.getService(ConfigStore);
    const cacheDirectory = path.join(app.getPath("userData"), "adblocker");
    await fs.mkdir(cacheDirectory, { recursive: true });

    const cachePath = path.join(cacheDirectory, `engine-${filterSet}.bin`);

    // The library reads its cache unconditionally and only fetches when reading fails, so stale
    // caches have to be dropped by hand or the filter lists would never be updated again
    let cacheStats = await fs.stat(cachePath).catch((): null => null);
    let cacheDropped = false;
    if (cacheStats && Date.now() - cacheStats.mtimeMs > cacheMaxAge) {
      log.info("Adblocker filter lists are out of date, refreshing");
      await fs.rm(cachePath, { force: true });
      cacheStats = null;
      cacheDropped = true;
    }

    const caching = {
      path: cachePath,
      read: (filePath: string) => fs.readFile(filePath),
      write: (filePath: string, buffer: Uint8Array) => fs.writeFile(filePath, buffer)
    };

    const fromPrebuilt = {
      [AdblockerFilterSet.AdsOnly]: ElectronBlocker.fromPrebuiltAdsOnly,
      [AdblockerFilterSet.AdsAndTracking]: ElectronBlocker.fromPrebuiltAdsAndTracking,
      [AdblockerFilterSet.Full]: ElectronBlocker.fromPrebuiltFull
    }[filterSet];

    try {
      const blocker = (await fromPrebuilt.call(ElectronBlocker, fetch, caching)) as ElectronBlocker;
      if (!cacheStats || cacheDropped) {
        configStore.set("adblocker.lastFilterUpdateAt", Date.now());
      } else if (!configStore.get("adblocker.lastFilterUpdateAt")) {
        configStore.set("adblocker.lastFilterUpdateAt", Math.floor(cacheStats.mtimeMs));
      }
      this.applyCustomRules(blocker, customRules);
      log.info(`Adblocker engine loaded (filter set ${filterSet})`);
      return blocker;
    } catch (error) {
      // No network (or Ghostery's CDN is down). Fall back to whatever we cached previously.
      log.warn("Adblocker could not fetch filter lists, falling back to cache", error);

      const cached = await fs.readFile(cachePath).catch((): null => null);
      if (!cached) throw error;

      const blocker = ElectronBlocker.deserialize(cached) as ElectronBlocker;
      this.applyCustomRules(blocker, customRules);
      log.info("Adblocker engine loaded from cache");
      return blocker;
    }
  }

  private attach(ytmSession: Session, memoryStore: MemoryStore<MemoryStoreSchema>, cosmeticFilteringEnabled: boolean) {
    const blocker = this.blocker;
    if (!blocker) return;

    ytmSession.webRequest.onBeforeRequest({ urls: ["<all_urls>"] }, (details, callback) => {
      blocker.onBeforeRequest(details, response => {
        if (response.cancel || response.redirectURL) {
          let filter: string | undefined;
          try {
            const matched = blocker.match(fromElectronDetails(details));
            filter = matched.filter?.toString() ?? (response.redirectURL ? "redirect-rule" : undefined);
          } catch {
            filter = undefined;
          }
          this.recordBlockedRequest(memoryStore, details, filter);
        }
        callback(response);
      });
    });
    ytmSession.webRequest.onHeadersReceived({ urls: ["<all_urls>"] }, (details, callback) => {
      blocker.onHeadersReceived(details, callback);
    });

    this.blockerCosmeticFiltering = cosmeticFilteringEnabled;

    // The preload handles both element hiding and scriptlets and always talks to all three
    // channels, so they're registered together even when only one of the two is turned on
    ipcMain.handle(INJECT_COSMETIC_FILTERS_CHANNEL, this.onInjectCosmeticFilters);
    ipcMain.handle(IS_MUTATION_OBSERVER_ENABLED_CHANNEL, blocker.onIsMutationObserverEnabled);
    ipcMain.on(GET_SCRIPTLETS_CHANNEL, this.onGetScriptlets);

    this.preloadScriptId = ytmSession.registerPreloadScript({
      type: "frame",
      filePath: preloadPath
    });

    this.attached = true;
    memoryStore.set("adblockerReady", true);
    log.info(`Adblocker blocking enabled (cosmetic filtering ${cosmeticFilteringEnabled ? "on" : "off"}, scriptlets ${this.scriptletsEnabled ? "on" : "off"})`);
  }
}
