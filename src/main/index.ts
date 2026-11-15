import { app, clipboard, dialog, ipcMain, Menu, MenuItemConstructorOptions, nativeTheme, powerMonitor, safeStorage, screen, shell, Tray } from "electron";
import crypto from "node:crypto";
import log from "electron-log";
import { getIconPath, v1ConfigMigration } from "./util";
import { AppView } from "./services/windowmanager/appview";
import { YTMViewSetupCompletionFlags, YTMViewSetupCompletionFlagsNames, YTMViewStatus } from "~shared/types";
import Adblocker from "./integrations/adblocker";
import CompanionServer from "./integrations/companion-server";
import CustomCSS from "./integrations/custom-css";
import DiscordPresence from "./integrations/discord-presence";
import Extensions from "./integrations/extensions";
import LastFM from "./integrations/last-fm";
import NowPlayingNotifications from "./integrations/notifications";
import VolumeRatio from "./integrations/volume-ratio";
import EnhancedMediaService from "./integrations/enhanced-media-service";
import path from "node:path";
import electronSquirrelStartup from "electron-squirrel-startup";
import { ServiceHost } from "./services/servicehost";
import WatchDog from "./services/watchdog";
import AutoUpdater from "./services/autoupdater";
import ConfigStore from "./services/configstore";
import IntegrationManager, { IntegrationManagerHook } from "./services/integrationmanager";
import YTMViewManager from "./services/ytmviewmanager";
import ShortcutManager from "./services/shortcutmanager";
import TaskbarManager from "./services/taskbarmanager";
import AppWindowManager from "./services/windowmanager";
import { ServiceCollection } from "./services/servicecollection";
import StateManager from "./services/statemanager";
import MemoryStore from "./services/memorystore";
import { MemoryStoreSchema, SleepTimerMode, SponsorBlockSegment, TrayIconStyle } from "~shared/store/schema";
import ProtocolManager from "./services/protocolmanager";
import PlayerStateStore from "./services/playerstatestore";
import ProtectedAPIManager from "./services/protectedapimanager";
import { VideoState, VideoType } from "~shared/playerstatestore/types";

declare const ALL_WINDOWS_VITE_DEV_SERVER_URL: string;

// Squirrel shortcut creation/removal
// This is part of application installation/uninstallation process close the app immediately
if (electronSquirrelStartup) {
  app.exit();
}

const serviceCollection = new ServiceCollection();
serviceCollection.addServices([
  WatchDog,
  ConfigStore,
  AppWindowManager,
  MemoryStore<MemoryStoreSchema>,
  AutoUpdater,
  StateManager,
  ProtectedAPIManager,
  PlayerStateStore,
  YTMViewManager,
  ShortcutManager,
  TaskbarManager,
  ProtocolManager,
  // This will always go last as it depends on every service since it's an optional system and integrations can perform work with any service
  IntegrationManager
]);
const serviceHost = new ServiceHost(serviceCollection);

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.exit(0);
} else {
  app.on("second-instance", (_, commandLine) => {
    // If the service host isn't initialized the app is still starting up
    if (!serviceHost.initialized) return;

    log.debug("Second instance");

    const windowManager = serviceHost.getService(AppWindowManager);
    if (windowManager.hasWindow("Miniplayer")) {
      log.debug("Closing miniplayer");
      // Main window will automatically show upon closure of the miniplayer
      windowManager.getWindow("Miniplayer").closeWindow();
    } else if (windowManager.hasWindow("Main")) {
      windowManager.getWindow("Main").showAndFocus();
    }

    if (serviceHost.initialized) serviceHost.getService(ProtocolManager).handleYTMDProtocol(commandLine[commandLine.length - 1]);
  });
}

log.info("Application launched");

// Application prerequisites before fully starting
app.enableSandbox();

// appMenu allows for some basic windows management, editMenu allow for copy and paste shortcuts on MacOS
const template: MenuItemConstructorOptions[] = [{ role: "appMenu", label: "YTM Shield" }, { role: "editMenu" }];
const builtMenu = process.platform === "darwin" ? Menu.buildFromTemplate(template) : null; // null for performance https://www.electronjs.org/docs/latest/tutorial/performance#8-call-menusetapplicationmenunull-when-you-do-not-need-a-default-menu
Menu.setApplicationMenu(builtMenu);

// At this stage the next lifecycle is PreInitialized
serviceHost.runNextLifecycle();
const integrationManager = serviceHost.getService(IntegrationManager);
integrationManager.on("enable-error", (integration, error) => {
  const dialogMessage = `The '${integration.name}' integration failed to be enabled and will be unavailable.\n\n` + `${error.stack}`;
  dialog.showMessageBox({
    title: "Integration Error",
    message: "An integration could not be enabled",
    detail: dialogMessage,
    type: "warning",
    buttons: ["Okay"]
  });
});
integrationManager.createIntegrations([Adblocker, Extensions, CompanionServer, DiscordPresence, LastFM, NowPlayingNotifications, VolumeRatio, CustomCSS, EnhancedMediaService]);
integrationManager.runHook(IntegrationManagerHook.AppBeforeReady);

