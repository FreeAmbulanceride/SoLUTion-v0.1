Feature Guide
=============

Studio Modes
------------
- **Mode: Simple/Pro** (`uiMode`): switches between basic and full control sets. Persisted in `localStorage` and mirrored between the desktop select and mobile toggle.

Camera & Feed
-------------
- **Camera device**: populated from `enumerateDevices`; remembers last selection. Tries back camera on mobile, otherwise last-used or default.
- **Start Camera**: runs `getUserMedia` with the chosen constraints and hydrates the preview.
- **Snap/Save Photo**: captures the current frame (optionally with overlays) to a JPEG, triggers Web Share if available, else downloads.

Color Segmentation & Scoring
----------------------------
- **include neutrals**: when checked, the saturation cutoff is forced to 0 so gray/neutral pixels remain in the sample.
- **min sat** (0–0.40): per-pixel saturation floor; pixels below are ignored unless neutrals are included. Stored as `satCutoff6010`.
- **Score update** (`per frame` / `per second`): throttles how often the 60/30/10 score text updates.
- **Bars**: K-means (k=3) on a downscaled frame; dominant clusters are smoothed by EMA and “sticky” hysteresis (soft band 1%, hard 3%, 3s dwell) before rendering.
- **Score**: compares the top three percentages to 60/30/10 using weighted penalties (0.5/0.35/0.15). ≥85 = pass, <60 = fail. Plays a short chime at 100.

Reference Overlay (Ghost/Wipe)
------------------------------
- **Ref still upload / Capture Current Frame**: choose a still or grab the live frame as reference.
- **mode** (`Ghost` / `Split/Wipe`): ghost draws the ref atop the feed with opacity; wipe shows ref on the left portion only.
- **opacity**: ghost alpha (0–100%).
- **scale**: scales the reference relative to fit.
- **x / y**: pixel offsets for positioning the reference.
- **flip**: mirror the reference horizontally.
- **grid**: draws rule-of-thirds plus midlines over the reference.
- **wipe** (shown only in wipe mode): sets the vertical divider position (0–100%).

Transform & Capture
-------------------
- **Snap/Save Photo**: reuses the current video frame and overlay canvas; outputs JPEG via download or Web Share.

Golden HUD & Composition
------------------------
- **Golden HUD Display**: toggles all Golden ratio overlays and saliency scoring.
- **spiral** (`off`, `auto`, TL/TR/BL/BR): draws a phi spiral grid; `auto` picks the quadrant nearest the detected salient point.
- **fit** (`fit inside`, `cover`): how the spiral frame fits within the video box.
- **Q%** (1–20): saliency quantile; only pixels above this percentile are considered “interesting” for centroid/score.
- **sat wt**: weight of saturation in saliency; boosts chroma-heavy areas.
- **sat curve**: gamma curve on saturation before weighting; >100 flattens, <100 emphasizes.
- **Phi score**: distance of the salient centroid to the nearest Golden hot spot; 0–100 with the same pass/warn/fail tags.

UI Theming & PWA
----------------
- **Theme derive**: samples the landing hero image to set `--ui-primary/secondary/accent`; stored as `derivedTheme_v1`.
- **Offline**: `sw.js` caches core assets (`6010-v1` cache key); `manifest.webmanifest` defines icons and PWA metadata.

Persistence Keys
----------------
- `uiMode`, `satCutoff6010`, `inclNeutrals6010`, `lastVideoDeviceId_v1`, `derivedTheme_v1`, `scoreUpdateMode`, trial/pro keys.

How calculations are done (high level)
--------------------------------------
- Frames are downscaled to ~320px wide, lightly blurred, and sampled sparsely for speed.
- Pixels failing `min sat` (unless neutrals) or value < 0.08 are skipped.
- K-means (k=3) clusters RGB; cluster shares are EMA-smoothed, then “sticky” bars update when change exceeds soft/hard thresholds.
- Score: weighted deviation from 60/30/10 yields 0–100; tags map to pass/warn/fail.
- Saliency: combines luminance contrast and edge energy, modulated by saturation weight/curve; top Q% forms a weighted centroid; proximity to Golden-grid hotspots sets Phi score and auto-spiral corner.
