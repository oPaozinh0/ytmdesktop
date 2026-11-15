import Conf from "conf";
import { app, ipcMain } from "electron";
import log from "electron-log";
import { AdblockerFilterSet, StoreSchema, TrayIconStyle } from "~shared/store/schema";
import { DependencyConstructor } from "~shared/types";
import Service from "../service";
import AppWindowManager from "../windowmanager";

export default class ConfigStore extends Service {
  public static override readonly dependencies: DependencyConstructor<Service>[] = [AppWindowManager];

  private conf!: Conf<StoreSchema>;

  private _initialized = false;
  public get initialized() {
    return this._initialized;
  }

  public override onPreInitialized() {
    this.conf = new Conf<StoreSchema>({
      configName: "config",
      cwd: app.getPath("userData"),
      projectVersion: app.getVersion(),
      watch: true,
      defaults: {
        metadata: {
          version: 1,
          appVersion: app.getVersion()
        },
        general: {
          disableHardwareAcceleration: false,
          hideToTrayOnClose: false,
          showNotificationOnSongChange: false,
          startOnBoot: false,
          startMinimized: false
        },
        appearance: {
          alwaysShowVolumeSlider: false,
          customCSSEnabled: false,
          customCSSPath: null,
          inlineCustomCSS: "",
          glassThemeEnabled: true,
          ambientGlowEnabled: false,
          accentColor: "#ff2e4c",
          zoom: 100,
          trayIconStyle: TrayIconStyle.Auto
        },
        playback: {
          continueWhereYouLeftOff: true,
          continueWhereYouLeftOffPaused: true,
          enableSpeakerFill: false,
          progressInTaskbar: false,
          ratioVolume: false,
          equalizerEnabled: false,
          equalizerPreset: "flat",
          equalizerBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          loudnessNormalization: false
        },
        integrations: {
          companionServerEnabled: false,
          companionServerAuthTokens: null,
          companionServerCORSWildcardEnabled: true,
          discordPresenceEnabled: false,
          lastFMEnabled: false,
          enhancedMediaServiceEnabled: true
        },
        adblocker: {
          blockerEnabled: true,
          filterSet: AdblockerFilterSet.AdsAndTracking,
          cosmeticFilteringEnabled: true,
          scriptletsEnabled: true,
          extensionsEnabled: false,
          extensions: [],
          totalBlockedLifetime: 0,
          lastFilterUpdateAt: null,
          customRules: "",
          sponsorBlockEnabled: true,
          sponsorBlockCategories: ["sponsor", "selfpromo", "interaction", "intro", "outro", "music_offtopic"]
        },
        shortcuts: {
          playPause: "",
          next: "",
          previous: "",
          thumbsUp: "",
          thumbsDown: "",
          volumeUp: "",
          volumeDown: "",
          volumeMute: "",
          toggleShuffle: "",
          toggleRepeat: ""
        },
        state: {
          lastUrl: "https://music.youtube.com/",
          lastPlaylistId: "",
          lastVideoId: "",
          windowBounds: null,
          windowMaximized: false,
          miniplayerWindowBounds: null
        },
        lastfm: {
          sessionKey: null,
          scrobblePercent: 50
        },
        developer: {
          enableDevTools: false
        }
      },
      beforeEachMigration: (store, context) => {
        log.info(`Performing store migration from ${context.fromVersion} to ${context.toVersion}`);
      },
      migrations: {
        ">=2.0.0": store => {
          // @ts-expect-error Removed property which will error in TypeScript
          store.delete("integrations.companionServerAuthWindowEnabled");
          // @ts-expect-error Removed property which will error in TypeScript
          store.delete("state.companionServerAuthWindowEnableTime");
          if (!store.has("appearance.zoom")) {
            store.set("appearance.zoom", 100);
          }
        },
        ">=2.0.1": store => {
          if (!store.has("lastfm.scrobblePercent")) {
            store.set("lastfm.scrobblePercent", 50);
          }
        },
        ">=2.0.7": store => {
          if (!store.has("appearance.trayIconStyle")) {
            store.set("appearance.trayIconStyle", 0);
          }
        },
        ">=2.1.0": store => {
          if (!store.has("shortcuts.volumeMute")) {
            store.set("shortcuts.volumeMute", "");
          }

          if (!store.has("shortcuts.toggleShuffle")) {
            store.set("shortcuts.toggleShuffle", "");
          }

          if (!store.has("shortcuts.toggleRepeat")) {
            store.set("shortcuts.toggleRepeat", "");
          }

          if (!store.has("integrations.enhancedMediaServiceEnabled")) {
            store.set("integrations.enhancedMediaServiceEnabled", true);
          }

          if (!store.has("state.miniplayerWindowBounds")) {
            store.set("state.miniplayerWindowBounds", null);
          }

          if (!store.has("metadata.appVersion")) {
            store.set("metadata.appVersion", "2.0.10");
          }

          // @ts-expect-error Removed store key
          if (store.has("lastfm.api_key")) {
            // @ts-expect-error Removed store key
            store.delete("lastfm.api_key");
          }

          // @ts-expect-error Removed store key
          if (store.has("lastfm.secret")) {
            // @ts-expect-error Removed store key
            store.delete("lastfm.secret");
          }

          // @ts-expect-error Removed store key
          if (store.has("lastfm.token")) {
            // @ts-expect-error Removed store key
            store.delete("lastfm.token");
          }
        },
        ">=2.1.2": store => {
          if (!store.has("shortcuts.volumeMute")) {
            store.set("shortcuts.volumeMute", "");
          }

          if (!store.has("shortcuts.toggleShuffle")) {
            store.set("shortcuts.toggleShuffle", "");
          }

          if (!store.has("shortcuts.toggleRepeat")) {
            store.set("shortcuts.toggleRepeat", "");
          }

          if (!store.has("integrations.enhancedMediaServiceEnabled")) {
            store.set("integrations.enhancedMediaServiceEnabled", true);
          }

          if (!store.has("state.miniplayerWindowBounds")) {
            store.set("state.miniplayerWindowBounds", null);
          }

          if (!store.has("metadata.appVersion")) {
            store.set("metadata.appVersion", "2.1.1");
          }

          if (!store.has("adblocker")) {
            store.set("adblocker", {
              blockerEnabled: true,
              filterSet: AdblockerFilterSet.AdsAndTracking,
              cosmeticFilteringEnabled: true,
              scriptletsEnabled: true,
              extensionsEnabled: false,
              extensions: []
            });
          }

          // @ts-expect-error Removed store key
          if (store.has("lastfm.api_key")) {
            // @ts-expect-error Removed store key
            store.delete("lastfm.api_key");
          }

          // @ts-expect-error Removed store key
          if (store.has("lastfm.secret")) {
            // @ts-expect-error Removed store key
            store.delete("lastfm.secret");
          }

          // @ts-expect-error Removed store key
          if (store.has("lastfm.token")) {
            // @ts-expect-error Removed store key
            store.delete("lastfm.token");
          }
        },
        ">=3.0.0": store => {
          if (!store.has("appearance.inlineCustomCSS")) store.set("appearance.inlineCustomCSS", "");
          if (!store.has("appearance.glassThemeEnabled")) store.set("appearance.glassThemeEnabled", true);
          if (!store.has("appearance.ambientGlowEnabled")) store.set("appearance.ambientGlowEnabled", false);
          if (!store.has("appearance.accentColor")) store.set("appearance.accentColor", "#ff2e4c");
          if (!store.has("playback.equalizerEnabled")) store.set("playback.equalizerEnabled", false);
          if (!store.has("playback.equalizerPreset")) store.set("playback.equalizerPreset", "flat");
          if (!store.has("playback.equalizerBands")) store.set("playback.equalizerBands", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
          if (!store.has("playback.loudnessNormalization")) store.set("playback.loudnessNormalization", false);
          if (!store.has("adblocker.totalBlockedLifetime")) store.set("adblocker.totalBlockedLifetime", 0);
          if (!store.has("adblocker.lastFilterUpdateAt")) store.set("adblocker.lastFilterUpdateAt", null);
          if (!store.has("adblocker.customRules")) store.set("adblocker.customRules", "");
          if (!store.has("adblocker.sponsorBlockEnabled")) store.set("adblocker.sponsorBlockEnabled", true);
          if (!store.has("adblocker.sponsorBlockCategories")) {
            store.set("adblocker.sponsorBlockCategories", ["sponsor", "selfpromo", "interaction", "intro", "outro", "music_offtopic"]);
          }
          store.set("metadata.appVersion", "3.0.0");
        }
      }
    });

    if (this.conf.get("general.disableHardwareAcceleration")) {
      app.disableHardwareAcceleration();
      log.info("Hardware acceleration disabled");
    }
    if (this.conf.get("playback.enableSpeakerFill")) {
      app.commandLine.appendSwitch("try-supported-channel-layouts");
      log.info("Speaker fill enabled");
    }
  }

  public override onInitialized() {
    if (this._initialized) throw new Error("ConfigStore is already initialized!");
    this._initialized = true;

    const windowManager = this.getDependency(AppWindowManager);
    this.conf.onDidAnyChange((newState, oldState) => {
      for (const window of windowManager.getWindows()) {
        window.ipcBroadcast("configStore:stateChanged", newState, oldState);
      }

      this.reconcileConfig(newState, oldState);
    });

    ipcMain.handle("configStore:get", (_event, key) => {
      return this.get(key);
    });

    ipcMain.on("configStore:set", (_event, key, value) => {
      return this.set(key, value);
    });

    log.info("ConfigStore initialized");
  }

  public override onPostInitialized() {}

  public override onTerminated() {}

  public get get() {
    return this.conf.get.bind(this.conf);
  }
  public get set() {
    return this.conf.set.bind(this.conf);
  }
  public get onDidChange() {
    return this.conf.onDidChange.bind(this.conf);
  }
  public get onDidAnyChange() {
    return this.conf.onDidAnyChange.bind(this.conf);
  }

  // TODO: This should probably be moved somewhere else as this isn't the job of the config store
  private reconcileConfig(newState: Readonly<StoreSchema>, _oldState?: Readonly<StoreSchema> | undefined) {
    app.setLoginItemSettings({
      openAtLogin: newState.general.startOnBoot
    });
  }
}
