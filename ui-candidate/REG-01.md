# REG-01 — Basic member registration (locked release)

Scope: lets-share-test and lets-share-test-site/ui-candidate only. No Twilio, old project, production site or SMS changes.

## Behavior

Requires a live Google identity, 2–30 code point display name without control characters, Auth-verified phone, and explicit acceptance of the current approved/published membership terms plus acknowledgment of the privacy policy. Real name and address are optional for basic registration; existing data is retained. Share-service consent and activation remain separate.

The member center shows a registration card with server-confirmed status, a masked phone, full-document reading dialogs, initially unchecked consent controls, and a completion button. No draft legal copy is shown as published. Registration stays locked on both client and server.

## Backend

Applied migration: member_registration_locked_reg01. Reproducible schema is registration-backend.sql. Three new tables: public.lx_member_legal_versions, public.lx_member_registration_consents and private settings. All use RLS; clients can only read their own consents and published legal text. No client writes to settings, legal documents, consents, profile phone or registration timestamp. Existing profile grants and RLS were preserved.

Public SECURITY INVOKER RPCs delegate to narrowly scoped private SECURITY DEFINER functions with an empty search_path, no user ID arguments, and explicit auth.uid checks. Complete RPC locks settings/legal rows and the member profile, checks Auth identities/verified phone, and atomically writes consent plus timestamp. Repeated requests reuse the consent and completion timestamp. Approved document contents cannot be overwritten. Publication and registration opening require separate reviewed authorization.

## Release state

settings.enabled=false, active_version=NULL; zero legal versions, zero registration consents, zero completed profiles. Existing member and verified phone are preserved. Nothing auto-accepts terms. No phone revalidation is performed.

## Validation

- 28 database assertions passed using synthetic users and TEST ONLY legal text inside an exception subtransaction that rolled back all fixtures and temporary enablement. No fixture documents or completed accounts persist. Includes locked/unpublished/expired/withdrawn/stale versions, Google/phone/name requirements, direct-write rejection, anonymous denial, account isolation, optional real name/address and idempotence.
- 32 Node assertions passed against the actual adapter/UI using mocks, including default-locked controls, both consent checkboxes, full-text rendering via textContent, account-switch response rejection, success status and logout cleanup. No real network or consent writes in these mocks.
- Existing Google/Auth mock checks: 39 PASS; public safety-lock selftest: 31 PASS. Corrected pre-existing double-escaped phone/OTP format checks without enabling SMS.
- Supabase security advisors show no newly introduced findings compared with baseline. Pre-existing share-table default-deny notices and the password-protection setting were not changed.

## Rollback

Restore the four changed UI files (index.html, auth-ui.js, test-auth-adapter.js, README.md) to the parent commit; remove new REG-01 frontend/test/documentation files. Keep backend settings disabled. Do not drop consent history or legal versions after real member acceptance; use a separately reviewed database rollback.
