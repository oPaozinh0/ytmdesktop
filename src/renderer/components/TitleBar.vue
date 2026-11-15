<script setup lang="ts">
import { computed, onBeforeMount, ref } from "vue";
import ShieldLogo from "./ShieldLogo.vue";

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

if (props.isMainWindow) {
  const memoryStore = window.ytmd.memoryStore;
  const store = window.ytmd.store;

  onBeforeMount(async () => {
    ytmViewUnresponsive.value = (await memoryStore.get("ytmViewUnresponsive")) ?? false;
    appUpdateDownloaded.value = (await memoryStore.get("autoUpdaterDownloaded")) ?? false;
    adblockerReady.value = (await memoryStore.get("adblockerReady")) ?? false;
    adblockerFailed.value = (await memoryStore.get("adblockerFailed")) ?? false;
    adblockerBlockedCount.value = (await memoryStore.get("adblockerBlockedCount")) ?? 0;

    const adblockerConfig = await store.get("adblocker");
    adblockerEnabled.value = adblockerConfig?.blockerEnabled ?? true;
  });

  memoryStore.onStateChanged(newState => {
    ytmViewUnresponsive.value = newState.ytmViewUnresponsive ?? false;
    appUpdateDownloaded.value = newState.autoUpdaterDownloaded ?? false;
    adblockerReady.value = newState.adblockerReady ?? false;
    adblockerFailed.value = newState.adblockerFailed ?? false;
    adblockerBlockedCount.value = newState.adblockerBlockedCount ?? 0;
  });

  store.onDidAnyChange(newState => {
    adblockerEnabled.value = newState.adblocker?.blockerEnabled ?? true;
  });
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
</style>
