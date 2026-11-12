# RIDER-HANDOVER-CAPACITY-01

## 新決策

豪哥確認：騎手完成交付，袋件已離手，即可承接新任務，不等待收件端簽收。

三袋上限只計 accepted、picked_up，以及尚未交付的 exception（rider_handover_at IS NULL）。handover_pending 不佔名額；交付後 exception 也不重新增加持袋數，但異常、簽收與原騎手稽核紀錄仍保留。

前台取送站點在該站全部袋件已交付或已簽收後完成，待簽收標示「已交付，待簽收」。完成畫面顯示可接新任務，不宣稱已產生回執。挑選頁獨立保留「交付後待確認」清單，不佔接單名額。新趟出發不混入上一趟待簽收袋件。收件端 receive 才產生原本簽收時間及回執，未提前寫入 delivered。

此決策取代早期「handover_pending 也佔名額」以及「等全部簽收才完成送件站」的安排；不更動分享者制度、正式營運、費率與付款。

## 後端修改

僅 lx_rider_private.gateway(uuid,text,jsonb) 的 claim／accept 兩處容量 predicate，更換為上述持袋條件。沿用既有 workspace row lock、revision、command_id 冪等及角色檢查。沒有新增表、公開 RPC、資料權限或 Storage 設定。

Supabase 測試專案 rfwqcrvxyjhtmafnbuyy migration: rider_handover_releases_capacity 已成功。讀回確認兩處新 predicate；SECURITY DEFINER、空 search_path、service_role-only ACL 保持原狀，anon/authenticated 仍不能直接呼叫服務閘門。

初次預驗證時管理連線回傳 Internal error；改用專用 migration 工具完成修改後，SQL 連線恢復。SQL fixture 首次缺必要座標而失敗，已補齊原有測試座標並完整 rollback，再執行成功。沒有將失敗測試算為 PASS。

## 真實執行驗證

- handover-capacity-regression.sql：14/14 PASS，直接執行測試資料庫服務 gateway，所有 fixture 交易 rollback。涵蓋三袋阻擋第四袋、持袋異常仍佔位、交付未簽收可 claim、offer accept 同樣釋位、冪等、後續簽收不重複釋位、簽收回執及正式鎖。
- 更新 integration-regression.sql：23/23 PASS，rollback；涵蓋新容量、角色／跨帳號與照片路徑隔離、過期資格、私密 100000-byte bucket 及 service-only gateway。
- trip-stops-regression.cjs、prototype-ui-regression.cjs：PASS，模擬 media/Auth/Storage/backend。新增三袋待簽收時第四袋可選、舊趟不阻擋新出發、舊待簽收資料完整保留、交付與持袋異常分別計算。
- 交易測試前後的實際袋件數維持 delivered=8、unassigned=4；沒有留下 fixture，沒有代簽收或改寫既有袋件。
- 正式營運鎖定，service gateway 客戶端執行仍拒絕。
- 以上資料庫是 SQL gateway 交易測試，不是 Google Session／實機相機／手機端到端驗收。手機 PENDING。

## 安全檢查

既有安全 advisories 沒有新增 rider gateway 問題。既有 private RLS 無 policy 為 INFO；會員註冊公開 definer 與密碼外洩保護提示不屬於本次修改，未擴大處理。

- [RLS no-policy 說明](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [既有會員函數可執行提醒](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [密碼保護提示](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

## 手機驗收

承接三袋→取件→逐袋交付，暫不使用收件端簽收→確認挑選頁身上任務降為 0／3，待確認清單保留三袋→立即承接新袋並滑動新趟出發→回收件端簽收舊袋，確認回執才產生。只到達送件地而尚未核袋、拍照與滑動交付者，仍持袋且佔名額。
