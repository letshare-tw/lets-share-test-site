# RIDER-DELIVERY-CAMERA-GRID-01

Delivery proof UI: shared in-page camera first; two equal-width columns below. Left has bag code input and scan button, right is a capture button spanning both rows. Delivery remains sunshine orange. Captured preview stays above controls. Pickup and sharer camera default layout unchanged.

Camera mount accepts optional captureHost; the same capture button/listener is placed there, and stays visible but disabled when the stream is stopped. Camera ownership, compression, scan validation and final upload guards are retained.

Validation: JS syntax PASS; delivery DOM/shared-media/preview/final-swipe regression PASS; grouped trip, pickup, delivery, camera and capacity regression PASS. Tests use mocked media/session/backend; actual phone visual acceptance pending.
