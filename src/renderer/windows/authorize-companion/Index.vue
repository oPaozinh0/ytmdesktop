<script setup lang="ts">
import TitleBar from "../../components/TitleBar.vue";
import Auth from "./Auth.vue";
</script>

<template>
  <div class="container">
    <TitleBar
      class="titlebar"
      title="Authorize Companion"
      use-shield-logo
    />
    <Auth class="auth" />
  </div>
</template>

<style scoped>
.auth {
  background-color: var(--bg-base);
  height: calc(100% - 36px);
}

.container {
  width: 100%;
  height: 100%;
  background-color: var(--bg-base);
}
</style>
