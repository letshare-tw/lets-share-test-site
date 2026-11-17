# PHOTO-LAB-02 — local flat-lay reference calibration and foreground extraction

Scope: only the standalone `ui-candidate/artisan-photo-*` test page. No artisan catalog, rider, login, Supabase or production changes.

PHOTO-LAB-01 required a mode selection plus a second photo tap and only removed one contiguous sampled background color. It never implemented LS-CIRCLE-01 recognition. This made patterned tiled floors unsupported and mode selection look unresponsive.

PHOTO-LAB-02 captures rear-camera photos, stops the camera, and automatically attempts card recognition + correction + foreground extraction. Also offers experimental local-file reprocessing, independent color/cut retries, original/color/result views, 0–100% correction strength, manual four-marker registration, two-point garment rectangle, erase/restore/undo, alpha/white background and foreground crop. Original stays in memory unchanged. Exported originals are normalized camera/photo canvases (max 1800px), not original EXIF/file-byte archives.

Algorithm:
- Versioned first-party `artisan-photo-engine.js` uses the exact 24 custom sRGB targets from LS-CIRCLE-01/R2. Orientation: patch01 at top, clockwise15deg; canonical circle(627,630),R500, sampleR425/patchRadius10, marker centers(84,134),(1164,134),(1164,1134),(84,1134).
- Candidate green logo → nearby four dark marker centers → homography → median patch sampling. Rejects too-small/out-of-bounds/incorrect gray direction/chroma mismatches. Automatic detection is intentionally limited to reasonably upright, visible, sufficiently large cards. Manual marker registration is the fallback.
- Gray-ramp white balance + bounded exposure; regularized linear RGB 3x3 fit with six held-out patch checks. Fall back to gray-only when matrix checks fail. Default65% blend, adjustable to0. Matching the card's digital targets is NOT proof of accurate physical garment colors. Laser print values remain unmeasured.
- OpenCV.js4.8.0 official prebuilt script `https://docs.opencv.org/4.8.0/opencv.js` (~10MB) lazily loads in a Web Worker. No image data goes to OpenCV or any other server. Cold load timeout85s, overall request120s, errors visible. No paid API/model service.
- GrabCut runs at max900px, excludes known card paper region, uses chroma-conditioned edge-connected neutral background seeding for saturated garments. This may need manual repairs, especially low-chroma/patterned/translucent garments or similar-color surfaces. No generated garment pixels.
- No uploaded test photo or development fixture may be committed/published. QA fixture is local-only.

Validation distinguishes the deterministic-engine test on the supplied photo from browser and actual-device camera checks. Real Android camera permission/capture still requires user validation.

Completed validation (2026-11-17):
- Node syntax checks for controller/engine/worker.
- Core checks: no-op preserves original bytes; degenerate registration and invalid neutral card fail closed; canonical homography maps marker centers correctly.
- Worker thenable initialization regression: resolves OpenCV Module via a plain wrapper (avoids Promise assimilation of the Emscripten thenable), and returns independent color/cut errors.
- Supplied 865×1536 photo: automatic markers (48,836),(194,831),(192,964),(41,970);24-patch sampling succeeds; foreground mask bbox113,497→852,1170 after GrabCut. These coordinates are test evidence, not hardcoded runtime fixtures.
- Chrome live local preview: actual official 4.8.0 dependency loaded; visible UI reports 24-color correction and completed cutout; original/result switching verified visually. Real Android camera capture remains pending user test.
