# 樂享家 ui-candidate｜REG-01 註冊流程（保持鎖定）

- 僅連接 lets-share-test（rfwqcrvxyjhtmafnbuyy）；不修改舊專案、正式站、lets-share-app 或 Twilio。
- Google 登入採 PKCE，固定 callback：https://letshare-tw.github.io/lets-share-test-site/ui-candidate/auth-callback.html；登入後仍返回賣場。
- 新增完成註冊卡片：Google、會員名稱、Auth 已驗證手機、會員條款同意與隱私權政策確認。真實姓名、地址使用相關服務時補填。
- 新增兩個註冊 RPC，後端核對本人、手機及現行文件版本，原子寫入同意與完成時間。前端不能直接修改註冊標記。
- 條款未確認：沒有發布文件、沒有啟用註冊，確認欄與完成按鈕停用，沒有會員被標為完成。
- 公開站 SMS 安全鎖維持 false；已驗證手機可正常顯示，不重送驗證碼。公開提示更新為「公開測試站暫停發送簡訊；已驗證的手機狀態照常顯示」。
- 登入及會員名稱、取件地址讀寫沿用現有本人權限；分享、照片、訂單與付款仍為離線示範。完成會員註冊不會自動啟用分享服務。
- 保留 LOGO、Banner、四大分頁與離線分享操作。Supabase JS 2.119.0 與既有 SHA-384 SRI 保持不變。沒有新增密鑰。
- 驗收：node registration-test.cjs（32）、node auth-mock-test.cjs（39）、lockdown-selftest.js（31）；registration-db-test.sql（28，臨時測試資料全部回復）。
- 詳見 REG-01.md 與 registration-backend.sql。後端開關及文件發布需要另行確認授權。

## SHARE-TEST-02–04｜2026-11-11 authorized engineering batch

Only `rfwqcrvxyjhtmafnbuyy` and this `ui-candidate/` directory are targeted.
The shared Auth client calls `share-test-api` (JWT verification enabled). The Edge
verifies the user with Auth, derives the actor ID itself and invokes a service-role-only
SQL wrapper. Its private implementation restricts the two approved registered Google
test accounts and locks the parent request row on draft saves. The six legacy share
RPCs remain inaccessible to anon/authenticated. Direct draft-detail mutation is revoked.

The UI retains the existing branding, banners, four tabs and slider. Draft saves and
private photos are real test writes. Published agreement records remain empty; service
activation, consent capture and submission are disabled in UI and API, with the DB
submission setting false. Drafts never produce a bag code or dispatch riders.

- `share-engineering/share-test-02-04.sql`: applied migration source.
- `share-engineering/index.ts`, `deno.json`: deployed Edge source (no credentials).
- `share-engineering/rollback.sql`: permission/policy/function rollback; close the
  Edge/UI first; do not delete test data or consents as a rollback operation.
- `share-isolation-test.js`: explicit read-only real-Session probe. Confirm foreign
  fixtures exist first; empty results alone are insufficient evidence.
- Private photos: JPEG/PNG/WebP, compressed to at most 300,000 bytes, user/draft path,
  immutable new filenames. Readback uses authenticated downloads and revocable object
  URLs. Deletes are restricted to the caller's unreferenced photos in a current draft.
  Replacement/failed-save cleanup is best effort; never delete a referenced photo.

### Verification evidence and limits

Database gateway create/save/readback, idempotent create, foreign request/photo denial,
missing-address denial and activation/submission locks passed through controlled SQL.
Two real test drafts were created; one has saved details. No profile/address was changed.
`authenticated` SQL-role tests prove own-row visibility and populated foreign-row hiding;
they are **not Google Session tests**. Unauthenticated remote Edge invocation returned
401; allowed-origin CORS preflight returned 204. Security advisor categories were
unchanged from the baseline; existing registration warnings were not broadened in scope.

Node syntax checks and jsdom DOM/Auth-bridge tests passed with mocked network boundaries.
These do not verify real canvas compression, mobile camera operation or Storage transfer.
Local Chromium could not launch because the environment denies its process socket.
Real phone/Google Session/photo upload/download and cross-account Storage testing remain
pending until performed on the deployed page. Never report these as PASS from SQL/jsdom.

### Phone acceptance sequence

1. Sign in with the approved registered test member. Opening the page only reads data.
2. Save the member's address in Member Center if missing; reload the share draft.
3. Change count/note, capture a placement photo, and explicitly save the draft.
4. Reload the page: count, note and private photo must return without a new request.
5. Sign out: private fields and preview must clear. Repeat under the other approved
   member; run the explicit foreign-fixture probe using identifiers supplied privately.
6. Confirm the submit slider stays disabled, no consent is captured, no bag code is
   fabricated, and no actual pickup is arranged.

## SHARE-PHOTO-FIX-01

Phone report: draft count/note survived reload, but the camera area still showed
“尚未選擇照片”; no placement photo existed for that test account at investigation.
The Auth bridge previously invalidated share state on every SIGNED_IN event. A
same-user SIGNED_IN after returning to a focused tab can therefore clear a pending
camera selection. The bridge now emits the invalidation event only when the user ID
changes, including sign-out. It does not change credentials, RLS or submission locks.

The regression test failed before the fix and passed after it. Run the standalone
Node test `share-engineering/camera-session-regression.cjs` (no extra dependencies).
Existing 10 DOM and 6 transport mock checks also passed. Physical Android camera
return, thumbnail display, private upload and reload still require phone acceptance;
this regression does not prove the exact phone event sequence.

## SHARE-AGREEMENT-UI-01 — unpublished reading rehearsal

The existing registration legal-document pattern is reused for the share candidate:
a native modal outside the page, independent document scrolling, fixed background,
and a green track with a white round slider. The candidate's full current text is
embedded as text, with its version and unpublished status displayed.

The slider stays disabled until the visible document reaches the bottom. Partial
swipes reset, scrolling away from the bottom disables it again, closing does not
complete reading, reopening starts at the top, and account changes close/reset it.
A successful slide only reports a local reading-operation rehearsal. No session/local
storage reading flag, consent RPC, activation call, agreement publication, or share
submission is performed. The main submission slider remains locked.

Syntax checks, dedicated jsdom scroll/slider regression and existing mocked DOM/Auth
bridge/camera-session tests passed. Mocked layout does not establish physical mobile
scroll/gesture PASS; deployed browser and phone acceptance are tracked separately.
