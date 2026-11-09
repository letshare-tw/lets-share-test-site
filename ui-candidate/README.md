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
