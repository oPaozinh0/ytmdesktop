<script setup lang="ts">
import { computed, nextTick, onBeforeMount, onMounted, onUnmounted, ref } from "vue";
import ShieldLogo from "./ShieldLogo.vue";
import { PlayerState, VideoState } from "~shared/playerstatestore/types";
import { MemoryStoreSchema, SleepTimerMode } from "~shared/store/schema";

const props = defineProps({
  title: {
    type: String,
    default: null
  },
  icon: {
    type: String,
    default: null
  },
  iconFile: {
    type: String,
    default: null
  },
  useShieldLogo: {
    type: Boolean,
    default: false
  },
  hasHomeButton: Boolean,
  hasSettingsButton: Boolean,
  hasMinimizeButton: Boolean,
  hasMaximizeButton: Boolean,
  centerTitleText: Boolean,
  isMainWindow: {
    type: Boolean,
    default: false
  }
});

const minimizeWindow = window.ytmd.minimizeWindow;
const maximizeWindow = window.ytmd.maximizeWindow;
const restoreWindow = window.ytmd.restoreWindow;
const closeWindow = window.ytmd.closeWindow;

const openSettingsWindow = window.ytmd.openSettingsWindow;
const navigateToDefault = window.ytmd.ytmViewNavigateDefault;
const goBack = window.ytmd.ytmViewGoBack;
const goForward = window.ytmd.ytmViewGoForward;
const reloadView = window.ytmd.ytmViewReload;

const wcoVisible = ref(window.navigator.windowControlsOverlay.visible);
const windowMaximized = ref(false);
const windowFullscreen = ref(false);

window.ytmd.handleWindowEvents(state => {
  windowMaximized.value = state.maximized;
  windowFullscreen.value = state.fullscreen;
});

window.navigator.windowControlsOverlay.addEventListener("geometrychange", event => {
  wcoVisible.value = event.visible;
});

function restartApplicationForUpdate() {
  window.ytmd.restartApplicationForUpdate();
}

const ytmViewUnresponsive = ref<boolean>(false);
const appUpdateDownloaded = ref<boolean>(false);
const adblockerEnabled = ref<boolean>(true);
const adblockerReady = ref<boolean>(false);
const adblockerFailed = ref<boolean>(false);
const adblockerBlockedCount = ref<number>(0);

const accentColor = ref<string>("#ff2e4c");
const accentRgb = ref<string>("255, 46, 76");
const sleepTimerMode = ref<SleepTimerMode>("off");
const sleepTimerEndTime = ref<number | null>(null);
const sleepTimerCountdown = ref<string>("");
const sponsorBlockLabel = ref<string>("");

const activeOverlay = ref<"none" | "palette" | "sleep">("none");
const paletteQuery = ref<string>("");
const paletteInputRef = ref<HTMLInputElement | null>(null);
const playerState = ref<PlayerState | null>(null);

let sponsorHideTimer: ReturnType<typeof setTimeout> | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let lastSponsorNoticeAt = 0;

function hexToRgb(hex: string): string {
  const cleaned = (hex || "").trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return "255, 46, 76";
}

function updateCountdownTick() {
  if (sleepTimerMode.value === "timed" && sleepTimerEndTime.value) {
    const remainingSec = Math.max(0, Math.ceil((sleepTimerEndTime.value - Date.now()) / 1000));
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    sleepTimerCountdown.value = `${mins}:${secs.toString().padStart(2, "0")}`;
  } else {
    sleepTimerCountdown.value = "";
  }
}

function syncSponsorNotice(notice: MemoryStoreSchema["sponsorBlockLastSkipped"]) {
  if (notice && notice.skippedAt > lastSponsorNoticeAt && Date.now() - notice.skippedAt < 6000) {
    lastSponsorNoticeAt = notice.skippedAt;
    const categoryMap: Record<string, string> = {
      sponsor: "Sponsor",
      selfpromo: "Self-Promo",
      interaction: "Interaction",
      intro: "Intro",
      outro: "Outro",
      preview: "Preview",
      music_offtopic: "Non-Music"
    };
    sponsorBlockLabel.value = categoryMap[notice.category] ?? notice.category;
    if (sponsorHideTimer) clearTimeout(sponsorHideTimer);
    sponsorHideTimer = setTimeout(() => {
      sponsorBlockLabel.value = "";
    }, 4500);
  }
}

