<script setup lang="ts" generic="T extends 'checkbox' | 'file' | 'range' | 'select' | 'custom'">
import { computed, ref } from "vue";

type ModelValue = {
  checkbox: boolean;
  file: string;
  range: number;
  custom: never;
  select: number;
};

const props = defineProps<{
  type: T;
  modelValue?: ModelValue[T];
  name: string;
  description?: string;
  restartRequired?: boolean;
  indented?: boolean;
  bindSetting?: string; // This is for the file picker so that it can properly set a data attribute that binds the setting correctly. TODO: Rewrite to not have this
  max?: number | string;
  min?: number | string;
  step?: number | string;
  disabled?: boolean;
  disabledMessage?: string;
  flexColumn?: boolean;
  beta?: boolean;
  optionsMap?: { [key: number]: string }; // This is for the select menu
}>();
const emit = defineEmits(["update:modelValue", "file-change", "change", "clear"]);

const value = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit("update:modelValue", value);
  }
});

const hasDescription = computed(() => {
  return props.description && props.description.trim() !== "";
});

const fileInput = ref<HTMLInputElement | null>(null);

const selectOpen = ref(false);
const selectedOption = computed(() => {
  return props.optionsMap?.[props.modelValue as number] ?? "";
});

// This function should be using ModelValue[T] but because it's bound to @click it doesn't interpret it as correct
function select(optionKey: string) {
  value.value = Number.parseInt(optionKey) as ModelValue[T];
  selectOpen.value = false;
  emit("change");
}
</script>

<template>
  <div
    :class="{
      'ytmd-setting': true,
      'indented': props.indented,
      'flex-column': props.flexColumn,
      'is-disabled': props.disabled
    }"
  >
    <div class="setting-info">
      <div class="setting-title-row">
        <span
          v-if="disabled"
          class="disabled-tag"
        >DISABLED</span>
        <p class="name">
          {{ name }}
        </p>
        <span
          v-if="restartRequired"
          class="reload-pill"
          title="Restart required to apply this change"
        >
          <span class="reload-required material-symbols-outlined">autorenew</span>
          Restart
        </span>
        <span
          v-if="beta"
          class="beta-tag"
          title="This is a beta feature and may not work correctly yet."
        >BETA</span>
      </div>
      <p
        v-if="!disabled && hasDescription"
        class="description"
      >
        {{ description }}
      </p>
      <p
        v-if="disabled && disabledMessage"
        class="message"
      >
        {{ disabledMessage }}
      </p>
    </div>

    <div
      v-if="type !== 'custom'"
      class="setting-control"
    >
      <label
        v-if="type === 'checkbox'"
        class="toggle-switch"
        :class="{ disabled: disabled }"
      >
        <input
          v-model="value"
          :disabled="disabled"
          type="checkbox"
          @change="$emit('change', $event)"
        >
        <span class="toggle-track">
          <span class="toggle-thumb" />
        </span>
      </label>

      <input
        v-else-if="type !== 'file' && type !== 'range' && type !== 'select'"
        v-model="value"
        :disabled="disabled"
        :type="props.type"
        @change="$emit('change', $event)"
      >

      <div
        v-if="type === 'range'"
        class="range-selector"
      >
        <span class="range-value">{{ value }}</span>
        <input
          v-model="value"
          :disabled="disabled"
          type="range"
          :max="props.max"
          :min="props.min"
          :step="props.step"
          @change="$emit('change', $event)"
        >
      </div>

      <div
        v-if="type === 'file'"
        class="file-picker"
      >
        <input
          ref="fileInput"
          :disabled="disabled"
          type="file"
          accept=".css"
          :data-setting="bindSetting"
          @change="$emit('file-change', $event)"
        >
        <div class="file-input-button">
          <button
            class="choose"
            title="Choose file"
            @click="fileInput?.click()"
          >
            <span class="material-symbols-outlined">file_open</span>
          </button>
          <input
            :disabled="disabled"
            type="text"
            readonly
            class="path"
            placeholder="No file chosen"
            :value="value"
          >
          <button
            v-if="value"
            class="remove"
            title="Clear file"
            @click="$emit('clear')"
          >
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      <div
        v-if="type === 'select'"
        :class="{ select: true, open: selectOpen }"
      >
        <div
          class="selected"
          @click="selectOpen = !selectOpen"
        >
          <p class="text">
            {{ selectedOption }}
          </p>
          <span class="material-symbols-outlined">
            {{ selectOpen ? "expand_less" : "expand_more" }}
          </span>
        </div>
        <div
          v-if="selectOpen"
          class="options"
        >
          <div
            v-for="(optionValue, optionKey) of props.optionsMap"
            :key="optionKey"
            class="option"
            :class="{ active: Number(optionKey) === Number(modelValue) }"
            @click="select(String(optionKey))"
          >
            {{ optionValue }}
          </div>
        </div>
      </div>
    </div>

    <slot />
  </div>
