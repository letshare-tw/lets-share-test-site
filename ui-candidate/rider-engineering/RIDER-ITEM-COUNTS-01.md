# RIDER-ITEM-COUNTS-01

2026-11-13 Asia/Taipei. Base commit: 7a086e6a0936e3b85d11b33ff9bf4b1cc6c0ca5f.

## Delivered test behavior

- Each task remains one bag; nullable clothing_count records declared items per bag (1–1000 integer). NULL means unknown. Existing tasks are not backfilled with invented counts.
- Simulated headquarters can edit the count only for unassigned/offered tasks. Rider and receiver roles cannot change it; acceptance locks it. Revision/command-id guards and audit history are retained. This is a virtual test dispatcher inside each owner's workspace, not production employee RBAC.
- New synthetic tasks contain two test items by default; headquarters may change that value before acceptance. This default is not a claim about real sharing bags.
- Task cards, scoped previews, trip-stop summaries, pickup/delivery proof headings, receiving records and delivery totals show declared counts. A mixed group says how many items are known and how many bags remain unknown; it never claims a complete total from partial data. Riders still do not open bags to count clothing.
- Task creation now limits outstanding, not-yet-handed-over tasks to 12 per test workspace. Delivered/cancelled/pending-signature tasks and post-handover exceptions do not exhaust the test pool. Lifetime task numbering still includes history; no historic task or receipt is deleted.
- No existing user's count, task status, signature or sharing application was modified by engineering tests. SQL fixtures are rolled back.

## Backend delivery

Applied rider_declared_item_counts and rider_task_pool_reuses_completed_capacity to lets-share-test only. Added a constrained column, extended the private gateway/snapshot, and deployed rider-test-api v5 ACTIVE with verify_jwt=true. Edge still validates Auth.getUser; the only Edge changes are the set_item_count action and clothing_count payload whitelist. SDK pin remains 2.119.0. Service-role credentials are not exposed. Private gateway ACL is postgres/service_role only; snapshot ACL is postgres only; both preserve empty search_path. Existing ownership, qualification, proof and formal locks remain.

## Verification

| Check | Result | Scope |
|---|---|---|
| item-count-regression.sql | 27/27 PASS | Rollback gateway fixtures: range/type, roles/workspaces, audit, replay, revision, acceptance lock, preview/pool/receiver count, receipt, synthetic count, historical pool reuse, active bound, formal lock |
| task-preview-regression.sql | 11/11 PASS | Updated nine-field preview, minimal pool, isolation and privilege |
| integration-regression.sql | 23/23 PASS | Existing claim/arrival/handover/receipt/proof isolation/private 100000-byte limit/share-data invariants; caller-scoped authorized owners |
| item-count-ui-regression.cjs | PASS | Mock headquarters editor, invalid values blocked, bound task/revision/command, readback, accepted editor removed |
| trip-stops-regression.cjs | PASS | Mock full three-pickup/one-delivery flow, count sum 2+4+6=12, mixed unknown handling, camera, swipes, signatures, capacity and owner-scoped recovery |
| task-priority, task-preview and prototype UI regressions | PASS | Mock distance/address hierarchy, stale data/session guards and current workflow |
| Unauthenticated Edge HTTP probe | 401 | No token, no data write |
| Node syntax checks | PASS | app/workbench |

These are not a real Google Session, physical camera, Storage HTTP upload or mobile touch acceptance. Updated item-count behavior still needs phone acceptance. Existing proof tests deliberately use the service SQL fixture path and cannot establish authenticated Edge/photo E2E success.

Security advisors remain at the existing baseline: 10 RLS-no-policy INFO, 2 existing registration SECURITY DEFINER WARN, 1 leaked-password WARN; no new rider finding. References: [RLS](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [function privileges](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Remaining release gates

This completes the declared-count/test-pool increment, not formal operational readiness. Google map embedding/real road distances need a configured Maps API project and key; the current map stays explicitly schematic and navigation opens Google Maps in two-wheeler mode. Real sharer-to-rider task import, production rider roles, authentic credential review, published cooperation documents, approved fees/payment and production release remain unimplemented or locked. No Google Cloud billing, Gmail, Drive, SMS, production repository or production Supabase was touched.

Phone path: member center → rider test management → simulated headquarters → create synthetic task / save count → rider task picker → choose tasks → depart → tasks workflow / delivery station → pickup proof → apricot delivery proof → receiver signature. Unknown historic counts stay visible as unknown.

## Rollback

Restore frontend files from the base commit and redeploy the saved v4 Edge source if needed. For database rollback, restore the prior gateway/snapshot from the base engineering sources before considering column removal. Preserve the count column and its audit events to avoid destroying any new test data; old clients tolerate the extra field. The two SQL files record the forward migrations in application order. No automatic destructive rollback is supplied.

Reference reviewed: [Supabase database functions](https://supabase.com/docs/guides/database/functions) and current changelog; no SDK or CLI upgrade performed.
