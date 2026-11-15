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
    zoom: number;
    trayIconStyle: TrayIconStyle;
  };
  playback: {
    continueWhereYouLeftOff: boolean;
    continueWhereYouLeftOffPaused: boolean;
    enableSpeakerFill: boolean;
    progressInTaskbar: boolean;
    ratioVolume: boolean;
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

  lastFMAuthenticationStep: number;
  lastFMToken: string;

  adblockerReady: boolean;
  adblockerFailed: boolean;
  adblockerBlockedCount: number;
  extensionsLoaded: LoadedExtension[];
  extensionsLoadErrors: ExtensionLoadError[];
};
