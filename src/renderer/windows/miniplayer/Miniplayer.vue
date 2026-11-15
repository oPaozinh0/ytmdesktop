<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef } from "vue";
import { LikeStatus, PlayerState, RepeatMode, Thumbnail, VideoState } from "~shared/playerstatestore/types";
import RangeInput from "../../components/RangeInput.vue";
import ShieldLogo from "../../components/ShieldLogo.vue";

const state = ref<PlayerState | null>(null);
state.value = await window.ytmd.playerStore.getState();

const volume = ref(state.value?.volume ?? 0);
const videoProgress = ref(0);
const videoLength = ref(0);
const videoId = ref("");
const thumbnailUrl = ref<string>("");

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

onMounted(() => {
  window.ytmd.playerStore.handleStateChanged(newState => {
    stateChanged(newState);
  });

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
  <div class="container">
    <div
      class="bg-art"
      :style="hasActiveTrack && thumbnailUrl ? { backgroundImage: `url('${thumbnailUrl}')` } : {}"
    />
    <div class="bg-scrim" />

    <div class="artwork-stage">
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
        <button
          class="ctrl-btn dock-exit-btn"
          title="Return to main player"
          @click="closeMiniplayer"
        >
          <span class="icon material-symbols-outlined">pip_exit</span>
        </button>
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
</style>
