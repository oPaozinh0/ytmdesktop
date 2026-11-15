<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef } from "vue";
import { LikeStatus, PlayerState, RepeatMode, Thumbnail, VideoState } from "~shared/playerstatestore/types";
import { SleepTimerMode } from "~shared/store/schema";
import RangeInput from "../../components/RangeInput.vue";
import ShieldLogo from "../../components/ShieldLogo.vue";

const state = ref<PlayerState | null>(null);
state.value = await window.ytmd.playerStore.getState();

const volume = ref(state.value?.volume ?? 0);
const videoProgress = ref(0);
const videoLength = ref(0);
const videoId = ref("");
const thumbnailUrl = ref<string>("");

const compactMode = ref(false);
const activePanel = ref<"none" | "queue" | "info">("none");
const sleepTimerMode = ref<SleepTimerMode>("off");
const blockedCount = ref(0);
const accentColor = ref("#ff2e4c");
const accentRgb = ref("255, 46, 76");

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

const miniplayerStyleVars = computed(() => ({
  "--accent-primary": accentColor.value,
  "--accent-hover": accentColor.value,
  "--accent-soft": `rgba(${accentRgb.value}, 0.16)`
}));

function togglePanel(panel: "queue" | "info") {
  activePanel.value = activePanel.value === panel ? "none" : panel;
}

const queueItems = computed(() => {
  const items = state.value?.queue?.items ?? [];
  return items
    .map((item, idx) => (item ? { ...item, index: idx } : null))
    .filter((item): item is NonNullable<typeof item> => item !== null);
});

function playQueueIndex(index: number) {
  window.ytmd.executeCommandInYTMView("playQueueIndex", index);
}

function removeQueueIndex(index: number) {
  window.ytmd.executeCommandInYTMView("queueRemove", index);
}

function selectSleepTimer(option: number | "end_of_track") {
  window.ytmd.setSleepTimer(option);
}

const seekbarContainer = useTemplateRef("seekbarContainer");
const infoContainer = useTemplateRef("infoContainer");
const infoTitle = useTemplateRef("infoTitle");

function getHighestResThumbnail(thumbnails?: Thumbnail[]): string {
  if (!thumbnails || thumbnails.length === 0) return "";
  return thumbnails.reduce(
    (accumulator, current) => (current.height * current.width <= accumulator.height * accumulator.width ? accumulator : current),
    thumbnails[0]
  ).url;
}

let seekbarDragging = false;

async function stateChanged(newState: PlayerState | null) {
  if (!newState) {
    state.value = null;
    thumbnailUrl.value = "";
    return;
  }

  state.value = newState;

  if (newState.videoDetails) {
    if (newState.videoDetails.id !== videoId.value) {
      thumbnailUrl.value = getHighestResThumbnail(newState.videoDetails.thumbnails);
      videoLength.value = newState.videoDetails.durationSeconds;
      videoId.value = newState.videoDetails.id;

      nextTick(() => {
        reconcileMarquee();
      });
    } else if (!thumbnailUrl.value) {
      thumbnailUrl.value = getHighestResThumbnail(newState.videoDetails.thumbnails);
    }
  }

  if (!seekbarDragging) {
    videoProgress.value = newState.videoProgress ?? 0;
  }

  volume.value = newState.volume ?? 0;
}

function reconcileMarquee() {
  if (infoTitle.value && infoContainer.value) {
    if (infoTitle.value.scrollWidth > infoContainer.value.clientWidth) {
      infoTitle.value.classList.add("marquee");
    } else {
      infoTitle.value.classList.remove("marquee");
    }
  }
}

