# SHARE-AGREEMENT-ENTRY-01

Scope: test-site `ui-candidate/` only. No database changes or consent writes performed by engineering.

Behavior: on entering the share tab, wait for the authenticated bootstrap. Open the current published agreement only when the current account has no recorded consent for that version. Never open over another tab after a late response. Dismissing without consent leaves submission locked; re-entering prompts again. Persisted consent skips the prompt, including on a fresh page. Manual review of an already agreed version is read-only. Account changes and new published versions require their own consent.

Regression: actual app and agreement scripts in jsdom 26.1.0, mocked backend. PASS: initial home without popup; unagreed share entry; scroll gate; no automatic consent; no repeated popup on same-view clicks; prompt on returning while unagreed; persisted consent skip; manual read-only review; account/version separation; early navigation before bootstrap; late response after leaving; fresh-page persisted consent. No real Google Session or phone claim.

Run with jsdom@26.1.0 available to Node: `node ui-candidate/share-engineering/agreement-entry-regression.cjs`.

Real Google Session and mobile acceptance of this change: PENDING. The previous browser Session expired during the preceding photo-limit acceptance work. No user consent is accepted on the user's behalf.

Existing photo limit remains 100000 bytes. Existing test submission and agreement text are unchanged.
