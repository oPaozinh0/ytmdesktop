// IMPORTANT NOTES ABOUT THIS FILE
//
// This file contains all logic related to interacting with YTM itself and works under the assumption of a trusted environment and data.
// Anything passed to this file does not necessarily need to be or will be validated.
//
// If adding new things to this file ensure best security practices are followed.
// - executeJavaScript is used to enter the main world when you need to interact with YTM APIs or anything from YTM that would otherwise need the prototypes or events from YTM.
//   - Always wrap your executeJavaScript code in an IIFE calling it from outside executeJavaScript when it returns
// - Add functions to exposeInMainWorld when you need to call back to the main program. By nature you should not trust data coming from this.

// Early bail if the page isn't YTM. This could be an account login or something else
if (window.location.hostname !== "music.youtube.com") {
  throw new Error("[YTMDFastFail]: THIS IS NOT AN ERROR! Location not applicable bailing preload");
}

import { ipcRenderer, webFrame } from "electron";
import Store from "../store-ipc/store";
import { StoreSchema } from "~shared/store/schema";

import scriptsRaw from "./scripts?raw";

const store = new Store<StoreSchema>();

function hexToRgbString(hex: string): string {
  const cleaned = (hex || "").trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return "255, 46, 76";
}

function getOrCreateStyleElement(id: string): HTMLStyleElement {
  let styleEl = document.getElementById(id) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = id;
    (document.head ?? document.documentElement).appendChild(styleEl);
  }
  return styleEl;
}

function buildGlassThemeCss(accent: string, accentRgb: string, glassEnabled: boolean, ambientGlowEnabled: boolean): string {
  const lines: string[] = [
    `:root { --ytmd-accent: ${accent}; --ytmd-accent-rgb: ${accentRgb}; }`,
    `html.ytmd-glass-enabled body { background-color: #08090d !important; }`
  ];

  if (glassEnabled) {
    lines.push(`
      html.ytmd-glass-enabled ytmusic-nav-bar {
        background: rgba(10, 12, 18, 0.72) !important;
        backdrop-filter: blur(22px) saturate(150%) !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
      }
      html.ytmd-glass-enabled #guide-wrapper.ytmusic-app,
      html.ytmd-glass-enabled ytmusic-guide-renderer {
        background: rgba(11, 13, 20, 0.74) !important;
        backdrop-filter: blur(20px) saturate(140%) !important;
        border-right: 1px solid rgba(255, 255, 255, 0.06) !important;
      }
      html.ytmd-glass-enabled ytmusic-player-bar {
        background: rgba(13, 15, 23, 0.8) !important;
        backdrop-filter: blur(26px) saturate(160%) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
        box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.45) !important;
      }
      html.ytmd-glass-enabled #progress-bar.ytmusic-player-bar {
        --paper-slider-active-color: ${accent} !important;
        --paper-slider-knob-color: ${accent} !important;
        --paper-slider-knob-start-color: ${accent} !important;
        --paper-slider-knob-start-border-color: ${accent} !important;
      }
      html.ytmd-glass-enabled ytmusic-player-bar .middle-controls .play-pause-button {
        color: #ffffff !important;
      }
      html.ytmd-glass-enabled ytmusic-guide-entry-renderer[active] paper-item,
      html.ytmd-glass-enabled ytmusic-guide-entry-renderer[active] tp-yt-paper-item {
        background: rgba(${accentRgb}, 0.16) !important;
        border-radius: 10px !important;
      }
      html.ytmd-glass-enabled ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      html.ytmd-glass-enabled ::-webkit-scrollbar-track {
        background: transparent;
      }
      html.ytmd-glass-enabled ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.14);
        border-radius: 999px;
      }
      html.ytmd-glass-enabled ::-webkit-scrollbar-thumb:hover {
        background: rgba(${accentRgb}, 0.55);
      }
    `);
  }

  if (ambientGlowEnabled) {
    lines.push(`
      html.ytmd-ambient-glow-enabled ytmusic-app::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        background:
          radial-gradient(62% 52% at 18% 15%, rgba(${accentRgb}, 0.14), transparent 70%),
          radial-gradient(50% 45% at 84% 78%, rgba(${accentRgb}, 0.1), transparent 72%);
      }
    `);
  }

  return lines.join("\n");
}

function applyAppearanceStyles(appearance: StoreSchema["appearance"]) {
  if (!appearance) return;
  const accent = appearance.accentColor || "#ff2e4c";
  const accentRgb = hexToRgbString(accent);
  const root = document.documentElement;
  if (root) {
    root.style.setProperty("--ytmd-accent", accent);
    root.style.setProperty("--ytmd-accent-rgb", accentRgb);
    root.classList.toggle("ytmd-glass-enabled", Boolean(appearance.glassThemeEnabled));
    root.classList.toggle("ytmd-ambient-glow-enabled", Boolean(appearance.ambientGlowEnabled));
  }

  const themeEl = getOrCreateStyleElement("ytmd-shield-glass-theme");
  themeEl.textContent =
    appearance.glassThemeEnabled || appearance.ambientGlowEnabled
      ? buildGlassThemeCss(accent, accentRgb, Boolean(appearance.glassThemeEnabled), Boolean(appearance.ambientGlowEnabled))
      : `:root { --ytmd-accent: ${accent}; --ytmd-accent-rgb: ${accentRgb}; }`;

  const inlineEl = getOrCreateStyleElement("ytmd-inline-custom-css");
  inlineEl.textContent = appearance.customCSSEnabled ? (appearance.inlineCustomCSS ?? "") : "";
}