onMounted(async () => {
  window.ytmd.playerStore.handleStateChanged(newState => {
    stateChanged(newState);
  });

  const mem = window.ytmd.memoryStore;
  if (mem) {
    compactMode.value = (await mem.get("miniplayerCompactMode")) ?? false;
    sleepTimerMode.value = (await mem.get("sleepTimerMode")) ?? "off";
    blockedCount.value = (await mem.get("adblockerBlockedCount")) ?? 0;
    mem.onStateChanged(newState => {
      if (typeof newState.miniplayerCompactMode === "boolean") {
        compactMode.value = newState.miniplayerCompactMode;
        if (compactMode.value) activePanel.value = "none";
      }
      if (newState.sleepTimerMode) sleepTimerMode.value = newState.sleepTimerMode;
      if (typeof newState.adblockerBlockedCount === "number") blockedCount.value = newState.adblockerBlockedCount;
    });
  }

  const store = window.ytmd.store;
  if (store) {
    const appearance = await store.get("appearance");
    if (appearance?.accentColor) {
      accentColor.value = appearance.accentColor;
      accentRgb.value = hexToRgb(appearance.accentColor);
    }
    store.onDidAnyChange(newState => {
      if (newState.appearance?.accentColor) {
        accentColor.value = newState.appearance.accentColor;
        accentRgb.value = hexToRgb(newState.appearance.accentColor);
      }
    });
  }

  window.ytmd.requestWindowState();
  stateChanged(state.value);
});

const seekHandleVisible = ref(false);

function showSeekHandle() {
  seekHandleVisible.value = true;
}

function hideSeekHandle() {
  seekHandleVisible.value = false;
}

function startDrag(event: MouseEvent) {
  seekbarDragging = true;
  seek(event);

  document.body.style.userSelect = "none";
}

function getOffsetX(event: MouseEvent, rect: DOMRect) {
  let offsetX = event.clientX - rect.left;
  offsetX = Math.max(0, Math.min(offsetX, rect.width));
  return offsetX;
}

function seek(event: MouseEvent) {
  if (!seekbarContainer.value || !videoLength.value) return;
  const seekbarRect = seekbarContainer.value.getBoundingClientRect();
  const offsetX = getOffsetX(event, seekbarRect);
  const seekToValue = (offsetX * videoLength.value) / seekbarRect.width;
  videoProgress.value = seekToValue;
  window.ytmd.executeCommandInYTMView("seekTo", seekToValue);
}

document.addEventListener("mousemove", event => {
  if (!seekbarDragging) return;
  if (event.clientX > -1) {
    seek(event);
  }
});

document.addEventListener("mouseup", () => {
  if (seekbarDragging) {
    seekbarDragging = false;
    document.body.style.userSelect = "";
  }
});

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

const progressPercent = computed(() => {
  if (!videoLength.value || videoLength.value <= 0) return 0;
  return Math.min(100, Math.max(0, (videoProgress.value / videoLength.value) * 100));
});

const hasActiveTrack = computed(() => Boolean(state.value?.videoDetails?.id && state.value?.videoDetails?.title));

const isLiked = computed(() => state.value?.videoDetails?.likeStatus === LikeStatus.Like);
const isDisliked = computed(() => state.value?.videoDetails?.likeStatus === LikeStatus.Dislike);

function closeMiniplayer() {
  window.ytmd.closeWindow();
}
function previousVideo() {
  window.ytmd.executeCommandInYTMView("previous");
}
function playPauseVideo() {
  window.ytmd.executeCommandInYTMView("playPause");
}
function nextVideo() {
  window.ytmd.executeCommandInYTMView("next");
}
function toggleLike() {
  window.ytmd.executeCommandInYTMView("toggleLike");
}
function toggleDislike() {
  window.ytmd.executeCommandInYTMView("toggleDislike");
}
function shuffleQueue() {
  window.ytmd.executeCommandInYTMView("shuffle");
}
function cycleRepeat() {
  window.ytmd.executeCommandInYTMView("cycleRepeatMode");
}
function volumeChanged() {
  window.ytmd.executeCommandInYTMView("setVolume", volume.value);
}
function toggleMute() {
  if (!state.value?.muted) {
    window.ytmd.executeCommandInYTMView("mute");
  } else {
    window.ytmd.executeCommandInYTMView("unmute");
  }
}

window.addEventListener("resize", reconcileMarquee);
</script>

