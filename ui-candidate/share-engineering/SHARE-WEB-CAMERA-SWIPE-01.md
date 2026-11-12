# SHARE-WEB-CAMERA-SWIPE-01

Date: 2026-11-13 (Asia/Taipei). Base: b002bd5cebf525a9ea3cce86b353faa5f1afe37b.

The sharer form and published sharing agreement now reuse the rider's current original-logo swipe module. The handle and track are both 72px high, the original bitmap is contained without cropping or zooming, and the 15% grey/black track fills brand green up to the moving logo's centre. Release at 85% confirms; tap, short drag, cancellation, changed state and resize do not confirm. Successful application receipt stays green with white text and the logo on the right; receipt uncertainty remains locked for readback. Keyboard confirmation remains a deliberate ArrowRight then Enter action.

The agreement still requires the published server document, actual bottom-of-document reading, and an explicit separate confirmation. Same-version stored consent remains read-only. Account/version changes, background scroll locking and stale-response guards are preserved. No consent was recorded for a real person by this engineering work.

The sharer camera now reuses rider-camera.js: video-only rear-camera preference, in-page video and capture, local canvas snapshot, existing compression loop capped at exactly 100000 bytes, then preview. Opening/retaking invalidates the old photo's submit readiness. Only Save Draft uploads to the existing private storage path and associates the draft. Permission denial has an explicit existing-photo fallback without the native capture attribute. Camera tracks stop on capture, close, leaving the sharing tab, backgrounding, session change and pagehide; late permission streams are stopped. No microphone is requested. No camera permission is requested automatically when entering the page.

New share-controls.css is scoped to the sharer form and sharing agreement; rider and receiver modules/styles are unchanged. The legal text, service activation, backend submit/preflight/readback, storage policies, authenticated account isolation, formal-operation locks and other site artwork remain unchanged. No Supabase schema, function, Edge deployment, Google service or production repository was modified.

## Verification

- web-camera-swipe-regression.cjs: PASS. Mock camera capture → compression → local preview → explicit save; no audio, no capture attr, no immediate upload, retake gate, single final submission and receipt lock. Tab/account/late-permission cleanup, denied permission and encoder failure covered. Read-bottom agreement confirmation stays separate from submission. CSS checks verify grey track, equal 72px handle and unzoomed contained logo.
- agreement-entry-regression.cjs: PASS after migration to the shared module. Entry prompt, persisted consent, read-only review, account/version isolation, read-bottom gate and late response suppression.
- photo-limit-regression.cjs: PASS. 100000 accepted, 100001/empty/wrong MIME rejected before Storage; encoder retries, failure and URL cleanup.
- Node syntax checks: PASS.
- These use mocked media, encoder and backend. Real Android camera permission, camera rendering, actual Google Session/private Storage and touch appearance remain PENDING mobile acceptance. No new server-side or real sharing submission was executed as a test.

Rollback: restore index.html, app.js, share-agreement-ui.js and the two adapted regression files to the base commit; remove share-controls.css and the new regression/doc. Shared rider modules and database are unchanged.

API reference reviewed: [Media Capture and Streams](https://www.w3.org/TR/mediacapture-streams/).
