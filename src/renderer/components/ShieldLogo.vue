<script setup lang="ts">
import { useId } from "vue";

withDefaults(
  defineProps<{
    size?: number;
    glow?: boolean;
  }>(),
  {
    size: 24,
    glow: false
  }
);

const uid = useId();
const outerGradId = `shield-outer-${uid}`;
const innerGradId = `shield-inner-${uid}`;
const highlightGradId = `shield-highlight-${uid}`;
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :class="['shield-logo', { 'has-glow': glow }]"
    aria-hidden="true"
  >
    <defs>
      <linearGradient
        :id="outerGradId"
        x1="8"
        y1="4"
        x2="56"
        y2="60"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stop-color="#2a2f42" />
        <stop offset="100%" stop-color="#11131b" />
      </linearGradient>
      <linearGradient
        :id="innerGradId"
        x1="14"
        y1="8"
        x2="52"
        y2="56"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stop-color="#ff3860" />
        <stop offset="55%" stop-color="#ff1f4b" />
        <stop offset="100%" stop-color="#b80d32" />
      </linearGradient>
      <linearGradient
        :id="highlightGradId"
        x1="32"
        y1="7"
        x2="32"
        y2="34"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- Outer Obsidian Shield Frame -->
    <path
      d="M32 3.5L56.5 12.2V30.4C56.5 45.2 46 56.7 32 60.5C18 56.7 7.5 45.2 7.5 30.4V12.2L32 3.5Z"
      :fill="`url(#${outerGradId})`"
      stroke="rgba(255, 255, 255, 0.16)"
      stroke-width="1.5"
      stroke-linejoin="round"
    />

    <!-- Inner Faceted Crimson Shield -->
    <path
      d="M32 7.8L52.2 15V30.1C52.2 42.4 43.5 52 32 55.6C20.5 52 11.8 42.4 11.8 30.1V15L32 7.8Z"
      :fill="`url(#${innerGradId})`"
    />

    <!-- Top Specular Bevel -->
    <path
      d="M32 7.8L52.2 15V26.5C45.5 23.2 38.8 21.8 32 21.8C25.2 21.8 18.5 23.2 11.8 26.5V15L32 7.8Z"
      :fill="`url(#${highlightGradId})`"
    />

    <!-- Subtle Vertical Facet Line -->
    <path
      d="M32 7.8V55.6"
      stroke="rgba(255, 255, 255, 0.1)"
      stroke-width="1"
    />

    <!-- Centered Play Triangle & Acoustic Arc -->
    <path
      d="M25.5 23.6C25.5 22.3 26.9 21.5 28.1 22.1L40.6 29.3C41.8 30 41.8 31.6 40.6 32.3L28.1 39.5C26.9 40.1 25.5 39.3 25.5 38V23.6Z"
      fill="#FFFFFF"
    />
    <path
      d="M44.2 24.4C46.3 26.5 47.4 29 47.4 31.8C47.4 34.6 46.3 37.1 44.2 39.2"
      stroke="rgba(255, 255, 255, 0.85)"
      stroke-width="2.2"
      stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
.shield-logo {
  display: inline-block;
  flex-shrink: 0;
  transition:
    filter 0.25s ease,
    transform 0.25s ease;
}

.shield-logo.has-glow {
  filter: drop-shadow(0 0 14px rgba(255, 31, 75, 0.45));
}
</style>
