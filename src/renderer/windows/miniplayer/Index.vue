<script setup lang="ts">
import { ref } from "vue";
import Miniplayer from "./Miniplayer.vue";
import ShieldLogo from "../../components/ShieldLogo.vue";

const isWayland = ref(window.ytmd.isWayland());
const compactMode = ref(false);
const alwaysOnTop = ref(true);

function toggleCompactMode() {
  const next = !compactMode.value;
  compactMode.value = next;
  window.ytmd.setCompactMode(next);
}

window.ytmd.memoryStore?.onStateChanged?.(newState => {
  if (typeof newState.miniplayerCompactMode === "boolean") {
    compactMode.value = newState.miniplayerCompactMode;
  }
});

window.ytmd.handleWindowEvents(windowState => {
  alwaysOnTop.value = windowState.alwaysOnTop;
});

function closeMiniplayer() {
  window.ytmd.closeWindow();
}

function pinUnpinMiniplayer() {
  window.ytmd.setAlwaysOnTopWindow(!alwaysOnTop.value);
}
</script>

<template>
  <div
    class="miniplayer-root"
    :class="{ 'is-compact': compactMode }"
  >
    <div class="topbar">
      <div class="topbar-brand">
        <ShieldLogo :size="15" />
        <span>YTM Shield</span>
      </div>
      <div class="button-container">
        <button
          class="top-btn"
          :class="{ pinned: compactMode }"
          :title="compactMode ? 'Expand Miniplayer' : 'Compact Horizontal Bar'"
          @click="toggleCompactMode"
        >
          <span class="icon material-symbols-outlined">
            {{ compactMode ? "open_in_full" : "view_stream" }}
          </span>
        </button>
        <button
          class="top-btn pin"
          :class="{ pinned: alwaysOnTop }"
          :title="!isWayland ? 'Pin/Unpin Miniplayer' : 'Use your native window manager to pin the miniplayer'"
          :disabled="isWayland"
          @click="pinUnpinMiniplayer"
        >
          <span class="icon material-symbols-outlined">
            {{ alwaysOnTop ? "keep" : "keep_off" }}
          </span>
        </button>
        <button
          class="top-btn pip-exit"
          title="Return to main player"
          @click="closeMiniplayer"
        >
          <span class="icon material-symbols-outlined">pip_exit</span>
        </button>
      </div>
    </div>
    <Suspense>
      <Miniplayer />
    </Suspense>
  </div>
</template>

<style scoped>
.miniplayer-root {
  width: 100vw;
  height: 100vh;
  background: var(--bg-base);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.topbar {
  height: 36px;
  padding: 0 8px 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 20;
  background: linear-gradient(180deg, rgba(11, 12, 16, 0.72) 0%, rgba(11, 12, 16, 0) 100%);
  flex-shrink: 0;
  -webkit-app-region: drag;
}

.miniplayer-root.is-compact .topbar {
  height: 28px;
  padding: 2px 6px 0 8px;
}

.miniplayer-root.is-compact .top-btn {
  width: 22px;
  height: 22px;
  border-radius: 6px;
}

.miniplayer-root.is-compact .top-btn .icon {
  font-size: 14px;
}

.topbar-brand {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.85;
  -webkit-app-region: drag;
  user-select: none;
}

.topbar-brand span {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: rgba(244, 244, 246, 0.88);
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.75);
}

.button-container {
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag;
  pointer-events: auto;
}

.top-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 16, 22, 0.72);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-app-region: no-drag;
  pointer-events: auto;
  transition: background-color 0.14s ease, color 0.14s ease, border-color 0.14s ease;
}

.top-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.16);
  color: var(--text-primary);
}

.top-btn.pinned {
  color: #ff6e89;
  border-color: rgba(255, 31, 75, 0.35);
}

.top-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.top-btn .icon {
  font-size: 17px;
  -webkit-app-region: no-drag;
  pointer-events: auto;
  font-variation-settings:
    "FILL" 0,
    "wght" 350,
    "GRAD" 0,
    "opsz" 20;
}
</style>
