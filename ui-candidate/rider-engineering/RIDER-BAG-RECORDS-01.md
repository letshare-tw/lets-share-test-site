# RIDER-BAG-RECORDS-01

Test site UI only. Delivery working view now shows the current bag and aggregate signed/pending status; removes the long per-bag status rows and separate record card. A sunshine-orange Records and Photos button opens this stop's bags as thumbnail/message rows with bag code, declared quantity, state, deadline and receipt if present. Pickup photo thumbnails load only after opening, with sequential scoped proof_link reads. Click thumbnail to enlarge, return to list. Existing delivery photos remain accessible from each applicable row. Navigation explanation is collapsed.

No task or capacity mutations added. Private URLs are HTTPS and exact approved project origin; close/modal/session/actor/scope/revision guards discard stale responses. Missing/failed photos show honest placeholders. Links live only in DOM, not persistent storage.

Validation: node syntax; mocked JSDOM record list/read-only scope/zoom/back/no-photo/errors/origin/close/session cases PASS; existing grouped-trip/departure/proof/camera/capacity regression PASS. Real phone visual and signed-photo acceptance PENDING. Formal operations remain locked.
