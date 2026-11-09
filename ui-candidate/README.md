# 樂享家 ui-candidate｜B-01C-07C-02 測試登入

- 本次授權：僅本目錄，Google Auth 串接 lets-share-test（rfwqcrvxyjhtmafnbuyy）。不修改舊專案、正式站或 lets-share-app。
- 部署前基準：fd32629909aed6c31210f7a713ec16c289e59370。
- 會員中心 Google 登入，PKCE 回跳後返回賣場；重新整理驗證伺服器 user；登出僅終止本瀏覽器測試 session。
- 固定 callback：https://letshare-tw.github.io/lets-share-test-site/ui-candidate/auth-callback.html
- 僅允許指定 origin、三個頁面路徑與新測試專案。callback 清除 query/hash；拒絕過期、重複/缺少 code、未從本站發起或帶 hash 的回跳。無任意 next/returnTo 導向。
- Supabase JS 2.119.0，固定 CDN 版本與 SHA-384 SRI。前端僅含 publishable key；Google Client Secret 不進入程式碼。
- 專用 localStorage key 儲存測試 Session 與 PKCE verifier；不可與正式 session 共用。不要在共用裝置保留登入。
- test-api-adapter、adapter-selector 與 demo-adapter 保持原樣。訂單、地址、草稿、照片、分享提交、付款與 profile API 仍停用；Google 身分不授予業務權限。會員文字以 textContent 顯示。
- 保留原有 LOGO、Banner、四大分頁與離線分享操作。登入後的分享仍是示範，勿輸入真實個資。
- lockdown-selftest：17 項 API／模式／Profile 拒絕檢查；不呼叫真實登入、登出或 callback。
- 自動化以 mock 驗證登入目的地、PKCE 設定、Session 驗證／拒絕、登出及錯誤 callback；真實 Google 帳號授權、回跳與手機操作由豪哥驗收。
- 回復：只將本目錄本次修改檔案恢復至上述部署前基準；不回退整個倉庫。