<template>
  <div
    class="container"
    :class="{ compact: compactMode }"
    :style="miniplayerStyleVars"
  >
    <div
      class="bg-art"
      :style="hasActiveTrack && thumbnailUrl ? { backgroundImage: `url('${thumbnailUrl}')` } : {}"
    />
    <div class="bg-scrim" />

    <div
      v-if="compactMode"
      class="compact-bar"
    >
      <div class="compact-track">
        <img
          v-if="hasActiveTrack && thumbnailUrl"
          :src="thumbnailUrl"
          alt="Cover"
          class="compact-thumb"
          draggable="false"
        >
        <div
          v-else
          class="compact-thumb placeholder"
        >
          <ShieldLogo :size="18" />
        </div>
        <div class="compact-meta">
          <span class="compact-title">{{ hasActiveTrack ? state!.videoDetails!.title : "No track playing" }}</span>
          <span class="compact-artist">{{ hasActiveTrack ? state!.videoDetails!.author : "Click Play to listen" }}</span>
        </div>
      </div>

      <div class="compact-controls">
        <button
          class="ctrl-btn"
          title="Previous"
          @click="previousVideo"
        >
          <span class="icon material-symbols-outlined">skip_previous</span>
        </button>
        <button
          class="play-pause-btn compact-pp"
          title="Play / Pause"
          @click="playPauseVideo"
        >
          <span
            v-if="!hasActiveTrack || state?.trackState === VideoState.Paused || state?.trackState === VideoState.Unknown"
            class="icon material-symbols-outlined"
          >play_arrow</span>
          <span
            v-else-if="state?.trackState === VideoState.Playing"
            class="icon material-symbols-outlined"
          >pause</span>
          <span
            v-else
            class="icon material-symbols-outlined spinning"
          >progress_activity</span>
        </button>
        <button
          class="ctrl-btn"
          title="Next"
          @click="nextVideo"
        >
          <span class="icon material-symbols-outlined">skip_next</span>
        </button>
      </div>

      <div class="compact-progress-track">
        <div
          class="compact-progress-fill"
          :style="{ width: `${hasActiveTrack ? progressPercent : 0}%` }"
        />
      </div>
    </div>

    <template v-else>
      <div
        v-if="activePanel !== 'none'"
        class="drawer-overlay"
      >
        <div class="drawer-header">
          <span class="drawer-title">
            {{ activePanel === "queue" ? `Queue (${queueItems.length})` : "Track Info & Sleep Timer" }}
          </span>
          <button
            class="ctrl-btn"
            title="Close panel"
            @click="activePanel = 'none'"
          >
            <span class="icon material-symbols-outlined">close</span>
          </button>
        </div>

        <div
          v-if="activePanel === 'queue'"
          class="drawer-body queue-list"
        >
          <div
            v-if="queueItems.length === 0"
            class="drawer-empty"
          >
            Queue is empty
          </div>
          <div
            v-for="item in queueItems"
            :key="`${item.videoId}-${item.index}`"
            class="queue-row"
            :class="{ selected: item.selected }"
          >
            <button
              class="queue-row-main"
              @click="playQueueIndex(item.index)"
            >
              <span class="material-symbols-outlined queue-state-icon">
                {{ item.selected ? "graphic_eq" : "music_note" }}
              </span>
              <div class="queue-row-meta">
                <span class="queue-row-title">{{ item.title }}</span>
                <span class="queue-row-author">{{ item.author }}</span>
              </div>
              <span class="queue-row-dur">{{ item.duration }}</span>
            </button>
            <button
              class="queue-remove-btn"
              title="Remove from queue"
              @click.stop="removeQueueIndex(item.index)"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div
          v-else
          class="drawer-body info-panel"
        >
          <div class="info-card">
            <div class="info-row">
              <span class="info-key">Track</span>
              <span class="info-val">{{ state?.videoDetails?.title || "Idle" }}</span>
            </div>
            <div class="info-row">
              <span class="info-key">Artist</span>
              <span class="info-val">{{ state?.videoDetails?.author || "—" }}</span>
            </div>
            <div class="info-row">
              <span class="info-key">Album</span>
              <span class="info-val">{{ state?.videoDetails?.album || "Single / Unknown" }}</span>
            </div>
            <div class="info-row">
              <span class="info-key">Shield Blocked</span>
              <span class="info-val">{{ blockedCount }} this session</span>
            </div>
          </div>

          <p class="drawer-subtitle">
            Sleep Timer ({{ sleepTimerMode === "off" ? "Off" : sleepTimerMode === "end_of_track" ? "End of track" : "Active" }})
          </p>
          <div class="sleep-chip-grid">
            <button
              class="sleep-chip"
              @click="selectSleepTimer(15)"
            >
              15m
            </button>
            <button
              class="sleep-chip"
              @click="selectSleepTimer(30)"
            >
              30m
            </button>
            <button
              class="sleep-chip"
              @click="selectSleepTimer(60)"
            >
              60m
            </button>
            <button
              class="sleep-chip"
              @click="selectSleepTimer('end_of_track')"
            >
              End track
            </button>
            <button
              class="sleep-chip"
              @click="selectSleepTimer(0)"
            >
              Off
            </button>
          </div>
        </div>
      </div>

      <div
        v-else
        class="artwork-stage"
      >
        <div
          v-if="hasActiveTrack && thumbnailUrl"
          class="cover-frame"
        >
          <img
            :src="thumbnailUrl"
            alt="Album cover"
            class="cover-image"
            draggable="false"
          >
        </div>
        <div
          v-else-if="!hasActiveTrack"
          class="idle-stage"
        >
          <ShieldLogo
            :size="44"
            glow
          />
          <p class="idle-title">
            No music playing
          </p>
          <div class="idle-actions">
            <button
              class="idle-btn primary"
              @click="playPauseVideo"
            >
              <span class="material-symbols-outlined">play_arrow</span>
              Play Music
            </button>
            <button
              class="idle-btn secondary"
              @click="closeMiniplayer"
            >
              <span class="material-symbols-outlined">pip_exit</span>
              Back to App
            </button>
          </div>
        </div>
      </div>

      <div class="glass-dock">
        <div class="track-header">
          <div class="track-meta">
            <div
              ref="infoContainer"
              class="video-info"
            >
              <span
                ref="infoTitle"
                class="title"
              >{{ hasActiveTrack ? state!.videoDetails!.title : "No track selected" }}</span>
            </div>
            <span class="artist">{{ hasActiveTrack ? state!.videoDetails!.author : "Click Play to start listening" }}</span>
          </div>
          <div class="dock-header-actions">
            <button
              class="ctrl-btn"
              :class="{ active: activePanel === 'queue' }"
              title="Queue Drawer"
              @click="togglePanel('queue')"
            >
              <span class="icon material-symbols-outlined">queue_music</span>
            </button>
            <button
              class="ctrl-btn"
              :class="{ active: activePanel === 'info' || sleepTimerMode !== 'off' }"
              title="Track Info & Sleep Timer"
              @click="togglePanel('info')"
            >
              <span class="icon material-symbols-outlined">{{ sleepTimerMode !== "off" ? "bedtime" : "info" }}</span>
            </button>
            <button
              class="ctrl-btn dock-exit-btn"
              title="Return to main player"
              @click="closeMiniplayer"
            >
              <span class="icon material-symbols-outlined">pip_exit</span>
            </button>
          </div>
        </div>

      <div class="seek-row">
        <span class="time-label">{{ hasActiveTrack ? formatTime(videoProgress) : "0:00" }}</span>
        <div
          ref="seekbarContainer"
          class="seekbar-container"
          :class="{ disabled: !hasActiveTrack }"
          @mouseenter="hasActiveTrack && showSeekHandle()"
          @mouseleave="hideSeekHandle"
          @mousedown="hasActiveTrack && startDrag($event)"
        >
          <div class="seekbar">
            <div
              class="progress"
              :style="{ width: `${hasActiveTrack ? progressPercent : 0}%` }"
            />
            <div
              v-if="hasActiveTrack && seekHandleVisible"
              class="handle"
              :style="{ left: `${progressPercent}%` }"
            />
          </div>
        </div>
        <span class="time-label">{{ hasActiveTrack ? (state?.videoDetails?.isLive ? "LIVE" : formatTime(videoLength)) : "0:00" }}</span>
      </div>

      <div class="video-controls">
        <div class="controls-left">
          <button
            class="ctrl-btn"
            :class="{ active: hasActiveTrack && isDisliked }"
            :disabled="!hasActiveTrack"
            title="Dislike"
            @click="toggleDislike"
          >
            <span class="icon material-symbols-outlined">thumb_down</span>
          </button>
          <button
            class="ctrl-btn"
            :class="{ active: hasActiveTrack && isLiked }"
            :disabled="!hasActiveTrack"
            title="Like"
            @click="toggleLike"
          >
            <span class="icon material-symbols-outlined">thumb_up</span>
          </button>
        </div>

        <div class="controls-center">
          <button
            class="ctrl-btn"
            title="Previous"
            @click="previousVideo"
          >
            <span class="icon material-symbols-outlined">skip_previous</span>
          </button>
          <button
            class="play-pause-btn"
            title="Play / Pause"
            @click="playPauseVideo"
          >
            <span
              v-if="!hasActiveTrack || state?.trackState === VideoState.Paused || state?.trackState === VideoState.Unknown"
              class="icon material-symbols-outlined"
            >play_arrow</span>
            <span
              v-else-if="state?.trackState === VideoState.Playing"
              class="icon material-symbols-outlined"
            >pause</span>
            <span
              v-else-if="state?.trackState === VideoState.Buffering"
              class="icon material-symbols-outlined spinning"
            >progress_activity</span>
          </button>
          <button
            class="ctrl-btn"
            title="Next"
            @click="nextVideo"
          >
            <span class="icon material-symbols-outlined">skip_next</span>
          </button>
        </div>

        <div class="controls-right">
          <button
            class="ctrl-btn hide-compact"
            title="Shuffle queue"
            @click="shuffleQueue"
          >
            <span class="icon material-symbols-outlined">shuffle</span>
          </button>
          <button
            class="ctrl-btn"
            :class="{ active: state?.queue?.repeatMode === RepeatMode.All || state?.queue?.repeatMode === RepeatMode.One }"
            title="Cycle repeat mode"
            @click="cycleRepeat"
          >
            <span
              v-if="state?.queue?.repeatMode === RepeatMode.One"
              class="icon material-symbols-outlined"
            >repeat_one_on</span>
            <span
              v-else-if="state?.queue?.repeatMode === RepeatMode.All"
              class="icon material-symbols-outlined"
            >repeat_on</span>
            <span
              v-else
              class="icon material-symbols-outlined"
            >repeat</span>
          </button>
          <div class="volume">
            <RangeInput
              v-model="volume"
              class="slider"
              :min="0"
              :max="100"
              @update:model-value="volumeChanged"
            />
            <button
              class="ctrl-btn"
              title="Mute / Unmute"
              @click="toggleMute"
            >
              <span
                v-if="state?.muted"
                class="icon material-symbols-outlined"
              >volume_off</span>
              <span
                v-else-if="volume <= 50"
                class="icon material-symbols-outlined"
              >volume_down</span>
              <span
                v-else
                class="icon material-symbols-outlined"
              >volume_up</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>

