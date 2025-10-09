# SunSar Wordle — v2 Upgrade (2025-10-09)

**New features:**
- Topbar with **Stats**, **Share**, **Theme** (dark/light), and **Hard mode** toggles
- **Stats modal** with played, win%, streaks, and a guess distribution chart (localStorage)
- **Settings dialog** (high contrast color option, animations toggle placeholder)
- **Share** button: uses native share when available or copies emoji board to clipboard
- **PWA**: `manifest.json` and `sw.js` for offline support / installability
- Non-invasive: all new logic lives in `app-enhancements.js` and integrates with the existing code via `window.SS_WORDLE` hooks.
