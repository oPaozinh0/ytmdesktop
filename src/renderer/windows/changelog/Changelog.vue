<script setup lang="ts">
import markdownit from "markdown-it";
import ShieldLogo from "../../components/ShieldLogo.vue";

const md = markdownit({
  linkify: true,
  html: true
});

const releaseMetadata = await window.ytmd.getReleaseMetadata();
const mdRender = md.render(releaseMetadata.notes);
const appVersion = await window.ytmd.getAppVersion();
</script>

<template>
  <div class="changelog-container">
    <div class="hero-card">
      <div class="hero-brand">
        <ShieldLogo
          :size="36"
          glow
        />
        <div>
          <h1 class="updated-header">
            YTM Shield has updated!
          </h1>
          <p class="subtitle">
            Release {{ releaseMetadata.name || `v${appVersion}` }} is now active.
          </p>
        </div>
      </div>
      <span class="version-badge">v{{ appVersion }}</span>
    </div>

    <div
      class="release-notes"
      v-html="mdRender"
    />
  </div>
</template>

<style scoped>
.changelog-container {
  height: calc(100% - 36px);
  overflow-y: auto;
  box-sizing: border-box;
  background:
    radial-gradient(500px 260px at 85% 0%, rgba(255, 31, 75, 0.12), transparent 70%),
    var(--bg-base);
  padding: 20px 24px 28px;
}

.hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  margin-bottom: 18px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  backdrop-filter: blur(18px);
}

.hero-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.updated-header {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.subtitle {
  margin: 3px 0 0;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.version-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background: var(--accent-soft);
  color: #ff6e89;
  border: 1px solid rgba(255, 31, 75, 0.35);
}

.release-notes {
  padding: 18px 22px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 13.5px;
  line-height: 1.6;
}

.release-notes :deep(h1),
.release-notes :deep(h2),
.release-notes :deep(h3) {
  font-family: var(--font-display);
  color: var(--text-primary);
  margin-top: 14px;
  margin-bottom: 8px;
}

.release-notes :deep(a) {
  color: #ff6e89;
}

.release-notes :deep(code) {
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-primary);
}
</style>