<style scoped>
.container {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.container.unavailable {
  justify-content: center;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 13px;
}

.bg-art {
  position: fixed;
  inset: -24px;
  background-size: cover;
  background-position: center;
  filter: blur(28px) saturate(1.45) brightness(0.42);
  transform: scale(1.08);
  z-index: 0;
  pointer-events: none;
  -webkit-app-region: no-drag;
}

.bg-scrim {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at 50% 30%, rgba(255, 31, 75, 0.14), rgba(11, 12, 16, 0.78) 70%);
  z-index: 0;
  pointer-events: none;
  -webkit-app-region: no-drag;
}

.artwork-stage {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 16px 8px;
  -webkit-app-region: drag;
}

.idle-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
}

.idle-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.idle-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  -webkit-app-region: no-drag;
}

.idle-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--border-subtle);
  transition: background-color 0.14s ease, border-color 0.14s ease, transform 0.12s ease;
}

.idle-btn:hover {
  transform: translateY(-1px);
}

.idle-btn.primary {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(255, 31, 75, 0.38);
}

.idle-btn.primary:hover {
  background: var(--accent-hover);
}

.idle-btn.secondary {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.idle-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.idle-btn .material-symbols-outlined {
  font-size: 16px;
}

.cover-frame {
  height: 100%;
  max-height: 196px;
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.glass-dock {
  position: relative;
  z-index: 2;
  margin: 0 10px 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(14, 15, 22, 0.76);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.track-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.track-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dock-exit-btn {
  flex-shrink: 0;
}

.video-info {
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
}

.video-info .title {
  display: inline-block;
  font-family: var(--font-display);
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.artist {
  font-size: 11.5px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.marquee {
  animation: marquee 12s linear infinite;
}

@keyframes marquee {
  0% {
    transform: translateX(0%);
  }
  20% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(-100%);
  }
}

.seek-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-label {
  font-variant-numeric: tabular-nums;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-muted);
  min-width: 30px;
  text-align: center;
}

.seekbar-container {
  flex: 1;
  padding: 5px 0;
  cursor: pointer;
}

.seekbar-container.disabled {
  cursor: default;
  opacity: 0.45;
}

.seekbar {
  position: relative;
  height: 4px;
  width: 100%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
}

.seekbar .progress {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent-primary), #ff5275);
}

.seekbar .handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid var(--accent-primary);
  box-shadow: 0 0 8px var(--accent-glow);
}

.video-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.controls-left,
.controls-center,
.controls-right {
  display: flex;
  align-items: center;
  gap: 3px;
}

.ctrl-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.ctrl-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.ctrl-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.ctrl-btn.active {
  color: #ff6e89;
}

.ctrl-btn.active .material-symbols-outlined {
  font-variation-settings:
    "FILL" 1,
    "wght" 400,
    "GRAD" 0,
    "opsz" 20;
}

.ctrl-btn .material-symbols-outlined {
  font-size: 18px;
}

.play-pause-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: var(--accent-primary);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 14px var(--accent-glow);
  transition: transform 0.14s ease, background-color 0.14s ease;
}

