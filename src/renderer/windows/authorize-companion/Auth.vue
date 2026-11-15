<script setup lang="ts">
import { onBeforeMount, ref } from "vue";
import ShieldLogo from "../../components/ShieldLogo.vue";

const appName = ref("");
const code = ref("");

function denyCompanion() {
  window.ytmd.sendResult(false);
}

function allowCompanion() {
  window.ytmd.sendResult(true);
}

onBeforeMount(async () => {
  appName.value = await window.ytmd.getAppName();
  code.value = await window.ytmd.getCode();
});
</script>

<template>
  <div class="container-wrapper">
    <div class="auth-card">
      <ShieldLogo
        :size="48"
        glow
      />
      <h1 class="title">
        Companion Authorization
      </h1>
      <p class="subtitle">
        <b>{{ appName }}</b> is requesting permission to control YTM Shield
      </p>
      <p class="code-confirm">
        Verify that the pairing code matches what <b>{{ appName }}</b> displays:
      </p>
      <div class="code-box">
        {{ code }}
      </div>
      <div class="buttons">
        <button
          class="deny"
          @click="denyCompanion"
        >
          Deny
        </button>
        <button
          class="allow"
          @click="allowCompanion"
        >
          Allow Access
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container-wrapper {
  width: 100%;
  height: calc(100% - 36px);
  background:
    radial-gradient(460px 300px at 50% 25%, rgba(255, 31, 75, 0.14), transparent 72%),
    var(--bg-base);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.auth-card {
  width: 100%;
  max-width: 480px;
  padding: 28px 32px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
  gap: 10px;
}

.title {
  margin: 6px 0 0;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.code-confirm {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}

.code-box {
  margin: 6px 0 10px;
  padding: 12px 28px;
  border-radius: var(--radius-md);
  background: rgba(255, 31, 75, 0.12);
  border: 1px solid rgba(255, 31, 75, 0.38);
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-indent: 0.22em;
  color: #ff6e89;
  box-shadow: 0 0 24px rgba(255, 31, 75, 0.18);
}

.buttons {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.allow,
.deny {
  padding: 10px 24px;
  border-radius: var(--radius-sm);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease;
}

.deny {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
}

.deny:hover {
  background: rgba(239, 68, 68, 0.16);
  border-color: rgba(239, 68, 68, 0.35);
  color: #fca5a5;
}

.allow {
  background: var(--accent-primary);
  border: 1px solid var(--accent-primary);
  color: #ffffff;
  box-shadow: 0 4px 16px var(--accent-glow);
}

.allow:hover {
  background: var(--accent-hover);
}
</style>
