export enum TrayIconStyle {
  Auto = 0,
  White = 1,
  Black = 2
}

export enum AdblockerFilterSet {
  AdsOnly = 0,
  AdsAndTracking = 1,
  Full = 2
}

// An unpacked Chrome extension the user pointed the application at
export type UserExtension = {
  path: string;
  name: string;
  version: string | null;
};

// An extension which is currently loaded into the YTM view session
export type LoadedExtension = {
  id: string;
  name: string;
  version: string;
  path: string;
};

export type ExtensionLoadError = {
  path: string;
  message: string;
};

export type BlockedRequestEntry = {
  url: string;
  resourceType: string;
  filter?: string;
  timestamp: number;
};

export type SponsorBlockSegment = {
  UUID: string;
  segment: [number, number];
  category: string;
  actionType: string;
  videoDuration?: number;
};

export type SleepTimerMode = "off" | "timed" | "end_of_track";

export type SponsorBlockSkipNotice = {
  category: string;
  skippedAt: number;
};

export type StoreSchema = {
  metadata: {
    version: 1;
    appVersion: string;
  };
  general: {
    disableHardwareAcceleration: boolean;
    hideToTrayOnClose: boolean;
    showNotificationOnSongChange: boolean;
    startOnBoot: boolean;
    startMinimized: boolean;
  };
  appearance: {
    alwaysShowVolumeSlider: boolean;
    customCSSEnabled: boolean;
    customCSSPath: string | null;
    inlineCustomCSS: string;
    glassThemeEnabled: boolean;
    ambientGlowEnabled: boolean;
    accentColor: string;
    zoom: number;
    trayIconStyle: TrayIconStyle;
  };
  playback: {
    continueWhereYouLeftOff: boolean;
    continueWhereYouLeftOffPaused: boolean;
    enableSpeakerFill: boolean;
    progressInTaskbar: boolean;
    ratioVolume: boolean;
    equalizerEnabled: boolean;
    equalizerPreset: string;
    equalizerBands: number[];
    loudnessNormalization: boolean;
  };
  integrations: {
    companionServerEnabled: boolean;
    companionServerAuthTokens: string | null; // array[object] | Encrypted for security
    companionServerCORSWildcardEnabled: boolean;
    discordPresenceEnabled: boolean;
    lastFMEnabled: boolean;
    enhancedMediaServiceEnabled: boolean;
  };
  adblocker: {
    blockerEnabled: boolean;
    filterSet: AdblockerFilterSet;
    cosmeticFilteringEnabled: boolean;
    scriptletsEnabled: boolean;
    extensionsEnabled: boolean;
    extensions: UserExtension[];
    totalBlockedLifetime: number;
    lastFilterUpdateAt: number | null;
    customRules: string;
    sponsorBlockEnabled: boolean;
    sponsorBlockCategories: string[];
  };
  shortcuts: {
    playPause: string;
    next: string;
    previous: string;
    thumbsUp: string;
    thumbsDown: string;
    volumeUp: string;
    volumeDown: string;
    volumeMute: string;
    toggleShuffle: string;
    toggleRepeat: string;
  };
  state: {
    lastUrl: string;
    lastPlaylistId: string;
    lastVideoId: string;
    windowBounds: Electron.Rectangle | null;
    windowMaximized: boolean;
    miniplayerWindowBounds: Electron.Rectangle | null;
  };
  lastfm: {
    sessionKey: string | null;
    scrobblePercent: number;
  };
  developer: {
    enableDevTools: boolean;
  };
};

export type MemoryStoreSchema = {
  discordPresenceConnectionFailed: boolean;

  shortcutsPlayPauseRegisterFailed: boolean;
  shortcutsNextRegisterFailed: boolean;
  shortcutsPreviousRegisterFailed: boolean;
  shortcutsThumbsUpRegisterFailed: boolean;
  shortcutsThumbsDownRegisterFailed: boolean;
  shortcutsVolumeUpRegisterFailed: boolean;
  shortcutsVolumeDownRegisterFailed: boolean;
  shortcutsVolumeMuteRegisterFailed: boolean;
  shortcutsToggleShuffleRegisterFailed: boolean;
  shortcutsToggleRepeatRegisterFailed: boolean;

  companionServerAuthWindowEnabled: boolean;

  safeStorageAvailable: boolean;

  autoUpdaterDisabled: boolean;
  autoUpdaterChecking: boolean;
  autoUpdaterNotAvailable: boolean;
  autoUpdaterAvailable: boolean;
  autoUpdaterDownloaded: boolean;
  autoUpdaterErrored: boolean;

  ytmViewLoadTimedout: boolean;
  ytmViewLoading: boolean;
  ytmViewLoadingError: boolean;
  ytmViewLoadingStatus: string;
  ytmViewUnresponsive: boolean;

  appLoadingStatus: string;

  settingsInitialTab: number | null;

  lastFMAuthenticationStep: number;
  lastFMToken: string;

  adblockerReady: boolean;
  adblockerFailed: boolean;
  adblockerBlockedCount: number;
  adblockerRecentBlocked: BlockedRequestEntry[];
  adblockerRefreshing: boolean;
  sleepTimerEndTime: number | null;
  sleepTimerMode: SleepTimerMode;
  sponsorBlockLastSkipped: SponsorBlockSkipNotice | null;
  miniplayerCompactMode: boolean;
  extensionsLoaded: LoadedExtension[];
  extensionsLoadErrors: ExtensionLoadError[];
};
