# RIDER-TASK-PREVIEW-01

Task details now show pickup and delivery locations before acceptance, with pickup-to-delivery kilometres and current-position-to-pickup kilometres. All distances are explicitly straight-line estimates, not motorcycle road distances. Vehicle selection remains internal.

The current controlled fixtures contain labels such as 臺南車站周邊 and 公園周邊, not verified street addresses. The UI displays these stored labels honestly; this change neither geocodes nor fabricates real member addresses. Production address capture/verification and road-distance routing remain outside this test change.

The existing authenticated Edge action bootstrap passes task_id to a narrow private gateway preview. A qualified virtual rider with a qualified vehicle may read one unassigned task or their own offered/accepted/picked-up task, only within their owner workspace. The ordinary available-task snapshot remains coarse. The preview returns eight fields: id, bag_code, pickup_label, delivery_label, pickup_lat/lng, delivery_lat/lng. No member name, phone, photograph or other-account task is added. The gateway retains its service-only ACL and empty search_path. Existing virtual actors are still simulations, not production RBAC.

Location is requested once after opening loaded task details, with explicit retry, no watchPosition. Coordinates remain in the callback closure and are not sent to the backend or persisted. Denial or timeout displays unavailable honestly and does not block acceptance. Closed/superseded/account-switched modal callbacks are ignored. Backend preview failure leaves acceptance disabled. Existing Edge opportunistic cleanup remains unchanged; the SQL preview branch itself writes no task, revision, event or command.

## Verification

- task-preview-regression.sql: 11/11 PASS in rollback-only synthetic service-gateway fixtures; qualified preview, minimal fields, no preview mutations, coarse pool, cross-workspace/other-rider/receiver/unqualified denial, ACL and formal lock.
- task-preview-regression.cjs: PASS for known distances, antipodal/zero/invalid/missing coordinates, escaped address, async loading gate, GPS success/denial/retry, no coordinate transmission/storage, stale modal/account callbacks.
- default-vehicle-regression.cjs, prototype-ui-regression.cjs, trip-stops-regression.cjs: PASS after adapting mocks to the scoped preview read.
- Node syntax checks: PASS. Supabase security advisors unchanged: 10 existing RLS-no-policy info, two existing registration SECURITY DEFINER warnings, one leaked-password warning; no new rider finding.
- Phone Google Session, actual GPS permission and rendering: PENDING user acceptance. Mocks and service SQL do not establish mobile E2E PASS.

Only lets-share-test and letshare-tw/lets-share-test-site/ui-candidate changed. Formal operations, dispatch and payments remain locked. Edge code/version, production environments and Google services were not changed.

Existing advisor references: [RLS](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [function privileges](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Implementation reference: [Supabase database functions](https://supabase.com/docs/guides/database/functions). Reviewed current changelog; no SDK/CLI upgrade is part of this change.
