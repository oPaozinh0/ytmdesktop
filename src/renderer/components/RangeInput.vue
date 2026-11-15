<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from "vue";

interface Props {
  min?: number;
  max?: number;
  step?: number;
  scrollStep?: number;
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  scrollStep: 10
});

const model = defineModel<number>({ required: true });

const track = ref<HTMLDivElement | null>(null);
const isDragging = ref(false);

const progress = computed(() => {
  if (props.max === props.min) return 0;
  const clamped = Math.min(Math.max(model.value, props.min), props.max);
  return ((clamped - props.min) / (props.max - props.min)) * 100;
});

function clamp(value: number) {
  return Math.min(props.max, Math.max(props.min, value));
}

function updateValueFromEvent(event: MouseEvent | TouchEvent) {
  if (!track.value) return;
  const rect = track.value.getBoundingClientRect();
  const x = event instanceof TouchEvent ? event.touches[0].clientX : event.clientX;
  const percent = (x - rect.left) / rect.width;
  const newValue = props.min + percent * (props.max - props.min);
  model.value = clamp(newValue);
}

function startDrag(event: MouseEvent | TouchEvent) {
  event.preventDefault();
  isDragging.value = true;
  updateValueFromEvent(event);

  window.addEventListener("mousemove", updateValueFromEvent);
  window.addEventListener("touchmove", updateValueFromEvent);
  window.addEventListener("mouseup", stopDrag);
  window.addEventListener("touchend", stopDrag);
}

function stopDrag() {
  if (!isDragging.value) return;
  isDragging.value = false;
  window.removeEventListener("mousemove", updateValueFromEvent);
  window.removeEventListener("touchmove", updateValueFromEvent);
  window.removeEventListener("mouseup", stopDrag);
  window.removeEventListener("touchend", stopDrag);
}

function onWheel(event: WheelEvent) {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -1 : 1;
  const newValue = model.value + delta * props.scrollStep;
  const stepped = Math.round(newValue / props.step) * props.step;
  model.value = clamp(stepped);
}

onBeforeUnmount(stopDrag);
</script>

<template>
  <div
    class="range-container"
    :class="{ dragging: isDragging }"
    @mousedown="startDrag"
    @touchstart="startDrag"
    @wheel.prevent="onWheel"
  >
    <div
      ref="track"
      class="range"
    >
      <div class="range-background" />
      <div
        class="range-fill"
        :style="{ width: progress + '%' }"
      />
      <div
        class="range-handle"
        :style="{ left: progress + '%' }"
      />
    </div>
  </div>
</template>

<style scoped>
.range-container {
  padding: 7px 0;
  cursor: pointer;
}

.range {
  position: relative;
  width: 100%;
  height: 5px;
  user-select: none;
}

.range-background {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 999px;
}

.range-fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--accent-primary), #ff5275);
  width: 0%;
  border-radius: 999px;
}

.range-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  width: 12px;
  height: 12px;
  background: #ffffff;
  border: 2px solid var(--accent-primary);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--accent-glow);
  pointer-events: none;
  transition: transform 0.12s ease;
}

.range-container:hover .range-handle,
.range-container.dragging .range-handle {
  transform: translate(-50%, -50%) scale(1.1);
}
</style>