let tray: Tray;
let trayContextMenu: Menu;
app.on("ready", async () => {
  log.info("Application ready");

  // At this stage the next lifecycle is Initialized
  serviceHost.runNextLifecycle();

  const configStore = serviceHost.getService(ConfigStore);
  const memoryStore = serviceHost.getService(MemoryStore<MemoryStoreSchema>);
  const autoUpdater = serviceHost.getService(AutoUpdater);
  const windowManager = serviceHost.getService(AppWindowManager);
  const ytmViewManager = serviceHost.getService(YTMViewManager);
  const stateManager = serviceHost.getService(StateManager);
  const playerStateStore = serviceHost.getService(PlayerStateStore);

  //#region Updater Check
  const updaterWindow = windowManager.createWindow("Browser", {
    name: "Updater",
    autoRecreate: false,
    waitForViews: true,
    url: app.isPackaged ? "ytmd-app://updater" : ALL_WINDOWS_VITE_DEV_SERVER_URL + "/windows/updater/index.html",
    electronOptions: {
      width: 256,
      height: 320,
      minWidth: 256,
      minHeight: 320,
      resizable: false,
      frame: false,
      show: false,
      icon: getIconPath("ytmd.png"),
      titleBarStyle: "hidden",
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        preload: path.join(__dirname, `../preload/windows/updater/preload.cjs`),
        devTools: !app.isPackaged ? true : configStore.get("developer.enableDevTools")
      }
    }
  });
  const autoUpdaterCallbacks = {
    checking: () => updaterWindow.webContents?.send("autoUpdater:checking"),
    available: () => updaterWindow.webContents?.send("autoUpdater:available"),
    notAvailable: () => updaterWindow.webContents?.send("autoUpdater:not-available"),
    downloaded: () => updaterWindow.webContents?.send("autoUpdater:downloaded"),
    error: () => updaterWindow.webContents?.send("autoUpdater:error")
  };
  autoUpdater.once("checking", autoUpdaterCallbacks.checking);
  autoUpdater.once("available", autoUpdaterCallbacks.available);
  autoUpdater.once("not-available", autoUpdaterCallbacks.notAvailable);
  autoUpdater.once("downloaded", autoUpdaterCallbacks.downloaded);
  autoUpdater.once("error", autoUpdaterCallbacks.error);
  if (!autoUpdater.isDisabled() && await autoUpdater.checkForUpdates(true)) {
    autoUpdater.quitAndInstall();
    return;
  } else {
    // Better visual feedback for the updater window when in development mode
    if (!app.isPackaged) {
      await new Promise(resolve => {
        setTimeout(resolve, 1500);
      });
    }
  }
  // Ensure the events are unbinded as we don't need them anymore
  autoUpdater.off("checking", autoUpdaterCallbacks.checking);
  autoUpdater.off("available", autoUpdaterCallbacks.available);
  autoUpdater.off("not-available", autoUpdaterCallbacks.notAvailable);
  autoUpdater.off("downloaded", autoUpdaterCallbacks.downloaded);
  autoUpdater.off("error", autoUpdaterCallbacks.error);
  //#endregion

  // At this stage the next lifecycle is PostInitialized
  serviceHost.runNextLifecycle();

  v1ConfigMigration(serviceHost.getService(ConfigStore));

  //#region safeStorage setup and checks
  if (!await safeStorage.isAsyncEncryptionAvailable()) {
    memoryStore.set("safeStorageAvailable", false);
  } else {
    memoryStore.set("safeStorageAvailable", true);
  }

  ipcMain.handle("safeStorage:decryptString", async (event, value: string) => {
    if (!memoryStore.get("safeStorageAvailable")) throw new Error("safeStorage is unavailable");

    if (value) {
      const decrypt = await safeStorage.decryptStringAsync(Buffer.from(value, "hex"));
      return decrypt.result
    } else {
      return null;
    }
  });

  ipcMain.handle("safeStorage:encryptString", async (event, value: string) => {
    if (!memoryStore.get("safeStorageAvailable")) throw new Error("safeStorage is unavailable");

    const encrypt = await safeStorage.encryptStringAsync(value);
    return encrypt.toString("hex");
  });
  //#endregion

  //#region v3.0 Main Services: SponsorBlock & Sleep Timer
  const sponsorBlockCache = new Map<string, { expiresAt: number; segments: SponsorBlockSegment[] }>();
  const SPONSORBLOCK_TTL_MS = 15 * 60 * 1000;

  ipcMain.handle("sponsorblock:getSegments", async (_event, videoId: string, categories: string[]): Promise<SponsorBlockSegment[]> => {
    if (typeof videoId !== "string" || !/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) return [];
    const safeCategories = Array.isArray(categories) ? categories.filter((c): c is string => typeof c === "string" && c.length > 0) : [];
    if (safeCategories.length === 0) return [];

    const cacheKey = `${videoId}:${[...safeCategories].sort().join(",")}`;
    const cached = sponsorBlockCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.segments;
    }

    try {
      const hashPrefix = crypto.createHash("sha256").update(videoId).digest("hex").slice(0, 4);
      const url = `https://sponsor.ajay.app/api/skipSegments/${hashPrefix}?categories=${encodeURIComponent(JSON.stringify(safeCategories))}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

      if (response.status === 404) {
        sponsorBlockCache.set(cacheKey, { expiresAt: Date.now() + SPONSORBLOCK_TTL_MS, segments: [] });
        return [];
      }
      if (!response.ok) return [];

      const payload = (await response.json()) as Array<{
        videoID?: string;
        segments?: Array<{
          UUID: string;
          segment: [number, number];
          category: string;
          actionType: string;
          videoDuration?: number;
        }>;
      }>;
      const matchedVideo = Array.isArray(payload) ? payload.find(entry => entry.videoID === videoId) : undefined;
      const segments: SponsorBlockSegment[] = Array.isArray(matchedVideo?.segments)
        ? matchedVideo.segments.filter(seg => Array.isArray(seg.segment) && seg.segment.length >= 2)
        : [];

      sponsorBlockCache.set(cacheKey, { expiresAt: Date.now() + SPONSORBLOCK_TTL_MS, segments });
      return segments;
    } catch (error) {
      log.debug("SponsorBlock lookup skipped:", error);
      return [];
    }
  });

  let sleepTimerTimeout: NodeJS.Timeout | null = null;
  let sleepTimerMode: SleepTimerMode = "off";
  let sleepTimerStartVideoId: string | null = null;
  let sleepTimerArmedAt = 0;

  let trayRebuildTimer: NodeJS.Timeout | null = null;
  let scheduleTrayRebuild: () => void = () => {};

  function syncSleepTimerState(mode: SleepTimerMode, endTime: number | null) {
    sleepTimerMode = mode;
    memoryStore.set("sleepTimerMode", mode);
    memoryStore.set("sleepTimerEndTime", endTime);
    scheduleTrayRebuild();
  }

  function clearSleepTimer() {
    if (sleepTimerTimeout) {
      clearTimeout(sleepTimerTimeout);
      sleepTimerTimeout = null;
    }
    sleepTimerStartVideoId = null;
    syncSleepTimerState("off", null);
  }

  function pausePlaybackFromSleepTimer() {
    const state = playerStateStore.getState();
    clearSleepTimer();
    if (state.trackState === VideoState.Playing) {
      const remoteControlApi = serviceHost.getService(ProtectedAPIManager).createOrGetAPI("RemoteControl");
      remoteControlApi.postMessage("execute", "pause");
    }
  }

  function setSleepTimer(option: number | "end_of_track") {
    if (sleepTimerTimeout) {
      clearTimeout(sleepTimerTimeout);
      sleepTimerTimeout = null;
    }

    if (option === "end_of_track") {
      sleepTimerStartVideoId = playerStateStore.getState().videoDetails?.id ?? null;
      sleepTimerArmedAt = Date.now();
      syncSleepTimerState("end_of_track", null);
    } else if (typeof option === "number" && option > 0) {
      const endTime = Date.now() + option * 60_000;
      sleepTimerTimeout = setTimeout(() => {
        pausePlaybackFromSleepTimer();
      }, option * 60_000);
      syncSleepTimerState("timed", endTime);
    } else {
      clearSleepTimer();
    }
  }

  ipcMain.on("sleepTimer:set", (_event, option: number | "end_of_track") => {
    setSleepTimer(option);
  });

  playerStateStore.on("state-changed", state => {
    if (sleepTimerMode === "end_of_track") {
      if (!sleepTimerStartVideoId && state.videoDetails?.id) {
        sleepTimerStartVideoId = state.videoDetails.id;
      } else if (
        sleepTimerStartVideoId &&
        state.videoDetails?.id &&
        state.videoDetails.id !== sleepTimerStartVideoId &&
        Date.now() - sleepTimerArmedAt > 1500
      ) {
        pausePlaybackFromSleepTimer();
      }
    }
  });
  //#endregion

  //#region App IPC
  ipcMain.handle("app:getVersion", () => {
    return app.getVersion();
  });

  ipcMain.on("app:relaunch", () => {
    app.relaunch();
    app.quit();
  });
  //#endregion

  //#region Main Window
  const scaleFactor = screen.getPrimaryDisplay().scaleFactor;
  const windowBounds = configStore.get("state.windowBounds");

  const mainView = new AppView({
    name: "Main",
    url: app.isPackaged ? "ytmd-app://main" : ALL_WINDOWS_VITE_DEV_SERVER_URL + "/windows/main/index.html",
    autoRecreate: true,
    viewState: {
      autoResize: {
        width: true,
        height: true,
        offsetHeight: {
          anchor: "Bottom",
          pixels: 36
        }
      }
    },
    electronOptions: {
      webPreferences: {
        transparent: true,
        sandbox: true,
        contextIsolation: true,
        preload: path.join(__dirname, `../preload/windows/main/preload.cjs`),
        devTools: !app.isPackaged ? true : configStore.get("developer.enableDevTools")
      }
    }
  });
  mainView.ipcOn("ytmView:reload", () => {
    const ytmView = ytmViewManager.getView();
    if (ytmView) {
      ytmView.webContents?.reload();
    }
  });

  const mainWindow = windowManager.createWindow("Browser", {
    name: "Main",
    autoRecreate: false,
    waitForViews: true,
    windowState: {
      maximized: configStore.get("state.windowMaximized")
    },
    views: [mainView],
    url: app.isPackaged ? "ytmd-app://titlebar" : ALL_WINDOWS_VITE_DEV_SERVER_URL + "/windows/titlebar/index.html",
    electronOptions: {
      width: windowBounds?.width ?? 1280 / scaleFactor,
      height: windowBounds?.height ?? 720 / scaleFactor,
      x: windowBounds?.x,
      y: windowBounds?.y,
      minWidth: 156,
      minHeight: 180,
      frame: false,
      show: false,
      icon: getIconPath("ytmd.png"),
      titleBarStyle: "hidden",
      titleBarOverlay: {
        color: "#0b0c10",
        symbolColor: "#f4f4f6",
        height: 36
      },
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        preload: path.join(__dirname, `../preload/windows/titlebar/preload.cjs`),
        devTools: !app.isPackaged ? true : configStore.get("developer.enableDevTools"),
        additionalArguments: ["is-main-window"]
      }
    }
  });

  mainWindow.on("electronwindow-resize", () => {
    stateManager.updateState({
      windowBounds: mainWindow._getElectronWindow().getBounds()
    });
  });
  mainWindow.on("electronwindow-move", () => {
    stateManager.updateState({
      windowBounds: mainWindow._getElectronWindow().getBounds()
    });
  });
  mainWindow.on("electronwindow-maximize", () => {
    stateManager.updateState({
      windowMaximized: true
    });
  });
  mainWindow.on("electronwindow-unmaximize", () => {
    stateManager.updateState({
      windowMaximized: false
    });
  });
  // This event is not called if the app is quitting
  // Do not put critical clean up code here
  mainWindow.on("electronwindow-close", event => {
    stateManager.updateState({
      windowBounds: mainWindow._getElectronWindow().getBounds()
    });
    stateManager.updateState({
      windowMaximized: mainWindow._getElectronWindow().isMaximized()
    });

    if (configStore.get("general.hideToTrayOnClose")) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  function openOrFocusSettings(initialTab?: number) {
    memoryStore.set("settingsInitialTab", typeof initialTab === "number" ? initialTab : null);

    if (windowManager.hasWindow("Settings")) {
      windowManager.getWindow("Settings").showAndFocus();
      return;
    }

    const mainWindowBounds = mainWindow._getElectronWindow().getBounds();
    const settingsWindow = windowManager.createWindow("Browser", {
      name: "Settings",
      autoRecreate: false,
      waitForViews: true,
      url: app.isPackaged ? "ytmd-app://settings" : ALL_WINDOWS_VITE_DEV_SERVER_URL + "/windows/settings/index.html",
      electronOptions: {
        width: 920,
        height: 650,
        minWidth: 780,
        minHeight: 540,
        x: Math.round(mainWindowBounds.x + (mainWindowBounds.width / 2 - 460)),
        y: Math.round(mainWindowBounds.y + (mainWindowBounds.height / 2 - 325)),
        minimizable: false,
        maximizable: false,
        resizable: true,
        frame: false,
        show: false,
        icon: getIconPath("ytmd.png"),
        parent: mainWindow._getElectronWindow(),
        modal: process.platform !== "darwin",
        titleBarStyle: "hidden",
        titleBarOverlay: {
          color: "#0b0c10",
          symbolColor: "#f4f4f6",
          height: 36
        },
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          preload: path.join(__dirname, `../preload/windows/settings/preload.cjs`),
          devTools: !app.isPackaged ? true : configStore.get("developer.enableDevTools")
        }
      }
    });
    settingsWindow.setWindowOpenHandler(details => {
      if (
        details.url === "https://github.com/oPaozinh0/ytmdesktop" ||
        details.url === "https://github.com/oPaozinh0/ytmdesktop/issues" ||
        details.url === "https://github.com/ytmdesktop/ytmdesktop" ||
        details.url === "https://ytmdesktop.github.io/"
      ) {
        shell.openExternal(details.url);
      }

      return {
        action: "deny"
      };
    });
  }

  function openOrFocusMiniplayer() {
    if (windowManager.hasWindow("Miniplayer")) {
      windowManager.getWindow("Miniplayer").showAndFocus();
      return;
    }

    const scaleFactor = screen.getPrimaryDisplay().scaleFactor;
    const windowBounds = configStore.get("state.miniplayerWindowBounds");

    const mainWindowBounds = mainWindow._getElectronWindow().getBounds();
    let miniplayerCompact = false;
    let savedNormalSize: { width: number; height: number } | null = null;
    memoryStore.set("miniplayerCompactMode", false);

    const miniplayerWindow = windowManager.createWindow("Browser", {
      name: "Miniplayer",
      autoRecreate: false,
      waitForViews: true,
      url: app.isPackaged ? "ytmd-app://miniplayer" : ALL_WINDOWS_VITE_DEV_SERVER_URL + "/windows/miniplayer/index.html",
      electronOptions: {
        width: windowBounds?.width ?? 600 / scaleFactor,
        height: windowBounds?.height ?? 400 / scaleFactor,
        minWidth: 280,
        minHeight: 340,
        x: windowBounds?.x ?? Math.round(mainWindowBounds.x + (mainWindowBounds.width / 2 - 400)),
        y: windowBounds?.y ?? Math.round(mainWindowBounds.y + (mainWindowBounds.height / 2 - 300)),
        minimizable: false,
        maximizable: false,
        frame: false,
        show: false,
        icon: getIconPath("ytmd.png"),
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          preload: path.join(__dirname, `../preload/windows/miniplayer/preload.cjs`),
          devTools: !app.isPackaged ? true : configStore.get("developer.enableDevTools")
        }
      }
    });
    // On mac and windows `pop-up-menu` will keep the miniplayer above the dock or taskbar
    miniplayerWindow._getElectronWindow().setAlwaysOnTop(true, "pop-up-menu");
    miniplayerWindow.on("electronwindow-will-resize", () => {
      if (miniplayerCompact) {
        miniplayerWindow.setAspectRatio(0);
        return;
      }
      const playerState = playerStateStore.getState();
      if (playerState.videoDetails?.videoType === VideoType.MusicVideo) {
        miniplayerWindow.setAspectRatio(16 / 9);
      } else if (playerState.videoDetails?.videoType === VideoType.MusicAudio) {
        miniplayerWindow.setAspectRatio(1);
      }
    });
    miniplayerWindow.on("electronwindow-resize", () => {
      if (!miniplayerCompact) {
        stateManager.updateState({
          miniplayerWindowBounds: miniplayerWindow._getElectronWindow().getBounds()
        });
      }
    });
    miniplayerWindow.on("electronwindow-move", () => {
      if (!miniplayerCompact) {
        stateManager.updateState({
          miniplayerWindowBounds: miniplayerWindow._getElectronWindow().getBounds()
        });
      }
    });

    miniplayerWindow.once("electronwindow-close", () => {
      if (!miniplayerCompact) {
        stateManager.updateState({
          miniplayerWindowBounds: miniplayerWindow._getElectronWindow().getBounds()
        });
      }
      memoryStore.set("miniplayerCompactMode", false);
      mainWindow.showAndFocus();
    });

    miniplayerWindow.ipcOn("remoteControl:execute", (event, command: string, ...args: unknown[]) => {
      const remoteControlApi = serviceHost.getService(ProtectedAPIManager).createOrGetAPI("RemoteControl");
      remoteControlApi.postMessage("execute", command, ...args);
    });

    miniplayerWindow.ipcHandle("playerStateStore:getState", () => {
      return playerStateStore.getState();
    });

    miniplayerWindow.ipcOn("miniplayer:setCompactMode", (_event, compact: boolean) => {
      const win = miniplayerWindow._getElectronWindow();
      const bounds = win.getBounds();
      if (compact) {
        if (!miniplayerCompact) {
          savedNormalSize = { width: bounds.width, height: bounds.height };
        }
        miniplayerCompact = true;
        memoryStore.set("miniplayerCompactMode", true);
        win.setAspectRatio(0);
        win.setMinimumSize(360, 96);
        win.setSize(Math.max(400, bounds.width), 98);
      } else {
        miniplayerCompact = false;
        memoryStore.set("miniplayerCompactMode", false);
        win.setMinimumSize(280, 340);
        const targetW = Math.max(320, savedNormalSize?.width ?? bounds.width);
        const targetH = Math.max(380, savedNormalSize?.height ?? 440);
        win.setSize(targetW, targetH);
      }
    });

    mainWindow.hide();
  }

  mainWindow.ipcOn("window:openSettings", (_event, initialTab?: number) => {
    openOrFocusSettings(initialTab);
  });

  mainWindow.ipcOn("window:openMiniplayer", () => {
    openOrFocusMiniplayer();
  });

  mainWindow.ipcHandle("playerStateStore:getState", () => {
    return playerStateStore.getState();
  });

  mainWindow.ipcOn("remoteControl:execute", (_event, command: string, ...args: unknown[]) => {
    const remoteControlApi = serviceHost.getService(ProtectedAPIManager).createOrGetAPI("RemoteControl");
    remoteControlApi.postMessage("execute", command, ...args);
  });

  mainWindow.ipcOn("titlebar:setOverlayOpen", (_event, open: boolean) => {
    const view = ytmViewManager.getView();
    if (!view) return;
    if (open) {
      view.hide(false);
      mainWindow.webContents?.focus();
    } else if (ytmViewManager.status === YTMViewStatus.Ready) {
      view.show(false);
    }
  });

  mainWindow.ipcOn("ytmView:search", (_event, query: string) => {
    const view = ytmViewManager.getView();
    const trimmed = typeof query === "string" ? query.trim() : "";
    if (!view || !trimmed) return;
    view.webContents?.send("ytmView:navigateSearch", trimmed);
  });

  mainWindow.ipcOn("ytmView:navigateDefault", () => {
    const ytmView = ytmViewManager.getView();
    if (ytmView) ytmView.webContents?.loadURL("https://music.youtube.com/");
  });
  mainWindow.ipcOn("ytmView:reload", () => {
    const ytmView = ytmViewManager.getView();
    if (ytmView) {
      ytmView.webContents?.reload();
    }
  });
  mainWindow.ipcOn("ytmView:goBack", () => {
    const ytmView = ytmViewManager.getView();
    if (ytmView?.webContents?.navigationHistory.canGoBack()) {
      ytmView.webContents.navigationHistory.goBack();
    }
  });
  mainWindow.ipcOn("ytmView:goForward", () => {
    const ytmView = ytmViewManager.getView();
    if (ytmView?.webContents?.navigationHistory.canGoForward()) {
      ytmView.webContents.navigationHistory.goForward();
    }
  });
  //#endregion

  // Late updater window closure to prevent Electron from emitting window-all-closed before creating the main window
  updaterWindow.destroyWindow();

  //#region Tray creation
  function trayIconFileName(style: TrayIconStyle) {
    if (process.platform === "win32") return "tray.ico";
    if (process.platform === "darwin") return "trayTemplate.png";

    let color: "white" | "black";
    if (style === TrayIconStyle.White) {
      color = "white";
    } else if (style === TrayIconStyle.Black) {
      color = "black";
    } else {
      color = nativeTheme.shouldUseDarkColors ? "white" : "black";
    }
    return `ytmd_${color}.png`;
  }

  function getTrayIconPath() {
    const style = configStore.get("appearance").trayIconStyle;
    const iconsDir = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), "src/assets/icons");
    return path.join(iconsDir, trayIconFileName(style));
  }

  function setTrayIcon() {
    tray.setImage(getTrayIconPath());
  }

  function truncateTrayText(value: string, max: number): string {
    return value.length > max ? value.slice(0, max - 1) + "…" : value;
  }

  function rebuildTrayMenu() {
    if (!tray) return;

    const state = playerStateStore.getState();
    const blockerEnabled = configStore.get("adblocker.blockerEnabled");
    const blockedCount = Number(memoryStore.get("adblockerBlockedCount") ?? 0);
    const isPlaying = state.trackState === VideoState.Playing;

    let nowPlayingLabel = "YTM Shield — Idle";
    let tooltipText = `YTM Shield • ${blockerEnabled ? `Shield On (${blockedCount} blocked)` : "Shield Paused"}`;
    if (state.videoDetails?.title) {
      const title = truncateTrayText(state.videoDetails.title, 32);
      const author = truncateTrayText(state.videoDetails.author || "", 22);
      const prefix = isPlaying ? "▶" : "⏸";
      nowPlayingLabel = author ? `${prefix} ${title} — ${author}` : `${prefix} ${title}`;
      tooltipText = `YTM Shield • ${isPlaying ? "Playing" : "Paused"}: ${state.videoDetails.title}${state.videoDetails.author ? ` — ${state.videoDetails.author}` : ""} (${blockedCount} blocked)`;
    }

    trayContextMenu = Menu.buildFromTemplate([
      {
        label: nowPlayingLabel,
        type: "normal",
        enabled: false
      },
      {
        type: "separator"
      },
      {
        label: "Show / Hide Window",
        type: "normal",
        click: () => {
          if (windowManager.hasWindow("Miniplayer")) {
            windowManager.getWindow("Miniplayer").closeWindow();
            return;
          }

          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.showAndFocus();
          }
        }
      },
      {
        label: "Open Miniplayer",
        type: "normal",
        click: () => {
          openOrFocusMiniplayer();
        }
      },
      {
        type: "separator"
      },
      {
        label: isPlaying ? "Pause" : "Play",
        type: "normal",
        click: () => {
          const remoteControlApi = serviceHost.getService(ProtectedAPIManager).createOrGetAPI("RemoteControl");
          remoteControlApi.postMessage("execute", "playPause");
        }
      },
      {
        label: "Previous Track",
        type: "normal",
        click: () => {
          const remoteControlApi = serviceHost.getService(ProtectedAPIManager).createOrGetAPI("RemoteControl");
          remoteControlApi.postMessage("execute", "previous");
        }
      },
      {
        label: "Next Track",
        type: "normal",
        click: () => {
          const remoteControlApi = serviceHost.getService(ProtectedAPIManager).createOrGetAPI("RemoteControl");
          remoteControlApi.postMessage("execute", "next");
        }
      },
      {
        type: "separator"
      },
      {
        label: blockerEnabled ? `Ad Shield: Active (${blockedCount} blocked)` : "Ad Shield: Paused",
        type: "checkbox",
        checked: blockerEnabled,
        click: () => {
          configStore.set("adblocker.blockerEnabled", !configStore.get("adblocker.blockerEnabled"));
        }
      },
      {
        label: "Sleep Timer",
        type: "submenu",
        submenu: [
          {
            label: "Off",
            type: "radio",
            checked: sleepTimerMode === "off",
            click: () => setSleepTimer(0)
          },
          {
            label: "15 minutes",
            type: "radio",
            checked: false,
            click: () => setSleepTimer(15)
          },
          {
            label: "30 minutes",
            type: "radio",
            checked: false,
            click: () => setSleepTimer(30)
          },
          {
            label: "45 minutes",
            type: "radio",
            checked: false,
            click: () => setSleepTimer(45)
          },
          {
            label: "60 minutes",
            type: "radio",
            checked: false,
            click: () => setSleepTimer(60)
          },
          {
            label: "End of current track",
            type: "radio",
            checked: sleepTimerMode === "end_of_track",
            click: () => setSleepTimer("end_of_track")
          }
        ]
      },
      {
        type: "separator"
      },
      {
        label: "Settings",
        type: "normal",
        click: () => {
          mainWindow.showAndFocus();
          openOrFocusSettings();
        }
      },
      {
        label: "Quit YTM Shield",
        type: "normal",
        click: () => {
          app.quit();
        }
      }
    ]);
    tray.setToolTip(tooltipText.slice(0, 127));
    tray.setContextMenu(trayContextMenu);
  }

  scheduleTrayRebuild = () => {
    if (trayRebuildTimer) return;
    trayRebuildTimer = setTimeout(() => {
      trayRebuildTimer = null;
      rebuildTrayMenu();
    }, 350);
  };

  tray = new Tray(getTrayIconPath());
  rebuildTrayMenu();
  tray.on("click", () => {
    if (windowManager.hasWindow("Miniplayer")) {
      windowManager.getWindow("Miniplayer").closeWindow();
      return;
    }
    mainWindow.showAndFocus();
  });

  playerStateStore.on("state-changed", () => {
    scheduleTrayRebuild();
  });
  configStore.onDidChange("adblocker.blockerEnabled", () => {
    scheduleTrayRebuild();
  });
  memoryStore.onStateChanged(() => {
    scheduleTrayRebuild();
  });

  nativeTheme.on("updated", setTrayIcon);

  log.info("Created tray icon");
  //#endregion

  // Wait for the main window to be ready
  await mainWindow.ready();

  // Attach events for the ytmviewmanager
  ytmViewManager.on("status-changed", async () => {
    mainView.webContents?.send("ytmView:statusChanged", ytmViewManager.status);
    if (ytmViewManager.status === YTMViewStatus.Ready) {
      await mainView.hide(true);
      if (ytmViewManager.hasError()) {
        const hookError = ytmViewManager.getError();
        const setupFlags = ytmViewManager.getSetupFlags();
        const setupFlagNames = YTMViewSetupCompletionFlagsNames.filter(key => key != "LocationNotApplicable");
        const setFlags = setupFlagNames.filter(key => (setupFlags & YTMViewSetupCompletionFlags[key]) !== 0);
        const unsetFlags = setupFlagNames.filter(key => (setupFlags & YTMViewSetupCompletionFlags[key]) === 0);

        const dialogMessage =
          `Features from YTM Shield may not be present or function correctly\n\nThis usually means there's a bug and a bug report should be filed on the GitHub\n\nHook log:\n${setFlags.map(flag => `    ${flag}... OK\n`).join("")}${unsetFlags.map(flag => `    ${flag}... FAIL\n`).join("")}\n` +
          `${hookError?.stack}`;
        dialog
          .showMessageBox({
            title: "Hook Error",
            message: "YTM Shield could not hook YouTube Music",
            detail: dialogMessage,
            type: "warning",
            buttons: ["Copy to Clipboard and I understand", "I understand"]
          })
          .then(result => {
            if (result.response === 0) {
              clipboard.writeText(`${dialogMessage}`);
            }
          });
      }
    } else {
      await mainView.show(true);
    }
  });
  ytmViewManager.on("view-recreated", async () => {
    await mainView.show(true);
  });
  ytmViewManager.on("unresponsive", async () => {
    await mainView.show(true);
  });
  ytmViewManager.on("responsive", async () => {
    await mainView.hide(true);
  });
  ytmViewManager.on("load-errored", () => {
    mainView.webContents?.send("ytmView:loadError", ytmViewManager.loadError);
  });

  await integrationManager.runHook(IntegrationManagerHook.AppReady);

  // Initially create the YTM view and attach it
  const bindYtmViewKeyboardShortcuts = (view: AppView) => {
    view.webContents?.on("before-input-event", (event, input) => {
      if ((input.control || input.meta) && !input.alt && input.type === "keyDown" && input.key.toLowerCase() === "k") {
        event.preventDefault();
        mainWindow.ipcBroadcast("titlebar:toggleCommandPalette");
      }
    });
  };

  ytmViewManager.createView();
  const ytmView = ytmViewManager.getView();
  if (ytmView) {
    mainWindow.attachView(ytmView, 0);
    bindYtmViewKeyboardShortcuts(ytmView);
  }
  ytmViewManager.on("view-recreated", () => {
    const recreated = ytmViewManager.getView();
    if (recreated) bindYtmViewKeyboardShortcuts(recreated);
  });

  // This hides the main view if it was recreated and the YTMView is in a ready state
  await mainView.on("recreated", async () => {
    await ytmViewManager.ready();
    await mainView.hide(true);
  });

  // Show a changelog popup window if one should be shown
  if (configStore.get("metadata.appVersion") !== app.getVersion()) {
    const mainWindowBounds = mainWindow._getElectronWindow().getBounds();
    const changelogWindow = windowManager.createWindow("Browser", {
      name: "Changelog",
      autoRecreate: false,
      waitForViews: true,
      url: app.isPackaged ? "ytmd-app://changelog" : ALL_WINDOWS_VITE_DEV_SERVER_URL + "/windows/changelog/index.html",
      electronOptions: {
        width: 800,
        height: 600,
        x: Math.round(mainWindowBounds.x + (mainWindowBounds.width / 2 - 400)),
        y: Math.round(mainWindowBounds.y + (mainWindowBounds.height / 2 - 300)),
        minimizable: false,
        maximizable: false,
        frame: false,
        show: false,
        icon: getIconPath("ytmd.png"),
        parent: mainWindow._getElectronWindow(),
        modal: process.platform !== "darwin",
        titleBarStyle: "hidden",
        titleBarOverlay: {
          color: "#0b0c10",
          symbolColor: "#f4f4f6",
          height: 36
        },
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          preload: path.join(__dirname, `../preload/windows/changelog/preload.cjs`),
          devTools: !app.isPackaged ? true : configStore.get("developer.enableDevTools")
        }
      }
    });
    changelogWindow.ipcHandle("changelog:getReleaseMetadata", async () => {
      try {
        const feedUrl = autoUpdater.getFeedUrlNoPlatform();
        // Not all platforms are supported so we just use win32 to grab the notes
        const res = await fetch(`${feedUrl}/win32/${configStore.get("metadata.appVersion")}`);
        if (res.ok && res.status != 204) {
          const json = await res.json();
          return json
        }

        return {
          name: app.getVersion(),
          notes: "# Failed to retrieve changelog"
        }
      } catch(err) {
        log.warn("Failed to retrieve changelog", err);
        return {
          name: app.getVersion(),
          notes: "# Failed to retrieve changelog"
        }
      }
    });
    changelogWindow.setWindowOpenHandler(details => {
      shell.openExternal(details.url);

      return {
        action: "deny"
      };
    });
    changelogWindow.webContents?.on("will-navigate", event => {
      event.preventDefault();
      shell.openExternal(event.url);
    });
    changelogWindow.webContents?.on("will-redirect", event => {
      event.preventDefault();
      shell.openExternal(event.url);
    });
    changelogWindow.on("electronwindow-close", () => {
      configStore.set("metadata.appVersion", app.getVersion());
    });
  }
});

app.on("open-url", (_, url) => {
  if (serviceHost.initialized) serviceHost.getService(ProtocolManager).handleYTMDProtocol(url);
});

// @ts-expect-error powerMonitor doesn't have the correct type here
powerMonitor.on("shutdown", (event: Electron.Event) => {
  event.preventDefault();
  const stateManager = serviceHost.getService(StateManager);
  stateManager.forceWrite();
  app.quit();
});
app.on("before-quit", () => {
  log.debug("Application going to quit");

  const windowManager = serviceHost.getService(AppWindowManager);
  windowManager.forceWindowClosures();
});
app.on("quit", () => {
  log.debug("Application quit");

  // At this stage the next lifecycle is Terminated
  serviceHost.runNextLifecycle();
});
