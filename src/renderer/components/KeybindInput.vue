<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: ""
  }
});
const emit = defineEmits(["update:modelValue", "change"]);

const keybindInput = ref<HTMLInputElement | null>(null);
const isEditing = ref(false);

const currentKeybind = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit("update:modelValue", value);
    emit("change");
  }
});

const keyTokens = computed(() => {
  if (!currentKeybind.value) return [];
  return currentKeybind.value.split("+");
});

function startEditing() {
  keybindInput.value?.focus();
}

function keybindInputFocused() {
  isEditing.value = true;
}

function keybindInputBlurred() {
  isEditing.value = false;
}

function isDisallowedKey(key: string) {
  return (
    key === "Meta" ||
    key === "Command" ||
    key === "Control" ||
    key === "Alt" ||
    key === "Shift" ||
    key === "AltGraph" ||
    key === "Pause" ||
    key === "MediaPlayPause" ||
    key === "MediaTrackPrevious" ||
    key === "MediaTrackNext" ||
    key === "MediaStop" ||
    key === "Tab" ||
    key === "AudioVolumeUp" ||
    key === "AudioVolumeDown" ||
    key === "AudioVolumeMute" ||
    key === "ContextMenu" ||
    key === "Cancel"
  );
}

function validateKey(event: KeyboardEvent) {
  if (event.key === " ") return "Space";
  if (event.code === "NumpadEnter") return "Enter";
  if (event.code === "NumpadAdd") return "NumAdd";
  if (event.code === "NumpadSubtract") return "NumSub";
  if (event.code === "NumpadDecimal") return "NumDec";
  if (event.code === "NumpadMultiply") return "NumMult";
  if (event.code === "NumpadDivide") return "NumDiv";
  if (event.code === "Numpad0") return "Num0";
  if (event.code === "Numpad1") return "Num1";
  if (event.code === "Numpad2") return "Num2";
  if (event.code === "Numpad3") return "Num3";
  if (event.code === "Numpad4") return "Num4";
  if (event.code === "Numpad5") return "Num5";
  if (event.code === "Numpad6") return "Num6";
  if (event.code === "Numpad7") return "Num7";
  if (event.code === "Numpad8") return "Num8";
  if (event.code === "Numpad9") return "Num9";
  if (event.code === "ArrowUp") return "Up";
  if (event.code === "ArrowDown") return "Down";
  if (event.code === "ArrowLeft") return "Left";
  if (event.code === "ArrowRight") return "Right";
  if (event.shiftKey && event.code === "Equal") return "Plus";
  if (event.keyCode >= 65 && event.keyCode <= 90) return event.key.toUpperCase();

  return event.key;
}

function keybindInputKeyDown(event: KeyboardEvent) {
  if (isDisallowedKey(event.key)) {
    return;
  }

  let newKeybind = "";

  if (event.key === "Escape") {
    currentKeybind.value = "";
    keybindInput.value?.blur();
    event.preventDefault();
    return;
  }

  if (event.metaKey) newKeybind += "Meta+";
  if (event.ctrlKey) newKeybind += "CmdOrCtrl+";
  if (event.altKey) newKeybind += "Alt+";
  if (event.shiftKey) newKeybind += "Shift+";

  newKeybind += validateKey(event);
  keybindInput.value?.blur();

  currentKeybind.value = newKeybind;

  event.preventDefault();
}
</script>

<template>
  <div :class="{ keybind: true, 'is-editing': isEditing }">
    <div
      class="keybind-display"
      @click="startEditing"
    >
      <span
        v-if="isEditing"
        class="recording-hint"
      >
        Press shortcut...
      </span>
      <span
        v-else-if="keyTokens.length === 0"
        class="empty-keybind"
      >
        Click to set
      </span>
      <div
        v-else
        class="kbd-list"
      >
        <kbd
          v-for="(token, idx) in keyTokens"
          :key="`${token}-${idx}`"
          class="kbd-chip"
        >
          {{ token }}
        </kbd>
      </div>
    </div>

    <input
      ref="keybindInput"
      class="keybind-input"
      type="text"
      @focus="keybindInputFocused"
      @blur="keybindInputBlurred"
      @keydown="keybindInputKeyDown"
    >

    <button
      class="remove"
      :disabled="!currentKeybind"
      title="Clear shortcut"
      @click="currentKeybind = ''"
    >
      <span class="material-symbols-outlined">close</span>
    </button>
  </div>
</template>

<style scoped>
.keybind {
  position: relative;
  user-select: none;
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  overflow: hidden;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.keybind:hover {
  border-color: var(--border-strong);
}

.keybind.is-editing {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.keybind-display {
  min-width: 210px;
  min-height: 34px;
  padding: 4px 10px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.empty-keybind {
  color: var(--text-muted);
  font-size: 12px;
}

.recording-hint {
  color: #ff6e89;
  font-size: 12px;
  font-weight: 600;
}

.kbd-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.kbd-chip {
  font-family: "Open Sans", sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-bottom-width: 2px;
  border-radius: 5px;
  padding: 2px 7px;
  line-height: 1.3;
}

.keybind-input {
  width: 0;
  height: 0;
  opacity: 0;
  position: absolute;
  pointer-events: none;
}

.remove {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 34px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-secondary);
  border: none;
  border-left: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.remove:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.18);
  color: #fca5a5;
}

.remove:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.remove .material-symbols-outlined {
  font-size: 16px;
}
</style>
