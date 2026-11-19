# PHOTO-LAB-04 — saved lighting calibration / hanging product capture
Scope: ui-candidate photo lab only. No production, database, rider or settled artisan UI changes.

1. Capture unobstructed LS-CIRCLE-01 card. Validate 24 samples; optionally locate four marks manually. Explicit save stores version, card version, model, strength, timestamp in browser localStorage (no photos).
2. Product mode reuses saved model, skips card detection and all old card coordinates. Photograph whole garment inside dashed lower hanging frame; capture retains matching 3:4 preview crop. Each new photo resets masks/rectangles but preserves profile.
3. Changed light, phone, camera position: recapture card. Browser exposure/white balance may change; compare result and adjust strength. No camera hardware lock promised.
4. Colored frame-edge background seeds plus GrabCut. Keep largest foreground component. Manual rectangle/erase/restore remain available; hanger may remain. Similar-colored or patterned backgrounds need inspection.
5. All calculations local, OpenCV 4.8 official WASM initial network load. No photo upload, database write or product publish. Profile only saved on successful calculation + explicit save. Failed retry keeps previously saved profile.

Validation: JavaScript syntax; VM profile validation/save/reuse/clear/stage transitions; actual uploaded full-card photograph yielded validated automatic marks and multi-color model. Separate hanging polo photograph processed with saved model and no visible card; pink backdrop removed and both sleeves retained. Photos not included in repository. Real phone camera/permission acceptance pending user verification.
