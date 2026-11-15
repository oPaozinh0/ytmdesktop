<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import KeybindInput from "../../components/KeybindInput.vue";
import ShieldLogo from "../../components/ShieldLogo.vue";
import YTMDSetting from "../../components/YTMDSetting.vue";
import { AdblockerFilterSet, BlockedRequestEntry, ExtensionLoadError, LoadedExtension, StoreSchema, TrayIconStyle, UserExtension } from "~shared/store/schema";
import { AuthToken } from "~shared/integrations/companion-server/types";

declare const YTMD_GIT_COMMIT_HASH: string | undefined;
declare const YTMD_GIT_BRANCH: string | undefined;

const ytmdVersion = await window.ytmd.getAppVersion();
const ytmdCommitHash = YTMD_GIT_COMMIT_HASH?.substring(0, 7);
const ytmdBranch = YTMD_GIT_BRANCH;

const processVersions = window.ytmd.processVersions;

const isDarwin = window.ytmd.isDarwin;
const isLinux = window.ytmd.isLinux;

const store = window.ytmd.store;
const memoryStore = window.ytmd.memoryStore;
const safeStorage = window.ytmd.safeStorage;

const initialRequestedTab = await memoryStore.get("settingsInitialTab");
const currentTab = ref<number>(typeof initialRequestedTab === "number" ? initialRequestedTab : 6);
if (typeof initialRequestedTab === "number") {
  memoryStore.set("settingsInitialTab", null);
}

const searchQuery = ref<string>("");
const requiresRestart = ref(false);
const checkingForUpdate = ref(false);
const updateAvailable = ref(await window.ytmd.isAppUpdateAvailable());
const updateNotAvailable = ref(false);
const updateDownloaded = ref(await window.ytmd.isAppUpdateDownloaded());

const safeStorageAvailable = ref<boolean>(await memoryStore.get("safeStorageAvailable"));

const general: StoreSchema["general"] = await store.get("general");
const appearance: StoreSchema["appearance"] = await store.get("appearance");
const playback: StoreSchema["playback"] = await store.get("playback");
const integrations: StoreSchema["integrations"] = await store.get("integrations");
const adblocker: StoreSchema["adblocker"] = await store.get("adblocker");
const shortcuts: StoreSchema["shortcuts"] = await store.get("shortcuts");
const lastFM: StoreSchema["lastfm"] = await store.get("lastfm");

const disableHardwareAcceleration = ref<boolean>(general.disableHardwareAcceleration);
const hideToTrayOnClose = ref<boolean>(general.hideToTrayOnClose);
const showNotificationOnSongChange = ref<boolean>(general.showNotificationOnSongChange);
const startOnBoot = ref<boolean>(general.startOnBoot);
const startMinimized = ref<boolean>(general.startMinimized);

const alwaysShowVolumeSlider = ref<boolean>(appearance.alwaysShowVolumeSlider);
const customCSSEnabled = ref<boolean>(appearance.customCSSEnabled);
const customCSSPath = ref<string>(appearance.customCSSPath);
const inlineCustomCSS = ref<string>(appearance.inlineCustomCSS ?? "");
const glassThemeEnabled = ref<boolean>(appearance.glassThemeEnabled ?? true);
const ambientGlowEnabled = ref<boolean>(appearance.ambientGlowEnabled ?? false);
const accentColor = ref<string>(appearance.accentColor ?? "#ff2e4c");
const zoom = ref<number>(appearance.zoom);
const trayIconStyle = ref<number>(appearance.trayIconStyle);

