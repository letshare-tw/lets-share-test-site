# RIDER-TEST-02 審核修正（2026-11-12，台灣）

手機回報模擬騎手 A 無法核准。唯讀核對確認申請已送出，駕照、良民證、行照、車主授權範例均存在於私密 Storage。使用 rollback 交易重現 SQLSTATE 42702：`kind` 同時是 PL/pgSQL 變數與 documents 欄位。

騎手核准與車輛核准的文件 UPDATE 均改為資料表別名限定 `d.kind`，一併限定 WHERE 的欄位。沒有放寬審核條件、RLS、Storage 或正式營運鎖；不變更前端與 Edge。

## 真實執行結果

- 修正前：正常 gateway 的 review_application 重現 42702，FAIL。
- 修正後：使用已上傳的模擬 PNG，經正常 gateway 實跑騎手核准、車輛核准、30 日保留設定、車主授權不套用 30 日刪除，以及派單至雙方簽收，6/6 PASS。見 review-positive-regression.sql。
- 原 backend-regression.sql：42/42 PASS。
- 所有正向操作 ROLLBACK，測試會員的模擬騎手維持 submitted、license pending、reviewed 文件數 0；不代為留下核准或完成任務。
- 以上為 SQL gateway 驗證，並非 Google Session、手機按鈕或圖片閱覽端到端驗收。

原 42 項測試的正向任務流程使用預先核准的虛擬 fixture，因此未涵蓋真正的審核 UPDATE；本次補上依既有上傳範例執行的正向審核測試，避免再次漏測。

重新切至「模擬總部」並重新讀取，即可重按「模擬審核通過」，再核准車輛。正式工作權限、真實證件、實際派車與付款仍鎖定。