.play-pause-btn:hover {
  transform: scale(1.06);
  background: var(--accent-hover);
}

.play-pause-btn .material-symbols-outlined {
  font-size: 21px;
  font-variation-settings:
    "FILL" 1,
    "wght" 500,
    "GRAD" 0,
    "opsz" 24;
}

.volume {
  display: flex;
  align-items: center;
  gap: 4px;
}

.volume .slider {
  width: 68px;
}

.spinning {
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

@media (max-height: 280px) {
  .artwork-stage {
    display: none;
  }
  .container {
    justify-content: flex-end;
  }
}

@media (max-width: 340px) {
  .volume .slider,
  .hide-compact {
    display: none;
  }
}

.container.compact {
  padding: 0 10px 6px;
  justify-content: flex-end;
  -webkit-app-region: drag;
  user-select: none;
}

.compact-bar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 10px;
  background: rgba(14, 15, 22, 0.78);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  -webkit-app-region: drag;
  user-select: none;
}

.compact-track {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
  -webkit-app-region: drag;
  user-select: none;
}

.compact-thumb {
  width: 36px;
  height: 36px;
  border-radius: 7px;
  object-fit: cover;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}

.compact-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.compact-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.compact-artist {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.compact-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

.compact-controls button {
  -webkit-app-region: no-drag;
}

.compact-pp {
  width: 30px;
  height: 30px;
}

.compact-progress-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.12);
}