function postAudioConfigToPage(playback: StoreSchema["playback"], adblocker: StoreSchema["adblocker"]) {
  window.postMessage(
    {
      type: "ytmd-audio-config",
      equalizerEnabled: Boolean(playback?.equalizerEnabled),
      equalizerBands: Array.isArray(playback?.equalizerBands) ? [...playback.equalizerBands] : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      loudnessNormalization: Boolean(playback?.loudnessNormalization),
      sponsorBlockEnabled: Boolean(adblocker?.sponsorBlockEnabled),
      sponsorBlockCategories: Array.isArray(adblocker?.sponsorBlockCategories) ? [...adblocker.sponsorBlockCategories] : []
    },
    "*"
  );
}

async function syncInitialAppearanceAndAudio() {
  const [appearance, playback, adblocker] = await Promise.all([
    store.get("appearance"),
    store.get("playback"),
    store.get("adblocker")
  ]);
  applyAppearanceStyles(appearance);
  postAudioConfigToPage(playback, adblocker);
}

window.addEventListener("DOMContentLoaded", () => {
  void syncInitialAppearanceAndAudio();
});

ipcRenderer.on("ytmView:navigateSearch", (_event, query: string) => {
  window.postMessage({ type: "ytmd-navigate-search", query }, "*");
});

let protectedApiBound = false;
window.addEventListener("message", async event => {
  if (event.data === "ytmd-protected-api-port" && !protectedApiBound) {
    ipcRenderer.postMessage("protectedApi:bindPort", null, [...event.ports]);
    protectedApiBound = true;
  }

  if (event.source === window && event.data?.type === "ytmd-page-audio-ready") {
    void syncInitialAppearanceAndAudio();
  }

  if (event.source === window && event.data?.type === "ytmd-sb-request") {
    const { videoId, categories } = event.data as { videoId: string; categories: string[] };
    const segments = await ipcRenderer.invoke("sponsorblock:getSegments", videoId, categories);
    window.postMessage({ type: "ytmd-sb-response", videoId, segments }, "*");
  }

  if (event.source === window && event.data?.type === "ytmd-sb-skipped") {
    ipcRenderer.send("memoryStore:set", "sponsorBlockLastSkipped", {
      category: String(event.data.category ?? "sponsor"),
      skippedAt: Date.now()
    });
  }

  if (event.source === window && event.data?.type === "ytmd-sleep-timer-set") {
    ipcRenderer.send("sleepTimer:set", event.data.option);
  }

  if (event.data?.op === "ytmd-user-gesture") {
    await webFrame.executeJavaScript(
      `(function() {
        if (typeof window.__YTMD_RUN_GESTURE_QUEUE__ === "function") {
          window.__YTMD_RUN_GESTURE_QUEUE__();
        }
      })()`,
      true
    );
  }

  if (event.data.op && event.data.op === "ytmd-ready") {
    ipcRenderer.send("ytmView:ready", event.data.completions);

    // TODO: Move all the below be part of the ProtectedAPI system within this block
    const state = await store.get("state");
    const continueWhereYouLeftOff = (await store.get("playback")).continueWhereYouLeftOff;

    if (continueWhereYouLeftOff) {
      // The last page the user was on is already a page where it will be playing a song from (no point telling YTM to play it again)
      if (!window.location.pathname.startsWith("/watch")) {
        if (state.lastVideoId) {
          document.dispatchEvent(
            new CustomEvent("yt-navigate", {
              detail: {
                endpoint: {
                  watchEndpoint: {
                    videoId: state.lastVideoId,
                    playlistId: state.lastPlaylistId
                  }
                }
              }
            })
          );
        }
      } else {
        (
          await webFrame.executeJavaScript(`
          (function() {
            const playerApi = window.__YTMD_HOOK__.ytmPlayerController.playerApi;
            if (playerApi.getPlayerResponse()) window.ytmd.sendVideoData(playerApi.getPlayerResponse().videoDetails, playerApi.getPlaylistId());
          })
        `)
        )();
      }
    }

    await syncInitialAppearanceAndAudio();

    const alwaysShowVolumeSlider = (await store.get("appearance")).alwaysShowVolumeSlider;
    if (alwaysShowVolumeSlider) {
      document.querySelector("ytmusic-app-layout>ytmusic-player-bar #volume-slider")?.classList.add("ytmd-persist-volume-slider");
    }

    store.onDidAnyChange(newState => {
      applyAppearanceStyles(newState.appearance);
      postAudioConfigToPage(newState.playback, newState.adblocker);

      if (newState.appearance.alwaysShowVolumeSlider) {
        const volumeSlider = document.querySelector("#volume-slider");
        if (volumeSlider && !volumeSlider.classList.contains("ytmd-persist-volume-slider")) {
          volumeSlider.classList.add("ytmd-persist-volume-slider");
        }
      } else {
        const volumeSlider = document.querySelector("#volume-slider");
        if (volumeSlider && volumeSlider.classList.contains("ytmd-persist-volume-slider")) {
          volumeSlider.classList.remove("ytmd-persist-volume-slider");
        }
      }
    });

    ipcRenderer.on("ytmView:executeScript", async (_event, script) => {
      (await webFrame.executeJavaScript(script))();
    });
  }

  if (event.data.op && event.data.op === "ytmd-errored") {
    ipcRenderer.send("ytmView:errored", event.data.error);
  }
});

webFrame.executeJavaScript(scriptsRaw);