onBeforeMount(async () => {
  const appearance = await window.ytmd.store?.get?.("appearance");
  if (appearance?.accentColor) {
    accentColor.value = appearance.accentColor;
    accentRgb.value = hexToRgb(appearance.accentColor);
  }
  window.ytmd.store?.onDidAnyChange?.(newState => {
    if (newState.appearance?.accentColor) {
      accentColor.value = newState.appearance.accentColor;
      accentRgb.value = hexToRgb(newState.appearance.accentColor);
    }
  });
});

if (props.isMainWindow) {
  const memoryStore = window.ytmd.memoryStore;
  const store = window.ytmd.store;

  onBeforeMount(async () => {
    ytmViewUnresponsive.value = (await memoryStore.get("ytmViewUnresponsive")) ?? false;
    appUpdateDownloaded.value = (await memoryStore.get("autoUpdaterDownloaded")) ?? false;
    adblockerReady.value = (await memoryStore.get("adblockerReady")) ?? false;
    adblockerFailed.value = (await memoryStore.get("adblockerFailed")) ?? false;
    adblockerBlockedCount.value = (await memoryStore.get("adblockerBlockedCount")) ?? 0;
    sleepTimerMode.value = (await memoryStore.get("sleepTimerMode")) ?? "off";
    sleepTimerEndTime.value = (await memoryStore.get("sleepTimerEndTime")) ?? null;
    updateCountdownTick();

    const adblockerConfig = await store.get("adblocker");
    adblockerEnabled.value = adblockerConfig?.blockerEnabled ?? true;

    try {
      playerState.value = (await window.ytmd.playerStore?.getState?.()) ?? null;
    } catch {
      // Initial player state may not be ready yet
    }
  });

  memoryStore.onStateChanged(newState => {
    ytmViewUnresponsive.value = newState.ytmViewUnresponsive ?? false;
    appUpdateDownloaded.value = newState.autoUpdaterDownloaded ?? false;
    adblockerReady.value = newState.adblockerReady ?? false;
    adblockerFailed.value = newState.adblockerFailed ?? false;
    adblockerBlockedCount.value = newState.adblockerBlockedCount ?? 0;
    sleepTimerMode.value = newState.sleepTimerMode ?? "off";
    sleepTimerEndTime.value = newState.sleepTimerEndTime ?? null;
    updateCountdownTick();
    syncSponsorNotice(newState.sponsorBlockLastSkipped ?? null);
  });

  store.onDidAnyChange(newState => {
    adblockerEnabled.value = newState.adblocker?.blockerEnabled ?? true;
  });

  window.ytmd.playerStore?.handleStateChanged?.(state => {
    playerState.value = state;
  });

  window.ytmd.onToggleCommandPalette?.(() => {
    void openCommandPalette();
  });
}

function closeOverlays() {
  if (activeOverlay.value === "none") return;
  activeOverlay.value = "none";
  paletteQuery.value = "";
  window.ytmd.setOverlayOpen(false);
}

async function openCommandPalette() {
  if (activeOverlay.value === "palette") {
    closeOverlays();
    return;
  }
  activeOverlay.value = "palette";
  window.ytmd.setOverlayOpen(true);
  try {
    playerState.value = (await window.ytmd.playerStore?.getState?.()) ?? playerState.value;
  } catch {
    // Ignore transient failure
  }
  await nextTick();
  paletteInputRef.value?.focus();
}

function openSleepTimerMenu() {
  if (activeOverlay.value === "sleep") {
    closeOverlays();
    return;
  }
  activeOverlay.value = "sleep";
  window.ytmd.setOverlayOpen(true);
}

function selectSleepTimer(option: number | "end_of_track") {
  window.ytmd.setSleepTimer(option);
  closeOverlays();
}

function onGlobalKeyDown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
    if (props.isMainWindow) {
      event.preventDefault();
      void openCommandPalette();
    }
  } else if (event.key === "Escape" && activeOverlay.value !== "none") {
    event.preventDefault();
    closeOverlays();
  }
}

onMounted(() => {
  window.addEventListener("keydown", onGlobalKeyDown);
  countdownTimer = setInterval(updateCountdownTick, 1000);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onGlobalKeyDown);
  if (countdownTimer) clearInterval(countdownTimer);
  if (sponsorHideTimer) clearTimeout(sponsorHideTimer);
});