const continueWhereYouLeftOff = ref<boolean>(playback.continueWhereYouLeftOff);
const continueWhereYouLeftOffPaused = ref<boolean>(playback.continueWhereYouLeftOffPaused);
const enableSpeakerFill = ref<boolean>(playback.enableSpeakerFill);
const progressInTaskbar = ref<boolean>(playback.progressInTaskbar);
const ratioVolume = ref<boolean>(playback.ratioVolume);
const equalizerEnabled = ref<boolean>(playback.equalizerEnabled ?? false);
const equalizerPreset = ref<string>(playback.equalizerPreset ?? "flat");
const equalizerBands = ref<number[]>(Array.isArray(playback.equalizerBands) ? [...playback.equalizerBands] : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const loudnessNormalization = ref<boolean>(playback.loudnessNormalization ?? false);

const companionServerEnabled = ref<boolean>(integrations.companionServerEnabled);
const companionServerAuthTokens = ref<AuthToken[]>(
  safeStorageAvailable.value ? (JSON.parse(await safeStorage.decryptString(integrations.companionServerAuthTokens)) ?? []) : []
);
const companionServerCORSWildcardEnabled = ref<boolean>(integrations.companionServerCORSWildcardEnabled);
const discordPresenceEnabled = ref<boolean>(integrations.discordPresenceEnabled);
const lastFMEnabled = ref<boolean>(integrations.lastFMEnabled);
const enhancedMediaServiceEnabled = ref<boolean>(integrations.enhancedMediaServiceEnabled);

const adblockerEnabled = ref<boolean>(adblocker.blockerEnabled);
const adblockerFilterSet = ref<number>(adblocker.filterSet);
const adblockerCosmeticFilteringEnabled = ref<boolean>(adblocker.cosmeticFilteringEnabled);
const adblockerScriptletsEnabled = ref<boolean>(adblocker.scriptletsEnabled);
const adblockerTotalBlockedLifetime = ref<number>(adblocker.totalBlockedLifetime ?? 0);
const adblockerLastFilterUpdateAt = ref<number | null>(adblocker.lastFilterUpdateAt ?? null);
const adblockerCustomRules = ref<string>(adblocker.customRules ?? "");
const sponsorBlockEnabled = ref<boolean>(adblocker.sponsorBlockEnabled ?? true);
const sponsorBlockCategories = ref<string[]>(Array.isArray(adblocker.sponsorBlockCategories) ? [...adblocker.sponsorBlockCategories] : ["sponsor", "selfpromo", "interaction", "intro", "outro", "music_offtopic"]);
const extensionsEnabled = ref<boolean>(adblocker.extensionsEnabled);
const userExtensions = ref<UserExtension[]>(adblocker.extensions ?? []);
const extensionAddError = ref<string | null>(null);

const shortcutPlayPause = ref<string>(shortcuts.playPause);
const shortcutNext = ref<string>(shortcuts.next);
const shortcutPrevious = ref<string>(shortcuts.previous);
const shortcutThumbsUp = ref<string>(shortcuts.thumbsUp);
const shortcutThumbsDown = ref<string>(shortcuts.thumbsDown);
const shortcutVolumeUp = ref<string>(shortcuts.volumeUp);
const shortcutVolumeDown = ref<string>(shortcuts.volumeDown);
const shortcutVolumeMute = ref<string>(shortcuts.volumeMute);
const shortcutToggleShuffle = ref<string>(shortcuts.toggleShuffle);
const shortcutToggleRepeat = ref<string>(shortcuts.toggleRepeat);

const lastFMSessionKey = ref<string>(lastFM.sessionKey);
const scrobblePercent = ref<number>(lastFM.scrobblePercent);

store.onDidAnyChange(async newState => {
  disableHardwareAcceleration.value = newState.general.disableHardwareAcceleration;
  hideToTrayOnClose.value = newState.general.hideToTrayOnClose;
  showNotificationOnSongChange.value = newState.general.showNotificationOnSongChange;
  startOnBoot.value = newState.general.startOnBoot;
  startMinimized.value = newState.general.startMinimized;

  alwaysShowVolumeSlider.value = newState.appearance.alwaysShowVolumeSlider;
  customCSSEnabled.value = newState.appearance.customCSSEnabled;
  customCSSPath.value = newState.appearance.customCSSPath;
  inlineCustomCSS.value = newState.appearance.inlineCustomCSS ?? "";
  glassThemeEnabled.value = newState.appearance.glassThemeEnabled ?? true;
  ambientGlowEnabled.value = newState.appearance.ambientGlowEnabled ?? false;
  accentColor.value = newState.appearance.accentColor ?? "#ff2e4c";
  zoom.value = newState.appearance.zoom;
  trayIconStyle.value = newState.appearance.trayIconStyle;

  continueWhereYouLeftOff.value = newState.playback.continueWhereYouLeftOff;
  continueWhereYouLeftOffPaused.value = newState.playback.continueWhereYouLeftOffPaused;
  enableSpeakerFill.value = newState.playback.enableSpeakerFill;
  progressInTaskbar.value = newState.playback.progressInTaskbar;
  ratioVolume.value = newState.playback.ratioVolume;
  equalizerEnabled.value = newState.playback.equalizerEnabled ?? false;
  equalizerPreset.value = newState.playback.equalizerPreset ?? "flat";
  equalizerBands.value = Array.isArray(newState.playback.equalizerBands) ? [...newState.playback.equalizerBands] : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  loudnessNormalization.value = newState.playback.loudnessNormalization ?? false;

  companionServerEnabled.value = newState.integrations.companionServerEnabled;
  companionServerAuthTokens.value = safeStorageAvailable.value
    ? (JSON.parse(await safeStorage.decryptString(newState.integrations.companionServerAuthTokens)) ?? [])
    : [];
  companionServerCORSWildcardEnabled.value = newState.integrations.companionServerCORSWildcardEnabled;
  discordPresenceEnabled.value = newState.integrations.discordPresenceEnabled;
  lastFMEnabled.value = newState.integrations.lastFMEnabled;
  lastFMSessionKey.value = newState.lastfm.sessionKey;
  scrobblePercent.value = newState.lastfm.scrobblePercent;
  enhancedMediaServiceEnabled.value = newState.integrations.enhancedMediaServiceEnabled;

  adblockerEnabled.value = newState.adblocker.blockerEnabled;
  adblockerFilterSet.value = newState.adblocker.filterSet;
  adblockerCosmeticFilteringEnabled.value = newState.adblocker.cosmeticFilteringEnabled;
  adblockerScriptletsEnabled.value = newState.adblocker.scriptletsEnabled;
  adblockerTotalBlockedLifetime.value = newState.adblocker.totalBlockedLifetime ?? 0;
  adblockerLastFilterUpdateAt.value = newState.adblocker.lastFilterUpdateAt ?? null;
  adblockerCustomRules.value = newState.adblocker.customRules ?? "";
  sponsorBlockEnabled.value = newState.adblocker.sponsorBlockEnabled ?? true;
  sponsorBlockCategories.value = Array.isArray(newState.adblocker.sponsorBlockCategories) ? [...newState.adblocker.sponsorBlockCategories] : [];
  extensionsEnabled.value = newState.adblocker.extensionsEnabled;
  userExtensions.value = newState.adblocker.extensions ?? [];

  shortcutPlayPause.value = newState.shortcuts.playPause;
  shortcutNext.value = newState.shortcuts.next;
  shortcutPrevious.value = newState.shortcuts.previous;
  shortcutThumbsUp.value = newState.shortcuts.thumbsUp;
  shortcutThumbsDown.value = newState.shortcuts.thumbsDown;
  shortcutVolumeUp.value = newState.shortcuts.volumeUp;
  shortcutVolumeDown.value = newState.shortcuts.volumeDown;
  shortcutVolumeMute.value = newState.shortcuts.volumeMute;
  shortcutToggleShuffle.value = newState.shortcuts.toggleShuffle;
  shortcutToggleRepeat.value = newState.shortcuts.toggleRepeat;
});

const discordPresenceConnectionFailed = ref<boolean>(await memoryStore.get("discordPresenceConnectionFailed"));

const shortcutsPlayPauseRegisterFailed = ref<boolean>(await memoryStore.get("shortcutsPlayPauseRegisterFailed"));
const shortcutsNextRegisterFailed = ref<boolean>(await memoryStore.get("shortcutsNextRegisterFailed"));
const shortcutsPreviousRegisterFailed = ref<boolean>(await memoryStore.get("shortcutsPreviousRegisterFailed"));
const shortcutsThumbsUpRegisterFailed = ref<boolean>(await memoryStore.get("shortcutsThumbsUpRegisterFailed"));
const shortcutsThumbsDownRegisterFailed = ref<boolean>(await memoryStore.get("shortcutsThumbsDownRegisterFailed"));
const shortcutsVolumeUpRegisterFailed = ref<boolean>(await memoryStore.get("shortcutsVolumeUpRegisterFailed"));
const shortcutsVolumeDownRegisterFailed = ref<boolean>(await memoryStore.get("shortcutsVolumeDownRegisterFailed"));
const shortcutsVolumeMuteRegisterFailed = ref<boolean>(await memoryStore.get("shortcutsVolumeMuteRegisterFailed"));
const shortcutsToggleShuffleRegisterFailed = ref<boolean>(await memoryStore.get("shortcutsToggleShuffleRegisterFailed"));
const shortcutsToggleRepeatRegisterFailed = ref<boolean>(await memoryStore.get("shortcutsToggleRepeatRegisterFailed"));

const companionServerAuthWindowEnabled = ref<boolean>(await memoryStore.get("companionServerAuthWindowEnabled"));

const autoUpdaterDisabled = ref<boolean>(await memoryStore.get("autoUpdaterDisabled"));

const lastFMAuthenticationStep = ref<number>(await memoryStore.get("lastFMAuthenticationStep"));

const adblockerReady = ref<boolean>(await memoryStore.get("adblockerReady"));
const adblockerFailed = ref<boolean>(await memoryStore.get("adblockerFailed"));
const adblockerBlockedCount = ref<number>((await memoryStore.get("adblockerBlockedCount")) ?? 0);
const adblockerRecentBlocked = ref<BlockedRequestEntry[]>((await memoryStore.get("adblockerRecentBlocked")) ?? []);
const adblockerRefreshing = ref<boolean>((await memoryStore.get("adblockerRefreshing")) ?? false);
const showBlockedLog = ref(false);
const customRulesSavedNote = ref(false);
const extensionsLoaded = ref<LoadedExtension[]>((await memoryStore.get("extensionsLoaded")) ?? []);
const extensionsLoadErrors = ref<ExtensionLoadError[]>((await memoryStore.get("extensionsLoadErrors")) ?? []);

memoryStore.onStateChanged(newState => {
  if (typeof newState.settingsInitialTab === "number") {
    currentTab.value = newState.settingsInitialTab;
    searchQuery.value = "";
    memoryStore.set("settingsInitialTab", null);
  }

  discordPresenceConnectionFailed.value = newState.discordPresenceConnectionFailed;

  shortcutsPlayPauseRegisterFailed.value = newState.shortcutsPlayPauseRegisterFailed;
  shortcutsNextRegisterFailed.value = newState.shortcutsNextRegisterFailed;
  shortcutsPreviousRegisterFailed.value = newState.shortcutsPreviousRegisterFailed;
  shortcutsThumbsUpRegisterFailed.value = newState.shortcutsThumbsUpRegisterFailed;
  shortcutsThumbsDownRegisterFailed.value = newState.shortcutsThumbsDownRegisterFailed;
  shortcutsVolumeUpRegisterFailed.value = newState.shortcutsVolumeUpRegisterFailed;
  shortcutsVolumeDownRegisterFailed.value = newState.shortcutsVolumeDownRegisterFailed;
  shortcutsVolumeMuteRegisterFailed.value = newState.shortcutsVolumeMuteRegisterFailed;
  shortcutsToggleShuffleRegisterFailed.value = newState.shortcutsToggleShuffleRegisterFailed;
  shortcutsToggleRepeatRegisterFailed.value = newState.shortcutsToggleRepeatRegisterFailed;

  companionServerAuthWindowEnabled.value = newState.companionServerAuthWindowEnabled;

  safeStorageAvailable.value = newState.safeStorageAvailable;

  autoUpdaterDisabled.value = newState.autoUpdaterDisabled;
  checkingForUpdate.value = newState.autoUpdaterChecking;
  updateAvailable.value = newState.autoUpdaterAvailable;
  updateNotAvailable.value = newState.autoUpdaterNotAvailable;
  updateDownloaded.value = newState.autoUpdaterDownloaded;

  lastFMAuthenticationStep.value = newState.lastFMAuthenticationStep;

  adblockerReady.value = newState.adblockerReady;
  adblockerFailed.value = newState.adblockerFailed;
  adblockerBlockedCount.value = newState.adblockerBlockedCount ?? 0;
  adblockerRecentBlocked.value = newState.adblockerRecentBlocked ?? [];
  adblockerRefreshing.value = newState.adblockerRefreshing ?? false;
  extensionsLoaded.value = newState.extensionsLoaded ?? [];
  extensionsLoadErrors.value = newState.extensionsLoadErrors ?? [];
});

const EQ_BAND_LABELS = ["32Hz", "64Hz", "125Hz", "250Hz", "500Hz", "1kHz", "2kHz", "4kHz", "8kHz", "16kHz"];
const EQ_PRESETS: Record<string, { label: string; bands: number[] }> = {
  flat: { label: "Flat", bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  bass_boost: { label: "Bass Boost", bands: [6, 5, 4, 2, 1, 0, 0, 0, 1, 1] },
  rock_metal: { label: "Rock / Metal", bands: [4, 3, 1, -1, -2, 0, 2, 3, 4, 4] },
  electronic: { label: "Electronic", bands: [5, 4, 2, 0, -2, 1, 2, 3, 4, 5] },
  vocal: { label: "Vocal Clarity", bands: [-2, -2, 0, 2, 4, 4, 3, 1, 0, -1] },
  acoustic: { label: "Acoustic", bands: [3, 2, 1, 1, 2, 1, 2, 3, 3, 2] },
  custom: { label: "Custom", bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
};

const ACCENT_SWATCHES = [
  { name: "Crimson Shield", hex: "#ff2e4c" },
  { name: "Electric Violet", hex: "#7c5cff" },
  { name: "Cyan Pulse", hex: "#00d2ff" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Amber Gold", hex: "#f59e0b" },
  { name: "Rose", hex: "#f43f5e" }
];

const SPONSORBLOCK_CATEGORY_LABELS: Array<{ id: string; label: string }> = [
  { id: "sponsor", label: "Sponsor" },
  { id: "selfpromo", label: "Self-Promo" },
  { id: "interaction", label: "Interaction" },
  { id: "intro", label: "Intro" },
  { id: "outro", label: "Outro" },
  { id: "preview", label: "Preview" },
  { id: "music_offtopic", label: "Non-Music Section" }
];

const CSS_SNIPPETS: Array<{ label: string; css: string }> = [
  {
    label: "Compact Sidebar",
    css: "ytmusic-guide-renderer { width: 180px !important; }"
  },
  {
    label: "Rounded Album Art",
    css: "#song-image img, ytmusic-player #thumbnail img { border-radius: 16px !important; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55) !important; }"
  },
  {
    label: "Accent Player Bar Glow",
    css: "ytmusic-player-bar { border-top: 1px solid rgba(var(--ytmd-accent-rgb), 0.35) !important; }"
  }
];

function hexToRgbString(hex: string): string {
  const cleaned = (hex || "").trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return "255, 46, 76";
}

const settingsAccentStyle = computed(() => {
  const rgb = hexToRgbString(accentColor.value);
  return {
    "--accent-primary": accentColor.value,
    "--accent-hover": accentColor.value,
    "--accent-soft": `rgba(${rgb}, 0.16)`,
    "--accent-glow": `rgba(${rgb}, 0.36)`
  };
});

const formattedFilterUpdatedAt = computed(() => {
  if (!adblockerLastFilterUpdateAt.value) return "Cached";
  return new Date(adblockerLastFilterUpdateAt.value).toLocaleString();
});

async function refreshFilterListsNow() {
  if (adblockerRefreshing.value) return;
  await window.ytmd.adblocker.refreshFilters();
}

function toggleSponsorBlockCategory(categoryId: string) {
  const idx = sponsorBlockCategories.value.indexOf(categoryId);
  if (idx >= 0) {
    sponsorBlockCategories.value.splice(idx, 1);
  } else {
    sponsorBlockCategories.value.push(categoryId);
  }
  store.set("adblocker.sponsorBlockCategories", [...sponsorBlockCategories.value]);
}

function applyCustomRules() {
  store.set("adblocker.customRules", adblockerCustomRules.value);
  customRulesSavedNote.value = true;
  setTimeout(() => {
    customRulesSavedNote.value = false;
  }, 2000);
}

function selectAccentColor(hex: string) {
  accentColor.value = hex;
  store.set("appearance.accentColor", hex);
}

function updateInlineCustomCSS() {
  store.set("appearance.inlineCustomCSS", inlineCustomCSS.value);
}

function applyCssSnippet(snippetCss: string) {
  const current = inlineCustomCSS.value.trim();
  inlineCustomCSS.value = current ? `${current}\n${snippetCss}` : snippetCss;
  customCSSEnabled.value = true;
  store.set("appearance.customCSSEnabled", true);
  store.set("appearance.inlineCustomCSS", inlineCustomCSS.value);
}

function selectEqPreset() {
  if (equalizerPreset.value !== "custom" && EQ_PRESETS[equalizerPreset.value]) {
    equalizerBands.value = [...EQ_PRESETS[equalizerPreset.value].bands];
    store.set("playback.equalizerBands", [...equalizerBands.value]);
  }
  store.set("playback.equalizerPreset", equalizerPreset.value);
}

function updateEqBand(index: number, event: Event) {
  const val = Number((event.target as HTMLInputElement).value);
  equalizerBands.value[index] = val;
  equalizerPreset.value = "custom";
  store.set("playback.equalizerPreset", "custom");
  store.set("playback.equalizerBands", [...equalizerBands.value]);
}

function resetEqBands() {
  equalizerPreset.value = "flat";
  equalizerBands.value = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  store.set("playback.equalizerPreset", "flat");
  store.set("playback.equalizerBands", [...equalizerBands.value]);
}

type SearchEntry = {
  tab: number;
  tabLabel: string;
  title: string;
  description: string;
};

const searchableSettings: SearchEntry[] = [
  { tab: 6, tabLabel: "Ad Shield", title: "Built-in ad blocker", description: "Block audio, video, and banner ads with EasyList & uBlock lists" },
  { tab: 6, tabLabel: "Ad Shield", title: "Filter lists", description: "Choose between Ads only, Ads and trackers, or Full protection" },
  { tab: 6, tabLabel: "Ad Shield", title: "Cosmetic filtering", description: "Hide empty ad containers inside YouTube Music" },
  { tab: 6, tabLabel: "Ad Shield", title: "Scriptlet injection", description: "Anti-ad scripts to stop in-stream ads between songs" },
  { tab: 6, tabLabel: "Ad Shield", title: "SponsorBlock skipping", description: "Automatically skip sponsor, intro, outro, and non-music segments" },
  { tab: 6, tabLabel: "Ad Shield", title: "Custom filter rules & allowlist", description: "Add custom ABP/uBO rules and inspect recently blocked requests" },
  { tab: 6, tabLabel: "Ad Shield", title: "Browser extensions", description: "Load unpacked Chrome Manifest V2 extensions such as uBlock Origin" },
  { tab: 1, tabLabel: "General", title: "Hide to tray on close", description: "Keep playback alive in the system tray when closing the window" },
  { tab: 1, tabLabel: "General", title: "Show notification on song change", description: "Desktop notifications when a track changes" },
  { tab: 1, tabLabel: "General", title: "Start on boot", description: "Launch YTM Shield automatically with your OS" },
  { tab: 1, tabLabel: "General", title: "Disable hardware acceleration", description: "Useful if experiencing GPU flickering (requires restart)" },
  { tab: 2, tabLabel: "Appearance", title: "YTM Shield Glass theme & ambient glow", description: "Frosted glass navigation, player bar, and dynamic glow inside YouTube Music" },
  { tab: 2, tabLabel: "Appearance", title: "Accent color", description: "Customize brand highlight color across TitleBar, Miniplayer, Settings, and YTM" },
  { tab: 2, tabLabel: "Appearance", title: "Always show volume slider", description: "Keep the volume slider visible on legacy player bars" },
  { tab: 2, tabLabel: "Appearance", title: "Live Custom CSS editor & snippets", description: "Write instant live-reloading CSS or use 1-click YTM visual tweaks" },
  { tab: 2, tabLabel: "Appearance", title: "Zoom", description: "Scale interface zoom from 30% to 300%" },
  { tab: 2, tabLabel: "Appearance", title: "Tray icon style", description: "Choose Auto, White, or Black tray icon on Linux" },
  { tab: 3, tabLabel: "Playback", title: "10-Band Audio Equalizer", description: "Graphic equalizer with presets from 32Hz to 16kHz" },
  { tab: 3, tabLabel: "Playback", title: "Loudness Normalization", description: "Dynamic compressor to balance volume across quiet and loud tracks" },
  { tab: 3, tabLabel: "Playback", title: "Continue where you left off", description: "Resume previous song or playlist automatically on launch" },
  { tab: 3, tabLabel: "Playback", title: "Pause on application launch", description: "Restore queue in paused state" },
  { tab: 3, tabLabel: "Playback", title: "Show track progress on taskbar", description: "Display playback progress bar in the OS taskbar" },
  { tab: 3, tabLabel: "Playback", title: "Enable speaker fill", description: "Upmix stereo audio for multi-channel setups" },
  { tab: 3, tabLabel: "Playback", title: "Ratio volume", description: "Use logarithmic/ratio scaling for volume control" },
  { tab: 4, tabLabel: "Integrations", title: "Companion server", description: "Local WebSocket/REST API for remote companion apps" },
  { tab: 4, tabLabel: "Integrations", title: "Discord rich presence", description: "Show listening status in Discord profile" },
  { tab: 4, tabLabel: "Integrations", title: "Last.fm scrobbling", description: "Scrobble tracks and configure scrobble threshold percentage" },
  { tab: 4, tabLabel: "Integrations", title: "Enhanced media service", description: "Advanced OS media keys & transport integration (Beta)" },
  { tab: 5, tabLabel: "Shortcuts", title: "Global keyboard shortcuts", description: "Play/Pause, Next, Previous, Thumbs Up/Down, Volume, Shuffle, Repeat" },
  { tab: 99, tabLabel: "About", title: "About & updates", description: "Version details, commits, GitHub repository, and update checker" }
];

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return [];
  return searchableSettings.filter(
    item =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.tabLabel.toLowerCase().includes(q)
  );
});

const activeTabMeta = computed(() => {
  switch (currentTab.value) {
    case 6:
      return { title: "Ad Shield", subtitle: "Engine blocking, filter rules, and Manifest V2 Chrome extensions" };
    case 1:
      return { title: "General", subtitle: "Application startup, tray behavior, and hardware preferences" };
    case 2:
      return { title: "Appearance", subtitle: "Custom styles, page zoom, and player visual tweaks" };
    case 3:
      return { title: "Playback", subtitle: "Session resume, audio output, and taskbar integration" };
    case 4:
      return { title: "Integrations", subtitle: "Companion server, Discord Rich Presence, Last.fm, and OS media controls" };
    case 5:
      return { title: "Shortcuts", subtitle: "Global keyboard bindings active anywhere on your desktop" };
    case 99:
      return { title: "About YTM Shield", subtitle: "Build details, automatic updates, and repository links" };
    default:
      return { title: "Settings", subtitle: "" };
  }
});

const filterSetSummary = computed(() => {
  switch (adblockerFilterSet.value) {
    case AdblockerFilterSet.AdsOnly:
      return "Ads Only";
    case AdblockerFilterSet.AdsAndTracking:
      return "Ads + Trackers";
    case AdblockerFilterSet.Full:
      return "Full Shield";
    default:
      return "Custom";
  }
});

onMounted(() => {
  if (typeof initialRequestedTab === "number") {
    currentTab.value = initialRequestedTab;
  }
});

async function memorySettingsChanged() {
  memoryStore.set("companionServerAuthWindowEnabled", companionServerAuthWindowEnabled.value);
}

async function settingsChanged() {
  store.set("general.hideToTrayOnClose", hideToTrayOnClose.value);
  store.set("general.showNotificationOnSongChange", showNotificationOnSongChange.value);
  store.set("general.startOnBoot", startOnBoot.value);
  store.set("general.startMinimized", startMinimized.value);
  store.set("general.disableHardwareAcceleration", disableHardwareAcceleration.value);

  store.set("appearance.alwaysShowVolumeSlider", alwaysShowVolumeSlider.value);
  store.set("appearance.customCSSEnabled", customCSSEnabled.value);
  store.set("appearance.glassThemeEnabled", glassThemeEnabled.value);
  store.set("appearance.ambientGlowEnabled", ambientGlowEnabled.value);
  store.set("appearance.accentColor", accentColor.value);
  store.set("appearance.zoom", zoom.value);
  store.set("appearance.trayIconStyle", trayIconStyle.value);

  store.set("playback.continueWhereYouLeftOff", continueWhereYouLeftOff.value);
  store.set("playback.continueWhereYouLeftOffPaused", continueWhereYouLeftOffPaused.value);
  store.set("playback.progressInTaskbar", progressInTaskbar.value);
  store.set("playback.enableSpeakerFill", enableSpeakerFill.value);
  store.set("playback.ratioVolume", ratioVolume.value);
  store.set("playback.equalizerEnabled", equalizerEnabled.value);
  store.set("playback.equalizerPreset", equalizerPreset.value);
  store.set("playback.equalizerBands", [...equalizerBands.value]);
  store.set("playback.loudnessNormalization", loudnessNormalization.value);

  store.set("integrations.companionServerEnabled", companionServerEnabled.value);
  store.set("integrations.companionServerCORSWildcardEnabled", companionServerCORSWildcardEnabled.value);
  store.set("integrations.discordPresenceEnabled", discordPresenceEnabled.value);
  store.set("integrations.lastFMEnabled", lastFMEnabled.value);
  store.set("lastfm.scrobblePercent", scrobblePercent.value);
  store.set("integrations.enhancedMediaServiceEnabled", enhancedMediaServiceEnabled.value);

  store.set("adblocker.blockerEnabled", adblockerEnabled.value);
  store.set("adblocker.filterSet", adblockerFilterSet.value);
  store.set("adblocker.cosmeticFilteringEnabled", adblockerCosmeticFilteringEnabled.value);
  store.set("adblocker.scriptletsEnabled", adblockerScriptletsEnabled.value);
  store.set("adblocker.sponsorBlockEnabled", sponsorBlockEnabled.value);
  store.set("adblocker.extensionsEnabled", extensionsEnabled.value);

  store.set("shortcuts.playPause", shortcutPlayPause.value);
  store.set("shortcuts.next", shortcutNext.value);
  store.set("shortcuts.previous", shortcutPrevious.value);
  store.set("shortcuts.thumbsUp", shortcutThumbsUp.value);
  store.set("shortcuts.thumbsDown", shortcutThumbsDown.value);
  store.set("shortcuts.volumeUp", shortcutVolumeUp.value);
  store.set("shortcuts.volumeDown", shortcutVolumeDown.value);
  store.set("shortcuts.volumeMute", shortcutVolumeMute.value);
  store.set("shortcuts.toggleShuffle", shortcutToggleShuffle.value);
  store.set("shortcuts.toggleRepeat", shortcutToggleRepeat.value);
}

async function settingChangedRequiresRestart() {
  requiresRestart.value = true;
  settingsChanged();
}

async function settingChangedFile(event: Event) {
  const target = event.target as HTMLInputElement;

  const setting = target.dataset.setting;
  if (!setting) {
    throw new Error("No setting specified in File Input");
  }

  store.set(setting, target.files?.length ? window.ytmd.getTrueFilePath(target.files[0]) : null);

  target.value = "";
}

async function restartDiscordPresence() {
  discordPresenceEnabled.value = false;
  await settingsChanged();
  discordPresenceEnabled.value = true;
  await settingsChanged();
}

async function deleteCompanionAuthToken(appId: string) {
  const index = companionServerAuthTokens.value.findIndex(token => token.appId === appId);
  if (index > -1) {
    companionServerAuthTokens.value.splice(index, 1);
  }

  if (safeStorageAvailable.value)
    store.set("integrations.companionServerAuthTokens", await safeStorage.encryptString(JSON.stringify(companionServerAuthTokens.value)));
}

function removeCustomCSSPath() {
  store.set("appearance.customCSSPath", null);
}

async function addExtension() {
  extensionAddError.value = null;

  const result = await window.ytmd.extensions.add();
  if (result.error) {
    extensionAddError.value = result.error;
  }
}

async function removeExtension(extensionPath: string) {
  extensionAddError.value = null;
  await window.ytmd.extensions.remove(extensionPath);
}

function extensionStatus(extension: UserExtension) {
  const error = extensionsLoadErrors.value.find(loadError => loadError.path === extension.path);
  if (error) return error.message;

  const loaded = extensionsLoaded.value.find(loadedExtension => loadedExtension.path === extension.path);
  if (loaded) return `Loaded${loaded.version ? ` v${loaded.version}` : ""}`;

  return extensionsEnabled.value ? "Not loaded" : "Extensions disabled";
}

function extensionHasError(extension: UserExtension) {
  return extensionsLoadErrors.value.some(loadError => loadError.path === extension.path);
}

function extensionIsLoaded(extension: UserExtension) {
  return extensionsLoaded.value.some(loadedExtension => loadedExtension.path === extension.path);
}

function changeTab(newTab: number) {
  searchQuery.value = "";
  currentTab.value = newTab;
}

function jumpToSearchResult(tab: number) {
  currentTab.value = tab;
  searchQuery.value = "";
}

function restartApplication() {
  window.ytmd.restartApplication();
}

function restartApplicationForUpdate() {
  window.ytmd.restartApplicationForUpdate();
}

function checkForUpdates() {
  window.ytmd.checkForUpdates();
  checkingForUpdate.value = true;
}

async function logoutLastFM() {
  store.set("lastfm.sessionKey", null);
  lastFMEnabled.value = false;
  lastFMSessionKey.value = null;
  await settingsChanged();
}

function stepLastFMAuth() {
  window.ytmd.lastFMStepAuthenticate();
}
</script>

<template>
  <div
    class="settings-container"
    :style="settingsAccentStyle"
  >
    <div class="content-container">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <ShieldLogo :size="26" />
          <div class="sidebar-brand-meta">
            <span class="sidebar-brand-title">YTM Shield</span>
            <span class="sidebar-brand-version">v{{ ytmdVersion }}</span>
          </div>
        </div>

        <div class="sidebar-search">
          <span class="material-symbols-outlined search-icon">search</span>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Find setting..."
          >
          <button
            v-if="searchQuery"
            class="search-clear"
            @click="searchQuery = ''"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <ul class="nav-list">
          <li
            :class="{ active: !searchQuery && currentTab === 6 }"
            @click="changeTab(6)"
          >
            <span class="material-symbols-outlined">shield</span>
            <span class="nav-label">Ad Shield</span>
            <span
              class="nav-shield-dot"
              :class="{ ok: adblockerEnabled && adblockerReady, off: !adblockerEnabled, err: adblockerFailed }"
            />
          </li>
          <li
            :class="{ active: !searchQuery && currentTab === 1 }"
            @click="changeTab(1)"
          >
            <span class="material-symbols-outlined">tune</span>
            <span class="nav-label">General</span>
          </li>
          <li
            :class="{ active: !searchQuery && currentTab === 2 }"
            @click="changeTab(2)"
          >
            <span class="material-symbols-outlined">palette</span>
            <span class="nav-label">Appearance</span>
          </li>
          <li
            :class="{ active: !searchQuery && currentTab === 3 }"
            @click="changeTab(3)"
          >
            <span class="material-symbols-outlined">graphic_eq</span>
            <span class="nav-label">Playback</span>
          </li>
          <li
            :class="{ active: !searchQuery && currentTab === 4 }"
            @click="changeTab(4)"
          >
            <span class="material-symbols-outlined">hub</span>
            <span class="nav-label">Integrations</span>
          </li>
          <li
            :class="{ active: !searchQuery && currentTab === 5 }"
            @click="changeTab(5)"
          >
            <span class="material-symbols-outlined">keyboard</span>
            <span class="nav-label">Shortcuts</span>
          </li>
          <span class="push" />
          <li
            :class="{ active: !searchQuery && currentTab === 99 }"
            @click="changeTab(99)"
          >
            <span class="material-symbols-outlined">info</span>
            <span class="nav-label">About</span>
          </li>
        </ul>
      </aside>

      <main class="content">
        <div
          v-if="requiresRestart"
          class="restart-banner"
        >
          <p class="message">
            <span class="material-symbols-outlined">autorenew</span> Restart YTM Shield to apply changes
          </p>
          <button
            class="restart-button"
            @click="restartApplication"
          >
            Restart Now
          </button>
        </div>

        <div
          v-if="searchQuery.trim().length > 0"
          class="search-results-view"
        >
          <div class="section-header">
            <h1>Search Results</h1>
            <p>{{ searchResults.length }} match{{ searchResults.length === 1 ? "" : "es" }} for "{{ searchQuery.trim() }}"</p>
          </div>
          <div
            v-if="searchResults.length === 0"
            class="empty-search"
          >
            <span class="material-symbols-outlined">search_off</span>
            <p>No matching settings found.</p>
          </div>
          <div
            v-else
            class="search-list"
          >
            <button
              v-for="entry in searchResults"
              :key="`${entry.tab}-${entry.title}`"
              class="search-card"
              @click="jumpToSearchResult(entry.tab)"
            >
              <div class="search-card-body">
                <span class="search-card-title">{{ entry.title }}</span>
                <span class="search-card-desc">{{ entry.description }}</span>
              </div>
              <span class="search-card-tab">{{ entry.tabLabel }}</span>
            </button>
          </div>
        </div>

        <template v-else>
          <div
            v-if="currentTab !== 99"
            class="section-header"
          >
            <h1>{{ activeTabMeta.title }}</h1>
            <p>{{ activeTabMeta.subtitle }}</p>
          </div>

          <div
            v-if="currentTab === 6"
            class="adblock-tab"
          >
            <div
              class="shield-hero"
              :class="{ active: adblockerEnabled && adblockerReady, paused: !adblockerEnabled, error: adblockerFailed }"
            >
              <div class="shield-hero-left">
                <div class="shield-emblem-box">
                  <ShieldLogo
                    :size="42"
                    :glow="adblockerEnabled"
                  />
                </div>
                <div class="shield-hero-text">
                  <div class="shield-hero-status-row">
                    <span class="hero-status-pill">
                      <span class="hero-dot" />
                      {{
                        !adblockerEnabled
                          ? "Protection Paused"
                          : adblockerFailed
                            ? "Filter Error"
                            : adblockerReady
                              ? "Shield Active"
                              : "Initializing Filters"
                      }}
                    </span>
                  </div>
                  <h2>
                    <span v-if="!adblockerEnabled">Ad Shield is currently paused</span>
                    <span v-else-if="adblockerFailed">Could not load filter lists</span>
                    <span v-else>{{ adblockerBlockedCount.toLocaleString() }} ads & trackers blocked</span>
                  </h2>
                  <p v-if="adblockerFailed">
                    Check your internet connection and restart YTM Shield to retry filter initialization.
                  </p>
                  <p v-else>
                    Real-time network filtering, cosmetic element hiding, and audio stream scriptlets.
                  </p>
                </div>
              </div>
            </div>

              <div
                v-if="adblockerEnabled"
                class="shield-stats-row"
              >
                <div class="stat-card">
                  <span class="stat-label">Session Blocked</span>
                  <span class="stat-value">{{ adblockerBlockedCount.toLocaleString() }}</span>
                  <span class="stat-sub">Since launch</span>
                </div>
                <div class="stat-card">
                  <span class="stat-label">Lifetime Blocked</span>
                  <span class="stat-value">{{ adblockerTotalBlockedLifetime.toLocaleString() }}</span>
                  <span class="stat-sub">Persisted across sessions</span>
                </div>
                <div class="stat-card">
                  <span class="stat-label">Filter Lists</span>
                  <span class="stat-sub">{{ formattedFilterUpdatedAt }}</span>
                  <button
                    class="secondary-btn"
                    :disabled="adblockerRefreshing"
                    @click="refreshFilterListsNow"
                  >
                    {{ adblockerRefreshing ? "Updating..." : "Update Filter Lists Now" }}
                  </button>
                </div>
              </div>

            <div
              v-if="adblockerEnabled"
              class="protection-strip"
            >
              <div class="strip-card">
                <span class="strip-label">Filter Profile</span>
                <span class="strip-value">{{ filterSetSummary }}</span>
              </div>
              <div class="strip-card">
                <span class="strip-label">Cosmetic Hiding</span>
                <span
                  class="strip-value"
                  :class="{ on: adblockerCosmeticFilteringEnabled }"
                >
                  {{ adblockerCosmeticFilteringEnabled ? "Enabled" : "Off" }}
                </span>
              </div>
              <div class="strip-card">
                <span class="strip-label">Stream Scriptlets</span>
                <span
                  class="strip-value"
                  :class="{ on: adblockerCosmeticFilteringEnabled && adblockerScriptletsEnabled }"
                >
                  {{ adblockerCosmeticFilteringEnabled && adblockerScriptletsEnabled ? "Active" : "Off" }}
                </span>
              </div>
            </div>

            <YTMDSetting
              v-model="adblockerEnabled"
              type="checkbox"
              name="Built-in ad blocker"
              description="Blocks ads and trackers using EasyList and uBlock Origin filter lists"
              @change="settingsChanged"
            />
            <YTMDSetting
              v-if="adblockerEnabled"
              v-model="adblockerFilterSet"
              :options-map="{
                [AdblockerFilterSet.AdsOnly]: 'Ads only',
                [AdblockerFilterSet.AdsAndTracking]: 'Ads and trackers',
                [AdblockerFilterSet.Full]: 'Ads, trackers and annoyances'
              }"
              type="select"
              indented
              name="Filter lists"
              description="Choose filtering aggressiveness for network and cosmetic rules"
              @change="settingsChanged"
            />
            <YTMDSetting
              v-if="adblockerEnabled"
              v-model="adblockerCosmeticFilteringEnabled"
              type="checkbox"
              indented
              name="Cosmetic filtering"
              description="Hides ad placeholders and promotional cards inside YouTube Music"
              @change="settingsChanged"
            />
            <YTMDSetting
              v-if="adblockerEnabled && adblockerCosmeticFilteringEnabled"
              v-model="adblockerScriptletsEnabled"
              type="checkbox"
              indented
              name="Scriptlet injection"
              description="Runs anti-ad scriptlets to stop ads served between tracks from the same media origin. Disable only if playback misbehaves."
              @change="settingsChanged"
            />

            <div class="subsection-title">
              SponsorBlock Integration
            </div>

            <YTMDSetting
              v-model="sponsorBlockEnabled"
              type="checkbox"
              name="Auto-skip SponsorBlock segments"
              description="Queries sponsor.ajay.app privacy-preserving SHA-256 hash prefixes to skip non-music segments"
              @change="settingsChanged"
            />

            <YTMDSetting
              v-if="sponsorBlockEnabled"
              type="custom"
              flex-column
              indented
              name="Segment categories to skip"
              description="Choose which crowdsourced segment categories trigger automatic seek"
            >
              <div class="sb-cat-grid">
                <button
                  v-for="cat in SPONSORBLOCK_CATEGORY_LABELS"
                  :key="cat.id"
                  class="sb-cat-chip"
                  :class="{ active: sponsorBlockCategories.includes(cat.id) }"
                  @click="toggleSponsorBlockCategory(cat.id)"
                >
                  {{ cat.label }}
                </button>
              </div>
            </YTMDSetting>

            <div class="subsection-title">
              Custom Filter Rules & Allowlist
            </div>

            <YTMDSetting
              type="custom"
              flex-column
              name="Custom ABP / uBO rules"
              description="One rule per line (e.g. ||example-ads.com^ to block, @@||trusted-domain.com^ to allowlist)"
            >
              <textarea
                v-model="adblockerCustomRules"
                class="rules-textarea"
                placeholder="||ad-domain.example^&#10;@@||allowlisted-domain.example^"
              />
              <div class="inline-card-row">
                <span class="inline-card-text">
                  {{ customRulesSavedNote ? "Custom rules applied!" : "Click Apply to compile rules into the active shield engine." }}
                </span>
                <button
                  class="primary-btn-sm"
                  @click="applyCustomRules"
                >
                  Apply Custom Rules
                </button>
              </div>
            </YTMDSetting>

            <YTMDSetting
              type="custom"
              flex-column
              name="Recent blocked requests"
              description="Latest 30 requests intercepted by Ad Shield during this session"
            >
              <div class="inline-card-row">
                <span class="inline-card-text">{{ adblockerRecentBlocked.length }} recent events captured</span>
                <button
                  class="secondary-btn"
                  @click="showBlockedLog = !showBlockedLog"
                >
                  {{ showBlockedLog ? "Hide Log" : "View Blocked Log" }}
                </button>
              </div>
              <div
                v-if="showBlockedLog"
                class="blocked-log-list"
              >
                <div
                  v-if="adblockerRecentBlocked.length === 0"
                  class="empty-extensions"
                >
                  No blocked requests recorded yet this session.
                </div>
                <div
                  v-for="(entry, idx) in adblockerRecentBlocked"
                  :key="`${entry.timestamp}-${idx}`"
                  class="blocked-log-row"
                >
                  <span class="blocked-log-url">{{ entry.url }}</span>
                  <span class="blocked-log-meta">
                    {{ entry.resourceType }} • {{ entry.filter || "rule match" }} • {{ new Date(entry.timestamp).toLocaleTimeString() }}
                  </span>
                </div>
              </div>
            </YTMDSetting>

            <div class="subsection-title">
              Chrome Extensions
            </div>

            <YTMDSetting
              v-model="extensionsEnabled"
              type="checkbox"
              name="Browser extensions"
              description="Loads unpacked Chrome extensions (such as uBlock Origin MV2) into the YouTube Music session"
              @change="settingsChanged"
            />

            <YTMDSetting
              v-if="extensionsEnabled"
              type="custom"
              flex-column
              indented
              name="Installed extensions"
              description="Electron supports Manifest V2 blockers natively. Manifest V3 blockers using declarativeNetRequest (such as uBlock Origin Lite) cannot filter traffic in Electron."
            >
              <div
                v-if="userExtensions.length > 0"
                class="extensions-grid"
              >
                <div
                  v-for="extension in userExtensions"
                  :key="extension.path"
                  class="extension-card"
                >
                  <div class="extension-main">
                    <div class="extension-title-row">
                      <span class="extension-name">{{ extension.name }}</span>
                      <span
                        class="extension-status-badge"
                        :class="{
                          loaded: extensionIsLoaded(extension),
                          error: extensionHasError(extension)
                        }"
                      >
                        {{ extensionStatus(extension) }}
                      </span>
                    </div>
                    <span class="extension-path">{{ extension.path }}</span>
                  </div>
                  <button
                    class="icon-danger-btn"
                    title="Remove extension"
                    @click="removeExtension(extension.path)"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
              <div
                v-else
                class="empty-extensions"
              >
                No unpacked extensions added yet.
              </div>
              <p
                v-if="extensionAddError"
                class="extension-add-error"
              >
                {{ extensionAddError }}
              </p>
              <button
                class="add-extension-button"
                @click="addExtension"
              >
                <span class="material-symbols-outlined">create_new_folder</span>
                Add unpacked extension
              </button>
            </YTMDSetting>
          </div>

          <div
            v-if="currentTab === 1"
            class="general-tab"
          >
            <YTMDSetting
              v-if="!isDarwin"
              v-model="hideToTrayOnClose"
              type="checkbox"
              name="Hide to tray on close"
              description="Minimize to the system tray instead of exiting the application"
              @change="settingsChanged"
            />
            <YTMDSetting
              v-model="showNotificationOnSongChange"
              type="checkbox"
              name="Show notification on song change"
              description="Display a native OS notification whenever a new track starts"
              @change="settingsChanged"
            />
            <YTMDSetting
              v-model="startOnBoot"
              type="checkbox"
              name="Start on boot"
              description="Automatically launch YTM Shield when signing into your system"
              @change="settingsChanged"
            />
            <YTMDSetting
              v-model="disableHardwareAcceleration"
              type="checkbox"
              restart-required
              name="Disable hardware acceleration"
              description="Use software rendering if experiencing black frames or GPU artifacts"
              @change="settingChangedRequiresRestart"
            />
          </div>

          <div
            v-if="currentTab === 2"
            class="appearance-tab"
          >
            <YTMDSetting
              v-model="glassThemeEnabled"
              type="checkbox"
              name="YTM Shield Glass theme"
              description="Apply native dark frosted-glass navigation, sidebar, player bar, and custom scrollbars inside YouTube Music"
              @change="settingsChanged"
            />
            <YTMDSetting
              v-model="ambientGlowEnabled"
              type="checkbox"
              name="Ambient dynamic background glow"
              description="Subtle radial accent glow behind the YouTube Music library and player canvas"
              @change="settingsChanged"
            />
            <YTMDSetting
              type="custom"
              flex-column
              name="Accent highlight color"
              description="Customize primary accent across YTM Shield TitleBar, Miniplayer, Settings, and YouTube Music controls"
            >
              <div class="swatch-row">
                <button
                  v-for="swatch in ACCENT_SWATCHES"
                  :key="swatch.hex"
                  class="accent-swatch"
                  :class="{ active: accentColor.toLowerCase() === swatch.hex.toLowerCase() }"
                  :style="{ backgroundColor: swatch.hex }"
                  :title="swatch.name"
                  @click="selectAccentColor(swatch.hex)"
                />
              </div>
            </YTMDSetting>
            <YTMDSetting
              v-model="alwaysShowVolumeSlider"
              type="checkbox"
              name="Always show volume slider"
              description="Applies only to the legacy player bar and may not affect newer layouts"
              @change="settingsChanged"
            />
            <YTMDSetting
              v-model="customCSSEnabled"
              type="checkbox"
              name="Custom CSS"
              description="Enable inline live CSS and optional external stylesheet injection"
              @change="settingsChanged"
            />
            <YTMDSetting
              v-if="customCSSEnabled"
              type="custom"
              flex-column
              indented
              name="Live CSS editor & quick snippets"
              description="Changes apply instantaneously to YouTube Music with zero reload"
            >
              <div class="snippet-row">
                <button
                  v-for="snippet in CSS_SNIPPETS"
                  :key="snippet.label"
                  class="snippet-btn"
                  @click="applyCssSnippet(snippet.css)"
                >
                  + {{ snippet.label }}
                </button>
              </div>
              <textarea
                v-model="inlineCustomCSS"
                class="css-editor-textarea"
                placeholder="/* Write custom CSS here — changes apply live */"
                @input="updateInlineCustomCSS"
              />
            </YTMDSetting>
            <YTMDSetting
              v-if="customCSSEnabled"
              v-model="customCSSPath"
              type="file"
              indented
              bind-setting="appearance.customCSSPath"
              name="External CSS file path (optional)"
              @file-change="settingChangedFile"
              @clear="removeCustomCSSPath"
            />
            <YTMDSetting
              v-model="zoom"
              type="range"
              max="300"
              min="30"
              step="10"
              name="Zoom"
              description="Adjust web player scale percentage"
              @change="settingsChanged"
            />
            <YTMDSetting
              v-if="isLinux"
              v-model="trayIconStyle"
              :options-map="{ [TrayIconStyle.Auto]: 'Auto', [TrayIconStyle.White]: 'White', [TrayIconStyle.Black]: 'Black' }"
              type="select"
              name="Tray icon style"
              @change="settingsChanged"
            />
          </div>

          <div
            v-if="currentTab === 3"
            class="playback-tab"
          >
            <YTMDSetting
              v-model="continueWhereYouLeftOff"
              name="Continue where you left off"
              description="Resume your previous track or queue on startup"
              type="checkbox"
              @change="settingsChanged"
            />
            <YTMDSetting
              v-if="continueWhereYouLeftOff"
              v-model="continueWhereYouLeftOffPaused"
              type="checkbox"
              indented
              name="Pause on application launch"
              @change="settingsChanged"
            />
            <YTMDSetting
              v-model="progressInTaskbar"
              type="checkbox"
              name="Show track progress on taskbar"
              description="Render live playback progress on the taskbar icon"
              @change="settingsChanged"
            />
            <YTMDSetting
              v-model="enableSpeakerFill"
              type="checkbox"
              restart-required
              name="Enable speaker fill"
              description="Enable multi-channel stereo mirroring in the audio engine"
              @change="settingChangedRequiresRestart"
            />
            <YTMDSetting
              v-model="ratioVolume"
              type="checkbox"
              name="Ratio volume"
              description="Use smoother perceptual volume curve control"
              @change="settingsChanged"
            />

            <div class="subsection-title">
              Audio Engine (Web Audio API)
            </div>

            <YTMDSetting
              v-model="loudnessNormalization"
              type="checkbox"
              name="Loudness normalization"
              description="Real-time dynamics compressor to level volume differences across tracks"
              @change="settingsChanged"
            />

            <YTMDSetting
              v-model="equalizerEnabled"
              type="checkbox"
              name="10-Band graphic equalizer"
              description="Shape sound frequency response live across 32Hz – 16kHz"
              @change="settingsChanged"
            />

            <div
              v-if="equalizerEnabled"
              class="eq-card"
            >
              <div class="eq-header">
                <select
                  v-model="equalizerPreset"
                  class="eq-preset-select"
                  @change="selectEqPreset"
                >
                  <option
                    v-for="(preset, key) in EQ_PRESETS"
                    :key="key"
                    :value="key"
                  >
                    Preset: {{ preset.label }}
                  </option>
                </select>
                <button
                  class="secondary-btn"
                  @click="resetEqBands"
                >
                  Reset Flat
                </button>
              </div>
              <div class="eq-bands-grid">
                <div
                  v-for="(freq, idx) in EQ_BAND_LABELS"
                  :key="freq"
                  class="eq-band-col"
                >
                  <span class="eq-db-val">{{ equalizerBands[idx] > 0 ? `+${equalizerBands[idx]}` : equalizerBands[idx] }}dB</span>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    :value="equalizerBands[idx]"
                    class="eq-vertical-slider"
                    @input="updateEqBand(idx, $event)"
                  >
                  <span class="eq-freq-label">{{ freq }}</span>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="currentTab === 4"
            class="integrations-tab"
          >
            <YTMDSetting
              v-model="companionServerEnabled"
              type="checkbox"
              name="Companion server"
              description="Enable local API server for companion remote controllers"
              :disabled="!safeStorageAvailable"
              disabled-message="This integration cannot be enabled due to safeStorage being unavailable"
              @change="settingsChanged"
            />
            <YTMDSetting
              v-if="companionServerEnabled && safeStorageAvailable"
              v-model="companionServerCORSWildcardEnabled"
              type="checkbox"
              indented
              name="Allow browser communication"
              description="Warning: allows any visited website to talk to the local companion server"
              @change="settingsChanged"
            />
            <YTMDSetting
              v-if="companionServerEnabled && safeStorageAvailable"
              v-model="companionServerAuthWindowEnabled"
              type="checkbox"
              indented
              name="Enable companion authorization"
              description="Automatically turns off after first authorization or after 5 minutes"
              @change="memorySettingsChanged"
            />
            <YTMDSetting
              v-if="companionServerEnabled && safeStorageAvailable"
              type="custom"
              flex-column
              indented
              name="Authorized companions"
              description="Clients currently paired with your YTM Shield session"
              @change="settingsChanged"
            >
              <div
                v-if="companionServerAuthTokens.length > 0"
                class="companions-list"
              >
                <div
                  v-for="authToken in companionServerAuthTokens"
                  :key="authToken.appId"
                  class="companion-card"
                >
                  <div class="companion-info">
                    <span class="companion-name">{{ authToken.appName }}</span>
                    <span class="companion-meta">{{ authToken.appId }} • v{{ authToken.appVersion }}</span>
                  </div>
                  <button
                    class="icon-danger-btn"
                    title="Revoke companion access"
                    @click="deleteCompanionAuthToken(authToken.appId)"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
              <div
                v-else
                class="no-authorized-companions"
              >
                No authorized companions
              </div>
            </YTMDSetting>

            <YTMDSetting
              v-model="discordPresenceEnabled"
              type="checkbox"
              name="Discord rich presence"
              description="Show current song and playback status on your Discord profile"
              @change="settingsChanged"
            />
            <div
              v-if="discordPresenceEnabled && discordPresenceConnectionFailed"
              class="inline-alert-card indented"
            >
              <p class="discord-failure">
                Discord connection could not be established after 30 attempts.
              </p>
              <button
                class="secondary-btn"
                @click="restartDiscordPresence"
              >
                Retry
              </button>
            </div>

            <YTMDSetting
              v-model="lastFMEnabled"
              type="checkbox"
              name="Last.fm scrobbling"
              description="Automatically scrobble played tracks to Last.fm"
              :disabled="!safeStorageAvailable"
              disabled-message="This integration cannot be enabled due to safeStorage being unavailable"
              @change="settingsChanged"
            />
            <div
              v-if="lastFMEnabled"
              class="inline-card indented"
            >
              <div class="inline-card-row">
                <p class="inline-card-text">
                  Authentication status:
                  <span
                    class="status-pill-inline"
                    :class="lastFMSessionKey ? 'ok' : 'err'"
                  >
                    {{ lastFMSessionKey ? "Authenticated" : "Not Connected" }}
                  </span>
                </p>
                <button
                  v-if="lastFMSessionKey"
                  class="secondary-btn"
                  @click="logoutLastFM"
                >
                  Logout
                </button>
              </div>
            </div>
            <div
              v-if="lastFMEnabled && lastFMAuthenticationStep === 0"
              class="inline-card indented"
            >
              <div class="inline-card-row">
                <p class="inline-card-text">
                  Continue Last.fm setup in your browser, then return here.
                </p>
                <button
                  class="primary-btn-sm"
                  @click="stepLastFMAuth"
                >
                  Authorize Last.fm
                </button>
              </div>
            </div>
            <div
              v-if="lastFMEnabled && lastFMAuthenticationStep === 1"
              class="inline-card indented"
            >
              <div class="inline-card-row">
                <p class="inline-card-text">
                  Once approved in your browser, complete authentication below.
                </p>
                <button
                  class="primary-btn-sm"
                  @click="stepLastFMAuth"
                >
                  Finish authentication
                </button>
              </div>
            </div>
            <YTMDSetting
              v-if="lastFMEnabled"
              v-model="scrobblePercent"
              indented
              type="range"
              name="Scrobble percent"
              description="Track percentage listened before sending a scrobble"
              min="50"
              max="95"
              step="5"
              @change="settingsChanged"
            />

            <YTMDSetting
              v-model="enhancedMediaServiceEnabled"
              type="checkbox"
              restart-required
              name="Enhanced media service"
              description="Improved OS hardware media key integration"
              :disabled="isDarwin"
              disabled-message="This integration is not available on macOS"
              beta
              @change="settingChangedRequiresRestart"
            />
          </div>

          <div
            v-if="currentTab === 5"
            class="shortcuts-tab"
          >
            <div class="shortcut-card">
              <div class="shortcut-info">
                <p class="shortcut-title">
                  Play / Pause
                </p>
                <span
                  v-if="shortcutsPlayPauseRegisterFailed"
                  class="shortcut-error-badge"
                  title="Failed to register keybind. Another application may already hold it."
                >Conflict</span>
              </div>
              <KeybindInput
                v-model="shortcutPlayPause"
                @change="settingsChanged"
              />
            </div>

            <div class="shortcut-card">
              <div class="shortcut-info">
                <p class="shortcut-title">
                  Next Track
                </p>
                <span
                  v-if="shortcutsNextRegisterFailed"
                  class="shortcut-error-badge"
                  title="Failed to register keybind."
                >Conflict</span>
              </div>
              <KeybindInput
                v-model="shortcutNext"
                @change="settingsChanged"
              />
            </div>

            <div class="shortcut-card">
              <div class="shortcut-info">
                <p class="shortcut-title">
                  Previous Track
                </p>
                <span
                  v-if="shortcutsPreviousRegisterFailed"
                  class="shortcut-error-badge"
                  title="Failed to register keybind."
                >Conflict</span>
              </div>
              <KeybindInput
                v-model="shortcutPrevious"
                @change="settingsChanged"
              />
            </div>

            <div class="shortcut-card">
              <div class="shortcut-info">
                <p class="shortcut-title">
                  Thumbs Up
                </p>
                <span
                  v-if="shortcutsThumbsUpRegisterFailed"
                  class="shortcut-error-badge"
                  title="Failed to register keybind."
                >Conflict</span>
              </div>
              <KeybindInput
                v-model="shortcutThumbsUp"
                @change="settingsChanged"
              />
            </div>

            <div class="shortcut-card">
              <div class="shortcut-info">
                <p class="shortcut-title">
                  Thumbs Down
                </p>
                <span
                  v-if="shortcutsThumbsDownRegisterFailed"
                  class="shortcut-error-badge"
                  title="Failed to register keybind."
                >Conflict</span>
              </div>
              <KeybindInput
                v-model="shortcutThumbsDown"
                @change="settingsChanged"
              />
            </div>

            <div class="shortcut-card">
              <div class="shortcut-info">
                <p class="shortcut-title">
                  Increase Volume
                </p>
                <span
                  v-if="shortcutsVolumeUpRegisterFailed"
                  class="shortcut-error-badge"
                  title="Failed to register keybind."
                >Conflict</span>
              </div>
              <KeybindInput
                v-model="shortcutVolumeUp"
                @change="settingsChanged"
              />
            </div>

            <div class="shortcut-card">
              <div class="shortcut-info">
                <p class="shortcut-title">
                  Decrease Volume
                </p>
                <span
                  v-if="shortcutsVolumeDownRegisterFailed"
                  class="shortcut-error-badge"
                  title="Failed to register keybind."
                >Conflict</span>
              </div>
              <KeybindInput
                v-model="shortcutVolumeDown"
                @change="settingsChanged"
              />
            </div>

            <div class="shortcut-card">
              <div class="shortcut-info">
                <p class="shortcut-title">
                  Mute Volume
                </p>
                <span
                  v-if="shortcutsVolumeMuteRegisterFailed"
                  class="shortcut-error-badge"
                  title="Failed to register keybind."
                >Conflict</span>
              </div>
              <KeybindInput
                v-model="shortcutVolumeMute"
                @change="settingsChanged"
              />
            </div>

            <div class="shortcut-card">
              <div class="shortcut-info">
                <p class="shortcut-title">
                  Toggle Shuffle
                </p>
                <span
                  v-if="shortcutsToggleShuffleRegisterFailed"
                  class="shortcut-error-badge"
                  title="Failed to register keybind."
                >Conflict</span>
              </div>
              <KeybindInput
                v-model="shortcutToggleShuffle"
                @change="settingsChanged"
              />
            </div>

            <div class="shortcut-card">
              <div class="shortcut-info">
                <p class="shortcut-title">
                  Toggle Repeat
                </p>
                <span
                  v-if="shortcutsToggleRepeatRegisterFailed"
                  class="shortcut-error-badge"
                  title="Failed to register keybind."
                >Conflict</span>
              </div>
              <KeybindInput
                v-model="shortcutToggleRepeat"
                @change="settingsChanged"
              />
            </div>
          </div>

          <div
            v-if="currentTab === 99"
            class="about-tab"
          >
            <div class="about-hero">
              <ShieldLogo
                :size="72"
                glow
              />
              <h2 class="app-name">
                YTM Shield
              </h2>
              <p class="about-tagline">
                Modern YouTube Music desktop player with integrated Ad Shield
              </p>
              <p class="made-by">
                Created &amp; maintained by <span>oPaozinh0</span>
              </p>
            </div>

            <div class="about-update-card">
              <template v-if="!autoUpdaterDisabled">
                <button
                  v-if="!updateDownloaded"
                  :disabled="checkingForUpdate || updateAvailable || updateDownloaded"
                  class="update-check-button"
                  @click="checkForUpdates"
                >
                  <span class="material-symbols-outlined">update</span>
                  Check for updates
                </button>
                <button
                  v-if="updateDownloaded"
                  class="update-ready-button"
                  @click="restartApplicationForUpdate"
                >
                  <span class="material-symbols-outlined">upgrade</span>
                  Restart to install update
                </button>
                <p
                  v-if="checkingForUpdate && !updateAvailable && !updateDownloaded"
                  class="update-status"
                >
                  <span class="material-symbols-outlined spinning">progress_activity</span>
                  Checking for updates...
                </p>
                <p
                  v-if="updateAvailable && !updateDownloaded"
                  class="update-status"
                >
                  <span class="material-symbols-outlined spinning">progress_activity</span>
                  Downloading update...
                </p>
                <p
                  v-if="updateNotAvailable"
                  class="update-status muted"
                >
                  You are running the latest version
                </p>
              </template>
              <template v-else>
                <p class="update-status muted">
                  Auto updater disabled for this build or platform
                </p>
              </template>
            </div>

            <div class="version-grid">
              <div class="version-cell">
                <span class="cell-label">App Version</span>
                <span class="cell-value">v{{ ytmdVersion }}</span>
              </div>
              <div class="version-cell">
                <span class="cell-label">Branch</span>
                <span class="cell-value">{{ ytmdBranch ?? "release" }}</span>
              </div>
              <div class="version-cell">
                <span class="cell-label">Commit</span>
                <span class="cell-value">{{ ytmdCommitHash ?? "packaged" }}</span>
              </div>
              <div class="version-cell">
                <span class="cell-label">Electron</span>
                <span class="cell-value">{{ processVersions.electron }}</span>
              </div>
              <div class="version-cell">
                <span class="cell-label">Chromium</span>
                <span class="cell-value">{{ processVersions.chrome }}</span>
              </div>
            </div>

            <div class="about-links">
              <a
                class="about-link-btn"
                href="https://github.com/oPaozinh0/ytmdesktop"
                target="_blank"
              >
                <span class="material-symbols-outlined">code</span>
                GitHub Repository
              </a>
              <a
                class="about-link-btn"
                href="https://github.com/oPaozinh0/ytmdesktop/issues"
                target="_blank"
              >
                <span class="material-symbols-outlined">bug_report</span>
                Report an Issue
              </a>
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
.settings-container {
  user-select: none;
  height: 100%;
  width: 100%;
}

