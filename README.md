# 60/30/10 Studio

Live on-device color metering, composition guides, and reference tools for cinematographers who need to hit the 60/30/10 balance before a take. The landing page lets you trigger the studio, the service worker/manifest make it installable, and the whole app runs in the browser with no backend.

## Features

### Core studio
- Real-time camera feed with 60/30/10 grading bars, legend swatches, and a throttled score that defaults to “per second” updates (`scoreUpdateMode`).
- Custom threshold controls for saturation, neutral inclusion, K=3 clustering, and scoring adjustments backed by EMA smoothing plus sticky bar rendering.
- Golden-ratio HUD (grid + spiral) with saliency-based marker, phi score, and the ability to toggle the entire HUD or change the spiral fit/corner.
- Full reference overlay: upload or capture a frame, adjust blend/wipe/scale/offset/flip/grid, and save/share a composited capture.
- Camera / device helpers that remember the last-used camera, prioritize the rear lens on mobile, and keep the device list refreshed when hardware changes.
- Zebra (overexposure) and skin-tone highlights painted on a dedicated overlay canvas so you can spot blown highlights or flesh-tones while shooting.
- Palette chips that list the top 3 generated colors plus RGB/OKLCH values and a “Copy palette” button for sharing/exporting swatches.
- Dynamic theming derived from the hero image or stored preferences, plus persistent UI mode, slider states, and saturation cutoff.
- Soft paywall/trial helpers (currently disabled) with trial countdown, restore/purchase buttons, and localStorage billing keys.

### “Pro” mode extras
- Pro-only controls in the sidebar (ghost/wipe reference uploads, scale/offset/alpha/grid/wipe sliders, phi HUD switches, guide list, and advanced golden-spiral/phi-fit toggles).
- Palette export, composition guide list, zebra/skin overlays, and “Phi HUD” badges only shown while `body` has `.pro` class (managed by the simple/pro toggle).
- All advanced controls are hidden in simple mode through `setupUIMode()` but are still available for donors by flipping to `pro`.

## Composition guides
- `composition-guides.js` exposes dozens of guides (thirds, phi, golden spirals, diagonals, dynamic symmetry, perspective grids, safe zones, ratio masks) via `CompositionGuides.draw(ctx, rect, key, options)`.
- The rewrite adds pixel-snapped lines, contrast-enhancing shadows, and flip-aware rendering so the overlays stay legible against bright/dark backgrounds.

## Getting started
1. Run a local HTTPS server (`npm`/`python`/`http-server`) because camera APIs require HTTPS or localhost.
2. Open the page, allow camera access, and click “Open Studio” (or tap “Start Camera”) to begin streaming.
3. Use the sidebar to pick camera sources, adjust saturation cutoffs, and switch between simple/pro UI modes.
4. Toggle guides, zebra/skin overlays, and reference capture/ghost overlays while watching the live bars and score.
5. Use the “palette chips” panel to copy the dominant HEX/RGB/OKLCH data for sharing or texture matching.

## Project structure
- `index.html`: landing page, paywall card, studio layout, camera buttons, readout bar, and Pro control sections.
- `styles.css`: comprehensive design system (tokens, responsive grid, readout layout, palette chips, stage controls, pro-only visibility).
- `app.js`: glue logic for UI state, device enumeration, frame analysis, k-means clustering, pallette export, golden HUD, composition guide wiring, paywall helpers, and capture sharing.
- `composition-guides.js`: modular drawing functions for every guide, now rendering with crisp snap offsets, shadows, and flip-aware options.
- `manifest.webmanifest` + `sw.js`: installable PWA shell with offline caching of assets.

## Notes
- Donation mechanism: you can link to a reputable donation channel from the landing/footer when ready; pro-only controls simply require switching the UI mode (no gate is enforced yet).
- Tests: manual testing via the camera feed is the reliable path—run it in Chrome/Firefox, check the overlays, and use the palette copy export to verify clipboard support.

## License
See `LICENSE` for licensing details.
