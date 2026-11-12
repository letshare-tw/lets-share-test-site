# NAV-TEST-01: own pickup-address motorcycle route preview

Authorized scope: test-site ui-candidate only, address-based Google Maps preview. No geocoding, GPS access, map picker, coordinate snapshots, rider privileges, dispatch, paid API or database mutation.

Entry: under the pickup address in the share tab, a button labelled Google Maps 機車導航預覽. It is disabled while unauthenticated, loading, dirty, missing a valid pickup address, or after submission. Save unsaved work before leaving. Merely rendering or loading the page never contacts Maps.

On an explicit click, bootstrap is read again through the existing authenticated adapter. The current identity and displayed address must still match. A session or destination change cancels the action. Only then does the page navigate to https://www.google.com/maps/dir/ with api=1, the encoded destination address, and travelmode=two-wheeler. No credentials, member identifiers, photo paths, notes or origin location are included. No dir_action is requested: show directions first, and let the person choose to start navigation in Maps. Native Maps availability and motorcycle-mode support depend on the user's device and region; the website cannot inspect the external app or claim its mode succeeded automatically.

Current pickup selection is used; a valid approved collection point can also supply its displayed address. This is a preview of the current form, not historical submitted-task navigation. Invalid/changed address or failed session checks prevent opening. Existing sharing consent and 100000-byte photo limit remain unchanged.

Changed files: app.js, navigation-preview.js, index.html (script version and load order), agreement-entry-regression.cjs (load new dependency), navigation-preview-regression.cjs, this record.

Validation: syntax checks PASS. navigation-preview-regression.cjs with jsdom@26.1.0 PASS: motorcycle mode, exact encoded destination including URL-like characters, fixed Google origin, invalid-input rejection, no automatic external request, disabled unauthenticated/dirty state, duplicate-click suppression, server address mismatch, account switch during validation. Existing agreement-entry, photo-limit and camera-session regressions PASS. These tests use mocked identity/backend responses and do not replace native mobile or real Google Session acceptance.

Phone acceptance PENDING: log into an approved test member, open 我要分享, ensure draft is saved, tap Google Maps 機車導航預覽 under pickup address, verify correct destination and motorcycle icon selected, then return to confirm the draft still loads. Do not interpret a car route as PASS. No real pickup is required.

Reference: https://developers.google.com/maps/documentation/urls/get-started (checked 2026-11-12).