const rootStyleVars = computed(() => ({
  "--accent-primary": accentColor.value,
  "--accent-soft": `rgba(${accentRgb.value}, 0.16)`,
  "--accent-glow": `rgba(${accentRgb.value}, 0.36)`
}));

const queueMatches = computed(() => {
  const items = playerState.value?.queue?.items ?? [];
  const q = paletteQuery.value.trim().toLowerCase();
  const mapped = items
    .map((item, idx) => (item ? { ...item, index: idx } : null))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  if (!q) return mapped.slice(0, 8);
  return mapped.filter(item => item.title.toLowerCase().includes(q) || item.author.toLowerCase().includes(q)).slice(0, 12);
});

const quickCommands = computed(() => {
  const isPlaying = playerState.value?.trackState === VideoState.Playing;
  const commands = [
    { id: "playPause", icon: isPlaying ? "pause" : "play_arrow", label: isPlaying ? "Pause playback" : "Resume playback", hint: "Playback", run: () => window.ytmd.executeCommandInYTMView("playPause") },
    { id: "next", icon: "skip_next", label: "Next track", hint: "Playback", run: () => window.ytmd.executeCommandInYTMView("next") },
    { id: "prev", icon: "skip_previous", label: "Previous track", hint: "Playback", run: () => window.ytmd.executeCommandInYTMView("previous") },
    { id: "shuffle", icon: "shuffle", label: "Toggle shuffle", hint: "Queue", run: () => window.ytmd.executeCommandInYTMView("shuffle") },
    { id: "repeat", icon: "repeat", label: "Cycle repeat mode", hint: "Queue", run: () => window.ytmd.executeCommandInYTMView("cycleRepeatMode") },
    { id: "miniplayer", icon: "picture_in_picture_alt", label: "Open Miniplayer", hint: "Window", run: () => window.ytmd.openMiniplayerWindow() },
    { id: "shield", icon: "shield", label: adblockerEnabled.value ? "Pause Ad Shield" : "Enable Ad Shield", hint: "Ad Shield", run: () => window.ytmd.store.set("adblocker.blockerEnabled", !adblockerEnabled.value) },
    { id: "settings-eq", icon: "equalizer", label: "Open Audio & 10-Band Equalizer", hint: "Settings", run: () => openSettingsWindow(3) },
    { id: "settings-look", icon: "palette", label: "Open Appearance & Live CSS", hint: "Settings", run: () => openSettingsWindow(2) },
    { id: "settings-shield", icon: "gpp_good", label: "Open Ad Shield & SponsorBlock", hint: "Settings", run: () => openSettingsWindow(6) },
    { id: "sleep-15", icon: "bedtime", label: "Sleep Timer: 15 minutes", hint: "Timer", run: () => window.ytmd.setSleepTimer(15) },
    { id: "sleep-30", icon: "bedtime", label: "Sleep Timer: 30 minutes", hint: "Timer", run: () => window.ytmd.setSleepTimer(30) },
    { id: "sleep-track", icon: "bedtime", label: "Sleep Timer: End of current track", hint: "Timer", run: () => window.ytmd.setSleepTimer("end_of_track") },
    { id: "sleep-off", icon: "bedtime_off", label: "Cancel Sleep Timer", hint: "Timer", run: () => window.ytmd.setSleepTimer(0) }
  ];
  const q = paletteQuery.value.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter(cmd => cmd.label.toLowerCase().includes(q) || cmd.hint.toLowerCase().includes(q));
});

function runPaletteCommand(fn: () => void) {
  closeOverlays();
  fn();
}

function submitYtmSearch() {
  const q = paletteQuery.value.trim();
  if (!q) return;
  closeOverlays();
  window.ytmd.searchYTM(q);
}

function handlePaletteEnter() {
  const q = paletteQuery.value.trim();
  if (q && quickCommands.value.length === 0 && queueMatches.value.length === 0) {
    submitYtmSearch();
  } else if (queueMatches.value.length > 0 && q) {
    const first = queueMatches.value[0];
    runPaletteCommand(() => window.ytmd.executeCommandInYTMView("playQueueIndex", first.index));
  } else if (quickCommands.value.length > 0) {
    runPaletteCommand(quickCommands.value[0].run);
  } else if (q) {
    submitYtmSearch();
  }
}