.compact-progress-fill {
  height: 100%;
  background: var(--accent-primary);
  transition: width 0.25s linear;
}

.dock-header-actions {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.drawer-overlay {
  position: relative;
  z-index: 2;
  flex: 1;
  min-height: 0;
  margin-bottom: 8px;
  border-radius: 12px;
  background: rgba(14, 15, 22, 0.86);
  backdrop-filter: blur(22px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.drawer-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px;
}

.drawer-empty {
  padding: 20px;
  text-align: center;
  font-size: 12.5px;
  color: var(--text-muted);
}

.queue-row {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
}

.queue-row.selected {
  background: var(--accent-soft);
}

.queue-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.queue-state-icon {
  font-size: 16px;
  color: var(--text-secondary);
}

.queue-row.selected .queue-state-icon {
  color: var(--accent-primary);
}

.queue-row-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.queue-row-title {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-row-author {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-row-dur {
  font-size: 11px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.queue-remove-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.queue-remove-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.queue-remove-btn .material-symbols-outlined {
  font-size: 15px;
}

.info-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
}

.info-key {
  color: var(--text-muted);
}

.info-val {
  color: var(--text-primary);
  font-weight: 500;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-subtitle {
  margin: 4px 2px 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.sleep-chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sleep-chip {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.sleep-chip:hover {
  background: var(--accent-soft);
  border-color: var(--accent-primary);
}
</style>
