<script setup lang="ts">
import { computed, ref } from "vue";
import ShieldLogo from "./ShieldLogo.vue";
import { YTMViewStatus } from "~shared/types";

const unresponsive = ref(false);
const hide = ref(false);
const ytmViewLoadingStatus = ref<YTMViewStatus>(YTMViewStatus.Loading);
const ytmViewLoadingStatusMessage = computed(() => {
  switch (ytmViewLoadingStatus.value) {
    case YTMViewStatus.Loading:
      return "Connecting to YouTube Music...";
    case YTMViewStatus.Hooking:
      return "Initializing YTM Shield hooks...";
    case YTMViewStatus.Ready:
      return "Ready";
    default:
      return "";
  }
});
const ytmViewLoadTimedOut = ref(false);
const ytmViewLoadError = ref<{ code: number; description: string } | null>(null);

let ytmViewTimeout = setTimeout(() => {
  ytmViewLoadTimedOut.value = true;
}, 5 * 1000);

window.ytmd.ytmViewStatusChanged((status: YTMViewStatus) => {
  if (status !== YTMViewStatus.Ready) {
    ytmViewLoadTimedOut.value = false;
    clearTimeout(ytmViewTimeout);
    ytmViewTimeout = setTimeout(() => {
      ytmViewLoadTimedOut.value = true;
    }, 5 * 1000);
  }

  ytmViewLoadingStatus.value = status;
});
window.ytmd.ytmViewLoadError(loadError => {
  ytmViewLoadError.value = loadError;
});
window.ytmd.memoryStore.onStateChanged(newState => {
  unresponsive.value = newState.ytmViewUnresponsive ?? false;
});

window.ytmd.appViewHiding(() => {
  hide.value = true;
});
window.ytmd.appViewShowing(() => {
  hide.value = false;
});

function onHide() {
  window.ytmd.appViewHide();
}

function refreshYtm() {
  window.ytmd.ytmViewReload();
}
</script>

<template>
  <Transition
    name="fade"
    @after-leave="onHide"
  >
    <div
      v-if="!hide"
      class="ytmview-loading-container"
    >
      <Transition
        name="fade"
        @after-leave="onHide"
      >
        <div
          v-if="ytmViewLoadingStatus != YTMViewStatus.Ready"
          class="ytmview-loading"
        >
          <div class="loading-card">
            <ShieldLogo
              :size="96"
              glow
            />
            <h2 class="brand-name">
              YTM Shield
            </h2>

            <div class="music-loader">
              <div class="loader-line" />
              <div class="loader-line" />
              <div class="loader-line" />
              <div class="loader-line" />
              <div class="loader-line" />
              <div class="loader-line" />
              <div class="loader-line" />
              <div class="loader-line" />
            </div>

            <p
              v-if="!ytmViewLoadError"
              class="ytmview-loading-status"
            >
              {{ ytmViewLoadingStatusMessage }}
            </p>
            <div
              v-else
              class="load-error-container"
            >
              <p class="ytmview-loading-status error">
                Failed to load YouTube Music: {{ ytmViewLoadError.description }} ({{ ytmViewLoadError.code }})
              </p>
              <button
                class="refresh-ytm-button"
                @click="refreshYtm"
              >
                <span class="material-symbols-outlined">refresh</span>
                Retry Connection
              </button>
            </div>
            <div
              v-if="ytmViewLoadTimedOut && !ytmViewLoadError"
              class="ytmview-loading-timeout"
            >
              <span>YouTube Music is taking longer than usual to load...</span>
            </div>
          </div>
        </div>
      </Transition>
      <Transition
        name="fade"
        @after-leave="onHide"
      >
        <div
          v-if="unresponsive"
          class="ytmview-unresponsive"
        />
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.ytmview-loading-container {
  width: 100%;
  height: 100%;
}

.ytmview-loading {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  user-select: none;
  background:
    radial-gradient(520px 320px at 50% 40%, rgba(255, 31, 75, 0.14), transparent 70%),
    var(--bg-base);
}

.loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 36px 48px;
  border-radius: 22px;
  background: rgba(20, 22, 30, 0.65);
  border: 1px solid var(--border-subtle);
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow-elevated);
}

.brand-name {
  margin: 4px 0 0;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.ytmview-unresponsive {
  display: flex;
  width: 100%;
  height: 100%;
  background-color: rgba(11, 12, 16, 0.65);
  backdrop-filter: blur(4px);
  cursor: wait;
}

.ytmview-loading-status {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.load-error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 360px;
  text-align: center;
}

.ytmview-loading-status.error {
  color: #f87171;
}

.refresh-ytm-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--radius-sm);
  padding: 9px 16px;
  background: var(--accent-primary);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  box-shadow: 0 4px 16px var(--accent-glow);
}

.refresh-ytm-button:hover {
  background: var(--accent-hover);
}

.refresh-ytm-button .material-symbols-outlined {
  font-size: 17px;
}

.ytmview-loading-timeout {
  margin-top: 6px;
  color: #fbbf24;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.music-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 54px;
  margin: 6px 0;
}

.loader-line {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(180deg, #ff5275, var(--accent-primary));
  animation: musicloader 1.4s ease-in-out infinite;
}

.loader-line:nth-child(1) {
  animation-delay: 0.9s;
}
.loader-line:nth-child(2) {
  animation-delay: 0.7s;
}
.loader-line:nth-child(3) {
  animation-delay: 0.35s;
}
.loader-line:nth-child(4) {
  animation-delay: 0.15s;
}
.loader-line:nth-child(5) {
  animation-delay: 0.15s;
}
.loader-line:nth-child(6) {
  animation-delay: 0.35s;
}
.loader-line:nth-child(7) {
  animation-delay: 0.7s;
}
.loader-line:nth-child(8) {
  animation-delay: 0.9s;
}

@keyframes musicloader {
  0% {
    height: 6px;
    opacity: 0.45;
  }
  50% {
    height: 44px;
    opacity: 1;
  }
  100% {
    height: 6px;
    opacity: 0.45;
  }
}
</style>