function playQueueTrack(index: number) {
  runPaletteCommand(() => window.ytmd.executeCommandInYTMView("playQueueIndex", index));
}

const shieldState = computed<"active" | "loading" | "paused" | "error">(() => {
  if (!adblockerEnabled.value) return "paused";
  if (adblockerFailed.value) return "error";
  if (adblockerReady.value) return "active";
  return "loading";
});

const shieldLabel = computed(() => {
  switch (shieldState.value) {
    case "paused":
      return "Shield Off";
    case "error":
      return "Shield Error";
    case "loading":
      return "Starting";
    case "active":
      return "Shield";
  }
});

const formattedBlockedCount = computed(() => {
  const count = adblockerBlockedCount.value;
  if (count >= 10000) return `${(count / 1000).toFixed(1)}k`;
  return `${count}`;
});

function toggleShield() {
  const next = !adblockerEnabled.value;
  adblockerEnabled.value = next;
  window.ytmd.store.set("adblocker.blockerEnabled", next);
}

function openShieldSettings() {
  openSettingsWindow(6);
}
</script>

<template>
  <div :style="rootStyleVars">
    <div
      v-if="!windowFullscreen"
      class="titlebar"
      :class="{ 'is-main': isMainWindow }"
    >
    <div class="left">
      <div class="brand">
        <ShieldLogo
          v-if="useShieldLogo"
          :size="18"
          class="brand-svg"
        />
        <span
          v-else-if="icon"
          class="icon material-symbols-outlined"
        >{{ icon }}</span>
        <img
          v-else-if="iconFile"
          class="icon"
          :src="iconFile"
        >
        <p
          v-if="title && !centerTitleText"
          class="title-text"
        >
          {{ title }}
        </p>
        <span
          v-if="ytmViewUnresponsive"
          class="unresponsive-tag"
        >
          Unresponsive
        </span>
      </div>

      <div
        v-if="isMainWindow"
        class="nav-cluster"
      >
        <button
          class="nav-btn"
          title="Back"
          @click="goBack"
        >
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <button
          class="nav-btn"
          title="Forward"
          @click="goForward"
        >
          <span class="material-symbols-outlined">arrow_forward</span>
        </button>
        <button
          class="nav-btn"
          title="Reload"
          @click="reloadView"
        >
          <span class="material-symbols-outlined">refresh</span>
        </button>
        <button
          v-if="hasHomeButton"
          class="nav-btn"
          title="Home"
          @click="navigateToDefault"
        >
          <span class="material-symbols-outlined">home</span>
        </button>
      </div>
    </div>

    <div
      v-if="title && centerTitleText"
      class="center"
    >
      <p class="title-text">
        {{ title }}{{ ytmViewUnresponsive ? " (Unresponsive)" : "" }}
      </p>
    </div>

    <div class="right">
      <div
        v-if="isMainWindow"
        class="titlebar-pills"
      >
        <div
          v-if="sponsorBlockLabel"
          class="sb-pill"
          :title="`SponsorBlock auto-skipped ${sponsorBlockLabel}`"
        >
          <span class="material-symbols-outlined">fast_forward</span>
          <span>Skipped {{ sponsorBlockLabel }}</span>
        </div>

        <button
          class="cmd-trigger-pill"
          title="Command Palette & Search (Ctrl+K)"
          @click="openCommandPalette"
        >
          <span class="material-symbols-outlined">search</span>
          <span class="cmd-trigger-label">Search / Commands</span>
          <kbd>Ctrl+K</kbd>
        </button>

        <button
          class="sleep-pill"
          :class="{ active: sleepTimerMode !== 'off' }"
          :title="sleepTimerMode !== 'off' ? `Sleep Timer: ${sleepTimerCountdown || 'End of track'}` : 'Sleep Timer'"
          @click="openSleepTimerMenu"
        >
          <span class="material-symbols-outlined">bedtime</span>
          <span
            v-if="sleepTimerMode !== 'off'"
            class="sleep-countdown"
          >
            {{ sleepTimerMode === "end_of_track" ? "End" : sleepTimerCountdown }}
          </span>
        </button>
      </div>
      <div
        v-if="isMainWindow"
        class="shield-pill"
        :class="shieldState"
      >
        <button
          class="shield-pill-main"
          title="Open Ad Shield settings"
          @click="openShieldSettings"
        >
          <span class="shield-dot" />
          <span class="shield-text">{{ shieldLabel }}</span>
          <span
            v-if="shieldState === 'active'"
            class="shield-count"
          >
            {{ formattedBlockedCount }}
          </span>
        </button>
        <button
          class="shield-toggle-btn"
          :title="adblockerEnabled ? 'Pause YTM Shield' : 'Enable YTM Shield'"
          @click="toggleShield"
        >
          <span class="material-symbols-outlined">
            {{ adblockerEnabled ? "pause" : "play_arrow" }}
          </span>
        </button>
      </div>

      <button
        v-if="isMainWindow && appUpdateDownloaded"
        class="update-pill"
        tabindex="1"
        title="Update ready! Click to restart"
        @click="restartApplicationForUpdate"
      >
        <span class="material-symbols-outlined">upgrade</span>
        <span>Update</span>
      </button>

      <div class="app-buttons">
        <slot name="app-buttons" />
        <button
          v-if="hasHomeButton && !isMainWindow"
          class="app-button"
          tabindex="2"
          title="Home"
          @click="navigateToDefault"
        >
          <span class="material-symbols-outlined">home</span>
        </button>
        <button
          v-if="hasSettingsButton"
          class="app-button"
          tabindex="3"
          title="Settings"
          @click="openSettingsWindow()"
        >
          <span class="material-symbols-outlined">settings</span>
        </button>
      </div>

      <div
        v-if="!wcoVisible"
        class="windows-action-buttons"
      >
        <button
          v-if="hasMinimizeButton"
          class="action-button window-minimize"
          tabindex="4"
          @click="minimizeWindow"
        >
          <span class="material-symbols-outlined">remove</span>
        </button>
        <button
          v-if="hasMaximizeButton && !windowMaximized"
          class="action-button window-maximize"
          tabindex="5"
          @click="maximizeWindow"
        >
          <span class="material-symbols-outlined">square</span>
        </button>
        <button
          v-if="hasMinimizeButton && windowMaximized"
          class="action-button window-restore"
          tabindex="6"
          @click="restoreWindow"
        >
          <span class="material-symbols-outlined">filter_none</span>
        </button>
        <button
          class="action-button window-close"
          tabindex="7"
          @click="closeWindow"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  </div>

    <div
      v-if="activeOverlay === 'palette'"
      class="overlay-backdrop"
      @click.self="closeOverlays"
    >
      <div class="palette-card">
        <div class="palette-input-row">
          <span class="material-symbols-outlined">search</span>
          <input
            ref="paletteInputRef"
            v-model="paletteQuery"
            type="text"
            class="palette-input"
            placeholder="Search YouTube Music, jump queue, or run command..."
            @keydown.enter.prevent="handlePaletteEnter"
            @keydown.esc.prevent="closeOverlays"
          >
          <span class="palette-esc">ESC</span>
        </div>

        <div class="palette-scroll">
          <div v-if="paletteQuery.trim()">
            <p class="palette-section-title">
              YouTube Music Search
            </p>
            <button
              class="palette-item highlighted"
              @click="submitYtmSearch"
            >
              <span class="material-symbols-outlined">travel_explore</span>
              <div class="palette-item-meta">
                <span class="palette-item-title">Search "{{ paletteQuery.trim() }}" on YouTube Music</span>
                <span class="palette-item-sub">Navigates without stopping current track</span>
              </div>
              <span class="palette-item-hint">Search</span>
            </button>
          </div>

          <div v-if="queueMatches.length > 0">
            <p class="palette-section-title">
              Up Next / Queue ({{ queueMatches.length }})
            </p>
            <button
              v-for="track in queueMatches"
              :key="`${track.videoId}-${track.index}`"
              class="palette-item"
              @click="playQueueTrack(track.index)"
            >
              <span class="material-symbols-outlined">{{ track.selected ? "graphic_eq" : "queue_music" }}</span>
              <div class="palette-item-meta">
                <span class="palette-item-title">{{ track.title }}</span>
                <span class="palette-item-sub">{{ track.author }}</span>
              </div>
              <span class="palette-item-hint">{{ track.selected ? "Playing" : track.duration }}</span>
            </button>
          </div>

          <div v-if="quickCommands.length > 0">
            <p class="palette-section-title">
              Commands & Shortcuts
            </p>
            <button
              v-for="cmd in quickCommands"
              :key="cmd.id"
              class="palette-item"
              @click="runPaletteCommand(cmd.run)"
            >
              <span class="material-symbols-outlined">{{ cmd.icon }}</span>
              <div class="palette-item-meta">
                <span class="palette-item-title">{{ cmd.label }}</span>
              </div>
              <span class="palette-item-hint">{{ cmd.hint }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="activeOverlay === 'sleep'"
      class="overlay-backdrop"
      @click.self="closeOverlays"
    >
      <div class="sleep-popover">
        <div class="sleep-popover-header">
          <h3>Sleep Timer</h3>
          <span
            v-if="sleepTimerMode !== 'off'"
            class="palette-item-hint"
          >
            {{ sleepTimerMode === "end_of_track" ? "Ends after track" : `${sleepTimerCountdown} remaining` }}
          </span>
        </div>
        <div class="sleep-grid">
          <button
            class="sleep-option-btn"
            @click="selectSleepTimer(15)"
          >
            15 minutes
          </button>
          <button
            class="sleep-option-btn"
            @click="selectSleepTimer(30)"
          >
            30 minutes
          </button>
          <button
            class="sleep-option-btn"
            @click="selectSleepTimer(45)"
          >
            45 minutes
          </button>
          <button
            class="sleep-option-btn"
            @click="selectSleepTimer(60)"
          >
            1 hour
          </button>
          <button
            class="sleep-option-btn"
            @click="selectSleepTimer('end_of_track')"
          >
            End of track
          </button>
          <button
            class="sleep-option-btn"
            @click="selectSleepTimer(0)"
          >
            Turn Off
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.titlebar {
  left: env(titlebar-area-x, 0);
  width: env(titlebar-area-width, 100%);
  height: 36px;
  user-select: none;
  -webkit-app-region: drag;
  background: linear-gradient(180deg, rgba(16, 17, 24, 0.98) 0%, rgba(11, 12, 16, 0.98) 100%);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  padding: 0 6px 0 10px;
  box-sizing: border-box;
}

.titlebar .left,
.titlebar .right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.titlebar .center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.brand-svg {
  flex-shrink: 0;
}

.brand .icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  flex-shrink: 0;
}

