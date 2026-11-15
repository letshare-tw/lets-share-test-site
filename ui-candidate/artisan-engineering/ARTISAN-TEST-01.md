# ARTISAN-TEST-01 — Google identity and test capacity

Base test-site main: 32781b9f92fcf36d99e33096381648a3182d29c3.
Frozen design source: Sites v19 / 58690bfbf6a38ae3df16c542ac3165f562319ca5.

Entry: ui-candidate/artisan.html. Frozen design remains on Sites; integrated development proceeds on GitHub test Pages, same origin/storageKey as existing member/rider test auth.

Implemented: existing Google PKCE login returns to artisan only for allowlisted sessionStorage marker, default login still returns to mall. Verified session and RPC user_id scope, four-account server allowlist, completed member registration gate, explicit self activation of isolated test workspace, persistent own capacity and receiving_open.

Applied migration: 20261115185505 artisan_test_identity_capacity_foundation.
Private table has RLS and no direct client table grants/policies; access is solely via private, empty-search_path SECURITY DEFINER gateway with auth.uid(), existing Google allowlist and registered-profile check; public wrapper is SECURITY INVOKER and authenticated only. formal_enabled is CHECK false. No real workspace was activated during implementation. SQL functional tests were inside BEGIN/ROLLBACK.

Verified: two account isolation, unregistered rejection, capacity bounds, explicit activation confirmation, unsupported formal action rejection; anon RPC execute and authenticated direct table SELECT denied. JS syntax / zero synthetic fixtures / all five render functions / actual profile name / callback allowlist and normal mall return PASS. Advisories: new INFO RLS-no-policy on intentionally inaccessible table, existing 3 WARN unchanged in category.

Pending: phone Google login/refresh/sign-out verification; camera on real devices; real bag source/rider mapping, artisan receipt/catalog/inventory/photos/order links. Backend currently returns empty bag/inventory arrays tagged identity_capacity_only; no fake LX bags are loaded in integrated app. Capacity occupancy is zero because assignment integration is pending, not verified real availability. No formal qualification/dispatch/payment enabled.

Do not replay SQL. Do not modify formal project, lets-share-app or frozen layouts. Existing member/rider source unchanged except shared auth adapter adds artisan pathname, optional return marker and scoped RPC method. callback files versioned for new adapter. No OAuth provider configuration changes, SMS or email.

Run source JS regression from root artisan-test-build: node ui-candidate/artisan-engineering/foundation-regression.cjs. It uses built-in VM, no live accounts or writes. The source path expectations are relative to that root.
