# ARTISAN-CAMERA-03 — modal catalog and live garment camera

Base: 214c88bd9e42d4e84728e7ccf66b99e541dd69ca.
No database changes. Frozen palette/navigation and receiving integration retained.

After opening a received bag, Start catalog opens native dialog. Catalog form, current bag, measurement rulers, photos and draft are scoped to the current item. No automatic text input focus. Close preserves in-page field values and photos; switching bag clears them. Saving the demo item starts a fresh modal for the next garment.

Live rear camera only via getUserMedia, no file/gallery chooser. Portrait 3:4 stage uses object-fit:cover. Canvas source crop uses videoWidth/videoHeight and same centered3:4 math; max1200px high JPEG .9. A garment-shaped dim mask and dashed white outline remain DOM overlays, never canvas input. Not automatic measurement, segmentation or face/garment recognition. Up to8 in-memory photos per garment labelled front/back/defect.

Stream stopped on modal close, cancel, changing pages, document hidden, pagehide and logout/account change; generation invalidates late media/capture completion. Capture requires ready video size and active stream. Photo URLs revoked on item/bag cleanup.

Verification: JS syntax, modal launch, no file input, 1920x1080/1080x1920/1200x1600 crop dimensions and boundaries, canvas capture and cleanup VM PASS. Real phone camera orientation/focus/light/permission and modal ergonomics PENDING.

Garment photos/catalog remain explicitly local demo; receiving is persistent test backend. No product photo bucket/upload, persistent item DB, formal publishing/payment or production changes. Do not claim full inventory completion.