.brand .icon.material-symbols-outlined {
  font-size: 18px;
  font-variation-settings:
    "FILL" 0,
    "wght" 300,
    "GRAD" 0,
    "opsz" 20;
}

.title-text {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unresponsive-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--shield-error);
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 999px;
  padding: 1px 8px;
  line-height: 1.4;
}

.nav-cluster {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  -webkit-app-region: no-drag;
}

.nav-btn {
  width: 24px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 5px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.nav-btn .material-symbols-outlined {
  font-size: 16px;
  font-variation-settings:
    "FILL" 0,
    "wght" 350,
    "GRAD" 0,
    "opsz" 20;
}

.shield-pill {
  display: flex;
  align-items: center;
  height: 24px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  overflow: hidden;
  -webkit-app-region: no-drag;
  transition: border-color 0.16s ease, background-color 0.16s ease;
}

.shield-pill.active {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.28);
}

.shield-pill.error {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.32);
}

.shield-pill.paused {
  background: rgba(255, 255, 255, 0.03);
  border-color: var(--border-subtle);
}

.shield-pill-main {
  height: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px 0 9px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.14s ease;
}

.shield-pill-main:hover {
  background: rgba(255, 255, 255, 0.06);
}

.shield-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
}

.shield-pill.active .shield-dot {
  background: var(--shield-ok);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
}