.content-container {
  display: flex;
  height: 100%;
}

/* Sidebar */
.sidebar {
  width: 230px;
  min-width: 230px;
  height: 100%;
  background: rgba(14, 15, 22, 0.92);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  padding: 16px 12px 12px;
  box-sizing: border-box;
  gap: 14px;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 6px;
}

.sidebar-brand-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-brand-title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.sidebar-brand-version {
  font-size: 11px;
  color: var(--text-muted);
}

.sidebar-search {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 9px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.sidebar-search:focus-within {
  border-color: var(--accent-primary);
  background: rgba(255, 255, 255, 0.06);
}

.search-icon {
  font-size: 17px;
  color: var(--text-muted);
}

.search-input {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 12.5px;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-clear {
  background: transparent;
  border: none;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
}

.search-clear .material-symbols-outlined {
  font-size: 15px;
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 0.14s ease, color 0.14s ease, border-color 0.14s ease;
}

.nav-list li:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.nav-list li.active {
  background: var(--accent-soft);
  border-color: rgba(255, 31, 75, 0.32);
  color: #ffffff;
  font-weight: 600;
}

.nav-list li .material-symbols-outlined {
  font-size: 20px;
  font-variation-settings:
    "FILL" 0,
    "wght" 350,
    "GRAD" 0,
    "opsz" 20;
}

.nav-list li.active .material-symbols-outlined {
  color: var(--accent-primary);
  font-variation-settings:
    "FILL" 1,
    "wght" 400,
    "GRAD" 0,
    "opsz" 20;
}

.nav-label {
  flex: 1;
}

.nav-shield-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
}

.nav-shield-dot.ok {
  background: var(--shield-ok);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
}

.nav-shield-dot.err {
  background: var(--shield-error);
}

.push {
  flex: 1;
}

/* Main Content */
.content {
  overflow-y: auto;
  flex: 1;
  padding: 24px 28px 32px;
  box-sizing: border-box;
}

.section-header {
  margin-bottom: 18px;
}

.section-header h1 {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}

.section-header p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.subsection-title {
  margin: 22px 0 10px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

/* Restart Banner */
.restart-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 18px;
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, rgba(255, 31, 75, 0.16), rgba(20, 22, 30, 0.85));
  border: 1px solid rgba(255, 31, 75, 0.38);
}

