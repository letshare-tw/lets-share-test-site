# 樂享家 ui-candidate｜B-01C-07B 離線安全整合候選版

- 基準：B-01C-06D 手機驗收 PASS，Commit `74ab57b5dccd5e1c510237ace228e15defe7ae4a`。
- 範圍：僅 `letshare-tw/lets-share-test-site/ui-candidate/`，與正式網站及 Supabase 隔離。
- 視覺：沿用原有 LOGO（42×42）、Banner、賣場／我要分享／購物車／會員中心四大分頁。
- `demo-adapter.js`：完全離線、僅記憶體示範會員／地址／集貨點／草稿／模擬回執。
- `test-api-adapter.js`：C09 V5 資料契約及預設拒絕的安全鎖；無任何實際 API 呼叫。
- `adapter-selector.js`：唯一允許 `getAdapter("demo")`；任何其他模式及切換均拋出錯誤。
- `app.js`：只從 `LX_ADAPTER_SELECTOR.getAdapter("demo")` 取得既有 Demo 介面，沿用原拍照、表單及滑動模擬操作。
- `lockdown-selftest.js`：載入時執行 10 項 API 拒絕檢查、6 項模式拒絕檢查與選擇器相容性檢查；結果寫在 `document.documentElement.dataset.lxLockdownTest`（PASS／FAIL），可用瀏覽器 Console 執行 `LX_LOCKDOWN_SELFTEST.run()` 再測。
- 安全：不連接任何 Supabase，不啟用真實登入、上傳、提交或付款；請勿輸入真實個資。
- 驗收：核對檔案改動範圍、靜態檢查、GitHub Pages Actions SUCCESS、手機視覺與離線流程 PASS。瀏覽器自我測試 PASS 須以實際執行結果為證，不以原始碼檢查取代。
- 回復：若有異常，僅將 `ui-candidate/` 恢復至上述穩定 Commit 的內容；不重設整個 repo 的 main，不修改正式站。

## B-01C-07C-01｜測試登入安全骨架（未啟用）
- 基準穩定 Commit：`b40640258139e0b114cbed82a37c70ee4fccb1c3`（07B 手機 PASS）。
- `test-auth-adapter.js`：只定義 `signInWithGoogle`、`handleCallback`、`getSession`、`refreshSession`、`getProfile`、`signOut`、`restoreSession` 等方法；全部拒絕執行。
- `auth-callback.html`：僅為測試站 OAuth 回跳預留頁。路徑 `https://letshare-tw.github.io/lets-share-test-site/ui-candidate/auth-callback.html`。目前不向 Google 或 Supabase 發出請求，不讀取、交換、保存任何憑證；如網址帶有 query/hash，僅清除網址參數並顯示未啟用提示。**此路徑尚未授權或設定為真正 OAuth redirect。**
- `index.html`：先載入鎖定 Auth adapter，再執行自我測試，其他畫面、圖片、分享操作不變。
- `lockdown-selftest.js`：原 16 項拒絕檢查加上 7 項 Auth/Session 拒絕檢查，共 23 項；另驗證 Auth 鎖及 callback 路徑。
- 不連接 Supabase、不啟用 Google 登入、不讀取 Session、不上傳、不提交；請勿輸入真實個資。
- 驗收：GitHub 限定變更範圍、程式靜態檢查、Pages 成功、手機原有離線操作正常；瀏覽器 23 項動態測試須另取得實際執行證據。
- 回復：僅將 `ui-candidate/` 回復至上方 07B 基準 Commit，不回退整個倉庫 main。
