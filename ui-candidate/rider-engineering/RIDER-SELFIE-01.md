# RIDER-SELFIE-01
2026-11-14 Asia/Taipei. Test environment only.

"My rider profile" adds front-camera selfie, whole-image preview, explicit save, replace and remove. Header displays the private current rider photo. Shared camera optional facingMode defaults to environment, selfie requests user. Existing pickup/delivery/share behavior unchanged. Selfie is not a new acceptance/qualification gate, not identity verification or facial recognition.

Storage: private rider-test-avatars bucket, max 100000 bytes, JPEG/PNG/WebP. One current object: owner/workspace/actor/selfie. No public URL, localStorage photo, JWT or service key. Storage INSERT/SELECT/UPDATE/DELETE uses private avatar_access helper with auth.uid(), existing registered test-member allowlist, enabled owned workspace and rider role. SECURITY DEFINER is required only to inspect private authorization tables; fixed empty search_path; revoked PUBLIC/anon execution; private schema outside REST. No changes to operational role grants, Edge functions, tasks, receipts or formal locks.

Frontend verifies session before/after every SDK operation; scope/epoch guards suppress old-account responses. Camera tracks and Blob URLs cleaned up when closing, changing account/tab or rerendering. Saved photo replaces current object (no application-managed history). Removal re-reads to verify. User must explicitly click save before upload.

Validation: syntax 4 JS files; JSDOM mock front-camera/preview/save/readback/remove/stale-scope/URL/stream cleanup; adapter mock size boundary and role/session rejection. Test DB rollback checks own rider path true, foreign owner/workspace/non-rider/malformed false, anon helper unavailable, private bucket and four policies. Security advisors remain existing 10 INFO/3 WARN; no new finding. Real Google Session + Storage HTTP and phone selfie image quality pending user acceptance. No actual selfie collected by engineering.