.restart-banner .message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.restart-button {
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--accent-primary);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.restart-button:hover {
  background: var(--accent-hover);
}

/* Ad Shield Hero */
.shield-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  margin-bottom: 14px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, rgba(255, 31, 75, 0.12) 0%, rgba(20, 22, 30, 0.9) 55%);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-elevated);
}

.shield-hero.active {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(20, 22, 30, 0.92) 50%, rgba(255, 31, 75, 0.08) 100%);
  border-color: rgba(34, 197, 94, 0.28);
}

.shield-hero.error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(20, 22, 30, 0.92) 60%);
  border-color: rgba(239, 68, 68, 0.35);
}

.shield-hero-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.shield-emblem-box {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.shield-hero-text h2 {
  margin: 6px 0 4px;
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 700;
  color: var(--text-primary);
}

.shield-hero-text p {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.hero-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  color: var(--text-primary);
}

.hero-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
}

.shield-hero.active .hero-dot {
  background: var(--shield-ok);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.8);
}

.shield-hero.error .hero-dot {
  background: var(--shield-error);
}

/* Protection Summary Strip */
.protection-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.strip-card {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.strip-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.strip-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.strip-value.on {
  color: #4ade80;
}

/* Chrome Extensions Cards */
.extensions-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.extension-card,
.companion-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 13px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
}

