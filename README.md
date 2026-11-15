<div align="center">

# YTM Shield

**Modern dark-glass YouTube Music desktop player with integrated Ad Shield and Chrome extension support.**

[![GitHub release][release-img]][release-url]
[![GitHub downloads][download-img]][download-url]
[![GitHub license][license-img]][license-url]

</div>

---

## Highlights

- **Dark Glassmorphism UI** — Built around an OLED obsidian surface (`#0b0c10`), frosted glass panels, and crisp crimson/ruby accents (`#ff1f4b`).
- **Smart TitleBar & Live Shield Pill** — Back/Forward/Reload/Home navigation alongside a real-time **Ad Shield** pill showing session blocks and one-click pause/resume.
- **Built-in Ad Shield** — Powered by `@ghostery/adblocker` using EasyList and uBlock Origin lists, supporting network blocking, cosmetic element hiding, and inline audio-stream scriptlets cached locally for offline startup.
- **Chrome Manifest V2 Extensions** — Load unpacked extensions (such as uBlock Origin MV2) directly into your YouTube Music session.
- **Floating Glass Miniplayer** — Blurred album artwork backdrop, formatted track time (`mm:ss`), quick Like/Dislike actions, Shuffle/Repeat controls, volume slider, and always-on-top pin.
- **Searchable Settings Dashboard** — Quick setting search, Hero protection stats, visual extension cards, `<kbd>` shortcut badges, and desktop integrations (Discord Rich Presence, Last.fm, Companion Server, Custom CSS, Global Shortcuts).

---

## Installation

### Windows (Winget)

```powershell
winget install oPaozinh0.YTMDesktopAdblock
```

### Direct Installers

Download the latest Windows installer or portable archive directly from [GitHub Releases](https://github.com/oPaozinh0/ytmdesktop/releases).

---

## Ad Shield & Extensions

Everything lives under **Settings → Ad Shield** (or by clicking the **Shield** pill in the TitleBar):

### 1. Built-in Ad Shield

- **Filter Lists** — Choose between *Ads only*, *Ads and trackers*, or *Ads, trackers and annoyances*. The compiled engine is cached locally under `<userData>/adblocker` and refreshes every three days.
- **Cosmetic Filtering** — Hides ad placeholders and promotional cards inside YouTube Music.
- **Scriptlet Injection** — Injects anti-ad scriptlets at document start before YouTube Music initializes so mid-roll ads served from the same media origin are stopped without breaking player hooks.

### 2. Browser Extensions

Unpacked Chrome extensions can be added by selecting a folder containing `manifest.json`:

- **Manifest V2 blockers** (such as uBlock Origin from [gorhill/uBlock](https://github.com/gorhill/uBlock/releases)) work natively via `chrome.webRequest`.
- **Manifest V3 blockers** relying on `chrome.declarativeNetRequest` (such as uBlock Origin Lite) are not supported by Electron's extension runtime.
- Packed `.crx` archives must be extracted first before adding.

---

## Development

Prerequisites: [Git](https://git-scm.com) and [Node.js (v20+)](https://nodejs.org/) with `corepack` enabled (`pnpm`).

```sh
git clone https://github.com/oPaozinh0/ytmdesktop.git
cd ytmdesktop

corepack enable
pnpm install

# Start in development mode
pnpm start
```

### Useful Scripts

```sh
# Type-check TypeScript sources
pnpm typecheck

# Lint codebase
pnpm lint

# Package unpacked Electron build
pnpm package

# Build distributable installer (Squirrel on Windows)
pnpm make
```

---

## License & Attribution

Licensed under the [GPL-3.0 License](LICENSE).  
Developed and maintained by **oPaozinh0** — originally forked from the open-source [ytmdesktop](https://github.com/ytmdesktop/ytmdesktop) desktop client.

[release-img]: https://img.shields.io/github/v/release/oPaozinh0/ytmdesktop?style=for-the-badge&color=ff1f4b
[release-url]: https://github.com/oPaozinh0/ytmdesktop/releases
[download-img]: https://img.shields.io/github/downloads/oPaozinh0/ytmdesktop/total?style=for-the-badge&color=22c55e
[download-url]: https://github.com/oPaozinh0/ytmdesktop/releases
[license-img]: https://img.shields.io/github/license/oPaozinh0/ytmdesktop?style=for-the-badge
[license-url]: https://github.com/oPaozinh0/ytmdesktop/blob/master/LICENSE