.shield-pill.loading .shield-dot {
  background: var(--shield-warn);
}

.shield-pill.error .shield-dot {
  background: var(--shield-error);
}

.shield-text {
  letter-spacing: 0.01em;
}

.shield-count {
  font-variant-numeric: tabular-nums;
  font-size: 10px;
  font-weight: 700;
  color: #bbf7d0;
  background: rgba(34, 197, 94, 0.18);
  padding: 1px 6px;
  border-radius: 999px;
}

.shield-toggle-btn {
  height: 100%;
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.shield-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.shield-toggle-btn .material-symbols-outlined {
  font-size: 14px;
  font-variation-settings:
    "FILL" 1,
    "wght" 400,
    "GRAD" 0,
    "opsz" 20;
}

.update-pill {
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid rgba(255, 31, 75, 0.4);
  background: rgba(255, 31, 75, 0.14);
  color: #ff708c;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  -webkit-app-region: no-drag;
  transition: background-color 0.15s ease;
}

.update-pill:hover {
  background: rgba(255, 31, 75, 0.24);
}

.update-pill .material-symbols-outlined {
  font-size: 15px;
}

.titlebar .right .app-buttons {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 3px;
  margin-right: 4px;
}

:deep(.app-button) {
  height: 26px;
  width: 28px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-app-region: no-drag;
  border: 1px solid transparent;
  border-radius: 6px;
  font-variation-settings:
    "FILL" 0,
    "wght" 300,
    "GRAD" 0,
    "opsz" 24;
  cursor: pointer;
  transition: background-color 0.14s ease, border-color 0.14s ease, color 0.14s ease;
}

:deep(.app-button:hover) {
  background-color: rgba(255, 255, 255, 0.08);
  border-color: var(--border-subtle);
  color: var(--text-primary);
}

:deep(.app-button) > .material-symbols-outlined {
  font-size: 18px;
  color: inherit;
}

.action-button {
  width: 40px;
  height: 36px;
  background: none;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-app-region: no-drag;
  border: none;
  font-variation-settings:
    "FILL" 0,
    "wght" 200,
    "GRAD" 0,
    "opsz" 20;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.action-button:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.action-button > .material-symbols-outlined {
  font-size: 20px;
}

.windows-action-buttons {
  display: flex;
  margin-left: 4px;
  margin-right: -6px;
}

.window-restore > .material-symbols-outlined {
  transform: rotate(180deg);
}

.window-close:hover {
  background-color: #e81123;
  color: #ffffff;
}

.titlebar-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  -webkit-app-region: no-drag;
}

.sb-pill {
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.16);
  border: 1px solid rgba(16, 185, 129, 0.36);
  color: #a7f3d0;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.sb-pill .material-symbols-outlined {
  font-size: 14px;
}