.extension-main,
.companion-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.extension-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.extension-name,
.companion-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.extension-status-badge {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}

.extension-status-badge.loaded {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.extension-status-badge.error {
  background: rgba(239, 68, 68, 0.16);
  color: #f87171;
}

.extension-path,
.companion-meta {
  font-size: 11.5px;
  color: var(--text-muted);
  word-break: break-all;
}

.empty-extensions,
.no-authorized-companions {
  padding: 12px;
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border-subtle);
  color: var(--text-muted);
  font-size: 12.5px;
  text-align: center;
}

.extension-add-error {
  margin: 0;
  font-size: 12px;
  color: #f87171;
}

.add-extension-button {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 31, 75, 0.42);
  background: var(--accent-soft);
  color: #ff7a93;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.14s ease, border-color 0.14s ease;
}

.add-extension-button:hover {
  background: rgba(255, 31, 75, 0.24);
  border-color: var(--accent-primary);
}

.add-extension-button .material-symbols-outlined {
  font-size: 17px;
}

.icon-danger-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.icon-danger-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.icon-danger-btn .material-symbols-outlined {
  font-size: 18px;
}

.companions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Inline Cards (Last.fm / Discord) */
.inline-card,
.inline-alert-card {
  padding: 13px 16px;
  margin-bottom: 10px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
}

