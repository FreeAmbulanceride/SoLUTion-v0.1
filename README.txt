soLUTion • 60/30/10 Colour Ratio Real-Time Monitor
===================================================

What it is
- Live camera and still-image analyzer for 60/30/10 colour balance.
- Golden-ratio HUD with spiral/focal overlays plus grid/flip/scale transforms.
- Overlay/wipe reference comparison, frame capture, and accuracy scoring (with optional chime at 100).
- Offline-capable PWA: `manifest.webmanifest` + `sw.js` cache the core assets.

How to run locally
- From the project root: `python3 -m http.server 8000` then open `http://localhost:8000`.
- Or with HTTPS (needed on mobile for camera): `npx http-server . --ssl --cert cert.pem --key key.pem -p 3000` then open `https://localhost:3000` and accept the cert.
- If changes don’t appear, hard-refresh or clear site data (service worker cache key: `6010-v1`).

Main UI flow
- Landing card → click “Open Studio” → studio UI unlocks.
- Start Camera: picks last-used device if available; device list is populated via `enumerateDevices`.
- Overlay/Wipe: upload or capture a reference still; choose ghost overlay or wipe and adjust opacity/offset/scale/flip/grid.
- Bars & scoring: shows dominant colour segments, their percentages, and stickiness smoothing to avoid jitter; chime plays at score 100.
- Golden HUD: enable spiral/fitting, quantization percentage (Q%), saturation weight and curve.

Key script behaviors (`app.js`)
- UI mode setup (`setupUIMode`): loads simple/pro choice from `localStorage`, toggles body classes, and syncs the mobile mode buttons and desktop select.
- Control tagging (`markProOnly`): marks advanced controls so “Simple” hides them.
- Range styling (`updRange`): updates CSS custom prop for filled track percentage.
- Camera pipeline: selects device, starts video, and draws frames to canvas for analysis; respects `inclNeutrals` and `satCutoff` sliders when segmenting colours.
- Colour math: converts RGB→HSV, clusters dominant colours, and computes 60/30/10 percentages with hysteresis smoothing (`stickyUpdate`/`renderBars`).
- Overlay tools: manages ghost/wipe canvas, offsets, scaling, flip, and grid toggles.
- Golden HUD: draws spirals/focal geometry based on mode, fit, and quantization.
- Capture: grabs current frame (with overlay) for download or reference.
- Audio cue: plays a short chime when accuracy hits 100 (guarded for suspended audio contexts).
- Persistence: saves UI mode, saturation cutoff, inclNeutrals, theme, last device, and pro entitlement/trial flags to `localStorage`.

Assets
- Icons: `icon-192.png`, `icon-512.png`; splash/hero: `soLUTion1a.png` (customize via CSS `--hero`).
- Service worker: `sw.js` handles cache-first for core shell files.
