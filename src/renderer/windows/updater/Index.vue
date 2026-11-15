<script setup lang="ts">
import { ref } from "vue";
import ShieldLogo from "../../components/ShieldLogo.vue";

const appLoadingStatus = ref<string>("Checking for updates...");

window.ytmd.autoUpdater.onChecking(() => {
  appLoadingStatus.value = "Checking for updates...";
});
window.ytmd.autoUpdater.onNotAvailable(() => {
  appLoadingStatus.value = "Up to date";
});
window.ytmd.autoUpdater.onAvailable(() => {
  appLoadingStatus.value = "Downloading update...";
});
window.ytmd.autoUpdater.onDownloaded(() => {
  appLoadingStatus.value = "Restarting for update...";
});
window.ytmd.autoUpdater.onError(() => {
  appLoadingStatus.value = "Error checking for updates";
});
</script>

<template>
  <div class="app-updater-container">
    <ShieldLogo
      :size="84"
      glow
    />
    <span class="brand">YTM Shield</span>
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
    <p class="status-text">
      {{ appLoadingStatus }}
    </p>
  </div>
</template>

<style scoped>
.app-updater-container {
  height: 100%;
  background:
    radial-gradient(240px 200px at 50% 35%, rgba(255, 31, 75, 0.16), transparent 72%),
    var(--bg-base);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  user-select: none;
  -webkit-app-region: drag;
}

.brand {
  margin-top: 4px;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.status-text {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.music-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 46px;
  margin: 4px 0;
}

.loader-line {
  width: 5px;
  height: 4px;
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
    height: 5px;
    opacity: 0.45;
  }
  50% {
    height: 36px;
    opacity: 1;
  }
  100% {
    height: 5px;
    opacity: 0.45;
  }
}
</style>
