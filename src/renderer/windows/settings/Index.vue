<script setup lang="ts">
import TitleBar from "../../components/TitleBar.vue";
import Settings from "./Settings.vue";
</script>

<template>
  <div class="container">
    <TitleBar
      class="titlebar"
      title="YTM Shield Settings"
      use-shield-logo
    />
    <Suspense>
      <Settings class="settings" />
    </Suspense>
  </div>
</template>

<style scoped>
.container {
  width: 100%;
  height: 100%;
  background: var(--bg-base);
  display: flex;
  flex-direction: column;
}

.settings {
  background:
    radial-gradient(620px 320px at 85% -10%, rgba(255, 31, 75, 0.08), transparent 70%),
    radial-gradient(500px 340px at 10% 110%, rgba(34, 197, 94, 0.04), transparent 70%),
    var(--bg-base);
  height: calc(100% - 36px);
  overflow: hidden;
}
</style>
