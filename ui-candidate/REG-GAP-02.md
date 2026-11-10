# REG-GAP-02 — 成年資格最小修正與安全鎖（2026-11-10）

## 範圍與備份
僅 lets-share-test（rfwqcrvxyjhtmafnbuyy）及本倉庫 ui-candidate/。GitHub 原始檔案可由提交歷史回復，更新前 blob SHA：
- test-auth-adapter.js: 0ba21afc95f3963937e068b669f80f4d50dec66d
- registration-ui.js: 33c541027b6a8d52e62ac3ea1569bc17fe0a1caf
- registration-test.cjs: acebc6bf03840ed954fcbc6e3b2655787a95f09b

## 資料庫
遷移：reg_gap_02_adult_verification_locked、reg_gap_02_protect_birthdate_until_legal_release。
新增 lx_registration_private.member_adult_verifications，完整生日 DATE、成年聲明時間及版本，預設無用戶端資料表權限，RLS 已啟用。透過 public.lx_save_member_adult_verification 專用 RPC 保存，後端使用 Asia/Taipei 日期與18歲門檻檢查，禁止已完成註冊者任意修改。後端完成註冊函式再次檢查生日與聲明，狀態函式新增 adult_ready，不對前端公開生日。

## 隱私安全
目前 enabled=false、active_version=null、法律版本0。因法律文件尚未發布，**生日儲存 RPC 也強制 REG_LOCKED**，前端生日欄位及確認按鈕停用；不會提前蒐集完整出生日期。正式法律文件核准、公布及開放註冊仍需獨立授權。

## 前端
保留原有賣場、分享、購物車、會員中心及 Google/OTP 既有功能。註冊卡新增生日、成年聲明與確認成年資格按鈕。僅在註冊及法律版本正式開放後才可輸入與送出。送出由後端驗證，會員無法透過一般 profiles UPDATE 改寫成年資格。

## 驗收
- DB：遷移成功，原有註冊鎖保持關閉、法律版本與同意紀錄皆0，沒有完成註冊會員。
- 權限：authenticated 對私有生日表無 SELECT/UPDATE；anon 無新 RPC EXECUTE。
- 函式：匿名上下文呼叫成年資格 RPC 與完成註冊 RPC 均被拒絕。
- GitHub：三個修改檔已通過 JS 語法解析。
- **尚待完成**：在本地 Node 環境執行 registration-test.cjs 與 auth-mock-test.cjs；使用隔離測試會員完成端到端與跨帳號攻擊驗收。不得因靜態檢查就標示全數 PASS。

## 不變項
不修改 lets-share-dev、lets-share-app、Twilio、正式站；不發 SMS、不發布法律文件、不解除註冊鎖定。
