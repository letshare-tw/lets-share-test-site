# RIDER-TEST-03：原型接入可操作測試站

日期：2026-11-12（台灣）。授權：整批騎手測試工程；正式營運維持鎖定。

## 交付與來源

- 騎手原型第 8 版，Sites source commit `2642af052f4f596c34043a1ae79bb6425911107d`。
- 經 Sites 正常授權取得 source，只讀取檔案；原型來源工作樹保持乾淨，沒有 push 或發布原型。
- 原型 CSS、LOGO 位元組沿用至 GitHub 測試站 `ui-candidate/rider.html`；40×40 LOGO、品牌綠、白色任務卡及灰背景、44px 底部按鈕與點擊回饋保留。
- 原賣場的 LOGO、Banner、四分頁不變，僅更新兩個 JS 的快取版本。會員中心新增新版騎手工作站連結；舊工作台保留作模擬資格、總部與收件端測試管理。
- 沿用原 Auth client、storage key、固定 Google callback；只新增 rider.html 的允許路徑。沒有新 OAuth scopes、沒有使用其他 Google 功能。

## 已接上的功能

| 分頁 | 真實測試後端行為 |
|---|---|
| 任務 | 讀取同工作區未指派任務池；承接時指定已核准機車，伺服器檢查資格、車輛、版本、任務可用性與三件上限 |
| 配送 | 任務切換、抵達時間、唯一袋號及封袋核對、取件與交出照片、Google 機車導航、異常回報、照片短效閱覽、操作歷程 |
| 收益 | 顯示實際後端任務與簽收回執；金額維持「—」，不製造未核定的報酬或付款 |
| 我的 | 本人工作區模擬角色的資格、良民證期限及機車狀態；可開啟既有資格與車輛管理 |

### 名額及交接

`accepted`、`picked_up`、`handover_pending`、`exception` 都占名額。收件端完成簽收後才釋出，最多三件。任務池只顯示區域、袋號與期限，不在承接前回傳座標或照片路徑。claim、accept 均在既有工作區 row lock 內檢查上限，沿用 revision 與 command UUID 冪等保護。

任務仍是同一 Google 會員工作區內的**模擬工作角色**，不是已核發真實總部或騎手權限。尚未接入正式工作帳號、真實分享袋或真實職人。

### 照片

沿用分享模組既有壓縮實作：JPG/PNG/WebP、來源 20MB 上限、48MP 解碼上限，逐步縮圖和調整品質，輸出最多 100,000 bytes；失敗不傳原圖。拍照後先顯示縮圖，確認袋號及封袋後才上傳。

新私密 bucket `rider-test-proofs`：檔案上限 100,000 bytes、JPG/PNG/WebP。Storage INSERT、SELECT、DELETE 均透過私有 helper 檢查實際 Auth uid、工作區、任務、模擬騎手與階段。禁止覆寫；已被任務引用的照片不可由客戶端刪除。

Edge 的 pickup/handover 要求 photo_path，SQL 檢查路徑與 Storage 物件 metadata 後綁定。內部 service gateway 為相容既有 SQL fixtures，仍允許不附照片的狀態測試；客戶端不能直接執行此 gateway。這不是對 authenticated 開放的後門。

未被引用的上傳檔案，前端失敗時嘗試清理；超過 24 小時的殘留，由後續本人 API 存取觸發 Storage API 清理。這不是無人值守的每日排程。已附加照片的正式保存期限尚未核定；正式營運仍鎖定。

資格到期後不得新增取件照片，但持袋騎手仍可上傳交出照片並完成安全交接。簽發照片 URL 前再次查工作區及任務權限，連結有效 60 秒。

## 本次實際驗證

- integration-regression.sql：23/23 PASS，實際測試 DB 的 rollback 交易；涵蓋任務池、三件上限、名額釋放、重送、抵達、照片路徑 helper、跨帳號拒絕及既有分享袋不變。
- 原 backend-regression.sql：42/42 PASS。
- prototype-ui-regression.cjs：PASS。真實 UI 程式配模擬 Auth/Storage，測試承接、抵達、縮圖、袋號與封袋 gate、上傳路徑、等待雙簽、金額鎖、禁用狀態、XSS escaping、初始 Session 事件、換帳舊回應抑制、機車 URL。
- adapter-proof-regression.cjs：PASS。真實 adapter 配模擬 SDK，100000 接受、100001/非本人路徑在上傳前拒絕、換帳後不回傳舊 API 資料。
- 原 photo-limit-regression.cjs：PASS。模擬 encoder/SDK 的大小界線、壓縮重試、失敗及 URL 清理。
- Security advisors：原有 10 INFO、3 WARN，無新增。
- Edge `rider-test-api` v4 ACTIVE，verify_jwt=true。

**未驗證，不列 PASS：** 手機新版頁面、有效 Google Session 的全流程、實際 Storage 照片上傳/下載/刪除與大小界線、原生 Maps 自動導航、兩個連線同時搶最後名額、真實工作角色隔離。SQL helper 與模擬 SDK 測試不冒充上述驗收。

## 測試資料準備

只對已由測試會員明確送出的模擬申請執行正常模擬審核，不新增法律同意。既有範例經 gateway 核准後，準備結果：1 位有效模擬騎手、1 台已核准模擬機車、4 筆未指派模擬任務，formal_enabled_count=0。任務均 TEST 編號，固定公共區域模擬座標，不需實際前往。

未新增真實工作角色，未修改既有分享袋，未收集真實證件，未建立應付款，未發簡訊、Email 或啟用其他 Google 服務。

## 手機驗收

1. 沿用既有已登入並完成模擬申請的測試會員，開啟 rider.html。
2. 任務：應顯示 4 筆可接任務，承接 3 筆後，第 4 筆不可承接。
3. 配送：抵達 → 核袋 → 拍照縮圖 → 確認取件；重整應還原狀態及已存照片。
4. 交付：拍照交出後應等待收件端，不能直接顯示完成。
5. 上方「資格與測試管理」切模擬收件端，核袋簽收；關閉管理視窗後新版工作站會重新讀取。
6. 完成回執出現後，任務名額釋出；收益頁仍不顯示未核定金額。
7. 機車導航、原生相機返回、斷線重試、登出換帳、跨帳號照片拒絕須分別驗收。

## 後續正式開放的缺項

正式工作帳號與角色綁定、完整 CERT/LOG 複審申訴規格、本人合作文件同意、真實證件收集及影像品質、保險/車輛營運條件、實際分享袋與職人串接、正式費率和結算、合法保存期限、每日刪除/提醒排程、實機與真實跨角色驗收。未經整批確認，不開啟正式營運。

## 回復方式

優先執行既有 lockdown.sql 關閉所有模擬工作區與 service gateway；新 Storage helper 會因 workspace.enabled=false 拒絕客戶端讀寫。前端可還原本次父 commit 的 index.html、test-auth-adapter.js、rider-workbench.js，移除新版工作站入口。保留測試稽核與照片，不直接刪除 bucket/schema；需要清理時另行核對引用與授權。