</template>

<style scoped>
.ytmd-setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  margin-bottom: 10px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  transition: border-color 0.16s ease, background-color 0.16s ease;
}

.ytmd-setting:hover {
  background: var(--bg-surface-hover);
  border-color: var(--border-strong);
}

.ytmd-setting.indented {
  margin-left: 16px;
  border-left: 2px solid rgba(255, 31, 75, 0.42);
}

.ytmd-setting.flex-column {
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 12px;
}

.ytmd-setting.is-disabled {
  opacity: 0.72;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.setting-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.description {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
  margin: 0;
}

.message {
  color: #f87171;
  font-size: 12px;
  line-height: 1.45;
  margin: 0;
}

.reload-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.28);
  padding: 1px 7px;
  border-radius: 999px;
}

.reload-required {
  font-size: 13px;
}

.beta-tag {
  background: rgba(255, 31, 75, 0.18);
  color: #ff6e89;
  border: 1px solid rgba(255, 31, 75, 0.35);
  border-radius: 999px;
  padding: 1px 7px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.disabled-tag {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  border-radius: 999px;
  padding: 1px 7px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.setting-control {
  flex-shrink: 0;
}

/* Smooth Crimson Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.toggle-switch.disabled {
  cursor: not-allowed;
}

.toggle-switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  width: 44px;
  height: 24px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.14);
  position: relative;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e2e4ec;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.2s ease;
}

.toggle-switch input:checked + .toggle-track {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  box-shadow: 0 0 14px var(--accent-glow);
}

.toggle-switch input:checked + .toggle-track .toggle-thumb {
  transform: translateX(20px);
  background: #ffffff;
}

/* Range Slider */
.range-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.range-value {
  min-width: 34px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 3px 7px;
}

input[type="range"] {
  appearance: none;
  width: 150px;
  height: 6px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent-primary);
  border: 2px solid #ffffff;
  box-shadow: 0 0 10px var(--accent-glow);
  cursor: pointer;
}

/* File Picker */
.file-picker input[type="file"] {
  display: none;
}

.file-input-button {
  display: flex;
  align-items: center;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.04);
}

.file-input-button .choose,
.file-input-button .remove {
  height: 34px;
  width: 34px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.file-input-button .choose:hover {
  background: var(--accent-soft);
  color: #ff6e89;
}

.file-input-button .remove:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.file-input-button .path {
  height: 34px;
  width: 190px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 12px;
  padding: 0 10px;
  outline: none;
}

.file-input-button .material-symbols-outlined {
  font-size: 18px;
}

/* Select Dropdown */
.select {
  position: relative;
  min-width: 220px;
}

.select .selected {
  height: 36px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 13px;
  transition: border-color 0.14s ease, background-color 0.14s ease;
}

.select .selected:hover,
.select.open .selected {
  border-color: var(--accent-primary);
  background: rgba(255, 255, 255, 0.07);
}

.select .selected .text {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.select .options {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: rgba(20, 22, 30, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-elevated);
  overflow: hidden;
  z-index: 20;
}

.select .option {
  padding: 9px 12px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.select .option:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

.select .option.active {
  background: var(--accent-soft);
  color: #ff6e89;
  font-weight: 600;
}
</style>
