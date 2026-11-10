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