.inline-card.indented,
.inline-alert-card.indented {
  margin-left: 16px;
  border-left: 2px solid rgba(255, 31, 75, 0.42);
}

.inline-card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.inline-card-text {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.discord-failure {
  margin: 0 0 8px;
  font-size: 12.5px;
  color: #f87171;
}

.status-pill-inline {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.status-pill-inline.ok {
  background: rgba(34, 197, 94, 0.16);
  color: #4ade80;
}

.status-pill-inline.err {
  background: rgba(239, 68, 68, 0.16);
  color: #f87171;
}

.secondary-btn,
.primary-btn-sm {
  padding: 7px 13px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.primary-btn-sm {
  background: var(--accent-primary);
  border: none;
  color: #ffffff;
}

.primary-btn-sm:hover {
  background: var(--accent-hover);
}

/* Shortcuts */
.shortcuts-tab {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shortcut-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
}

.shortcut-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shortcut-title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.shortcut-error-badge {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.16);
  color: #f87171;
}

/* Search Results */
.search-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-card {
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 16px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.search-card:hover {
  background: var(--bg-surface-hover);
  border-color: rgba(255, 31, 75, 0.35);
}

.search-card-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.search-card-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.search-card-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.search-card-tab {
  font-size: 11px;
  font-weight: 600;
  color: #ff7a93;
  background: var(--accent-soft);
  padding: 3px 9px;
  border-radius: 999px;
  flex-shrink: 0;
}

.empty-search {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 16px;
  color: var(--text-muted);
}

.empty-search .material-symbols-outlined {
  font-size: 36px;
}

/* About Tab */
.about-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 12px 0 24px;
}

.about-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
}

.app-name {
  margin: 8px 0 0;
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.about-tagline {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.made-by {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--text-muted);
}

.made-by span {
  color: var(--text-primary);
  font-weight: 600;
}

.about-update-card {
  width: 100%;
  max-width: 520px;
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.update-check-button,
.update-ready-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border-radius: var(--radius-sm);
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.update-check-button {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
}

.update-check-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
}

.update-check-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.update-ready-button {
  background: var(--accent-primary);
  color: #ffffff;
  box-shadow: 0 4px 16px var(--accent-glow);
}

.update-status {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.update-status.muted {
  color: var(--text-muted);
}

.spinning {
  font-size: 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.version-grid {
  width: 100%;
  max-width: 520px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.version-cell {
  padding: 11px 13px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.cell-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.cell-value {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.about-links {
  display: flex;
  align-items: center;
  gap: 10px;
}

.about-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 15px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.14s ease, border-color 0.14s ease;
}

.about-link-btn:hover {
  background: var(--accent-soft);
  border-color: rgba(255, 31, 75, 0.35);
}

.about-link-btn .material-symbols-outlined {
  font-size: 16px;
}

.shield-stats-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.stat-card {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.stat-sub {
  font-size: 11.5px;
  color: var(--text-secondary);
}

.sb-cat-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sb-cat-chip {
  padding: 6px 11px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.14s ease;
}

.sb-cat-chip.active {
  background: var(--accent-soft);
  border-color: var(--accent-primary);
  color: #ffffff;
}

.rules-textarea,
.css-editor-textarea {
  width: 100%;
  min-height: 110px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: rgba(8, 9, 14, 0.85);
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
}

.css-editor-textarea {
  min-height: 140px;
}

.blocked-log-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 210px;
  overflow-y: auto;
}

.blocked-log-row {
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.blocked-log-url {
  font-size: 11.5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.blocked-log-meta {
  font-size: 10.5px;
  color: var(--text-muted);
}

.swatch-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.accent-swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.14s ease, border-color 0.14s ease;
}

.accent-swatch:hover {
  transform: scale(1.1);
}

.accent-swatch.active {
  border-color: #ffffff;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.25);
}

.snippet-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.snippet-btn {
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.snippet-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.eq-card {
  padding: 14px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.eq-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.eq-preset-select {
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid var(--border-subtle);
  background: rgba(14, 15, 22, 0.9);
  color: var(--text-primary);
  font-size: 12.5px;
}

.eq-bands-grid {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 8px;
}

.eq-band-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.eq-db-val {
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}

.eq-vertical-slider {
  writing-mode: vertical-lr;
  direction: rtl;
  width: 22px;
  height: 116px;
  accent-color: var(--accent-primary);
  cursor: pointer;
}

.eq-freq-label {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-muted);
}
</style>