.cmd-trigger-pill {
  height: 24px;
  padding: 0 8px;
  border-radius: 7px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: background-color 0.14s ease, border-color 0.14s ease, color 0.14s ease;
}

.cmd-trigger-pill:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.cmd-trigger-pill .material-symbols-outlined {
  font-size: 14px;
}

.cmd-trigger-pill kbd {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 600;
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.07);
  color: var(--text-muted);
}

.sleep-pill {
  height: 24px;
  padding: 0 7px;
  border-radius: 7px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: background-color 0.14s ease, border-color 0.14s ease, color 0.14s ease;
}

.sleep-pill:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.sleep-pill.active {
  background: var(--accent-soft);
  border-color: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.sleep-pill .material-symbols-outlined {
  font-size: 14px;
}

.sleep-countdown {
  font-variant-numeric: tabular-nums;
}

.overlay-backdrop {
  position: fixed;
  top: 36px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(6, 7, 11, 0.72);
  backdrop-filter: blur(18px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 48px 20px 20px;
  box-sizing: border-box;
}

.palette-card {
  width: min(560px, 100%);
  max-height: calc(100vh - 110px);
  border-radius: 14px;
  background: rgba(16, 18, 26, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.palette-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-subtle);
}

.palette-input-row .material-symbols-outlined {
  font-size: 20px;
  color: var(--accent-primary);
}

.palette-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 14px;
  font-family: var(--font-sans);
}

.palette-esc {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
}

.palette-scroll {
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.palette-section-title {
  margin: 2px 8px 4px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.palette-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.palette-item:hover,
.palette-item.highlighted {
  background: var(--accent-soft);
}

.palette-item .material-symbols-outlined {
  font-size: 18px;
  color: var(--text-secondary);
}

.palette-item-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.palette-item-title {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.palette-item-sub {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.palette-item-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.sleep-popover {
  width: min(320px, 100%);
  border-radius: 14px;
  background: rgba(16, 18, 26, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sleep-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sleep-popover-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.sleep-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.sleep-option-btn {
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.14s ease, border-color 0.14s ease;
}

.sleep-option-btn:hover {
  background: var(--accent-soft);
  border-color: var(--accent-primary);
}
</style>
