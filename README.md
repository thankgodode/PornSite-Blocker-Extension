# Focus Guard — Chrome Extension

A Chrome extension that blocks adult sites and tracks your clean streak.

## Features
- 🔥 Streak tracker (synced across devices via Chrome Sync)
- 🚫 20 default blocked domains, all removable
- ➕ Add your own custom domains
- ↩️ Blocked sites redirect to r/NoFap

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add icons
Create an `icons/` folder in the project root and add three PNG icons:
- `icons/icon16.png` (16×16)
- `icons/icon48.png` (48×48)
- `icons/icon128.png` (128×128)

You can use any image editor or a free tool like https://www.favicon.io to generate them.

### 3. Build
```bash
npm run build
```

This runs `vite build` and then copies `manifest.json`, `background.js`, and `rules.json` into `dist/`.

### 4. Load in Chrome
1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder

The extension icon will appear in your toolbar. Click it to open the popup.

---

## How it works

| Part | Tech |
|------|------|
| Blocking | `declarativeNetRequest` dynamic rules |
| Redirect target | `https://www.reddit.com/r/NoFap/` |
| Streak storage | `chrome.storage.sync` (cross-device) |
| Popup UI | React (Vite) |
| Background logic | MV3 Service Worker |

---

## Customising the redirect URL

Open `public/background.js` and change the first line:
```js
const REDIRECT_URL = "https://www.reddit.com/r/NoFap/";
```
Then rebuild.
