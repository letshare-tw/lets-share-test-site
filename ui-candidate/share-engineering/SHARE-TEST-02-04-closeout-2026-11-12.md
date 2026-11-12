# SHARE-TEST-02–04 受控測試階段結案

驗收日期：2026-11-12（台灣時間）。產品程式基準：47a8b69a64567079eba0b25937f2736fc74c951e。
環境僅限 lets-share-test-site/ui-candidate 與 lets-share-test。此紀錄不代表正式營運上線。

## 驗收結果

| 項目 | 結果 | 證據種類 |
| --- | --- | --- |
| 拍照縮圖、儲存草稿、重新整理還原 | PASS | 豪哥本人手機操作與回覆；後端照片存在 |
| 新照片 100000 bytes 上限 | PASS | 手機真實 Google Session：100000 ACCEPTED、100001 DENIED；暫存檔清理 PASS（1000038252.jpg） |
| 新版壓縮後照片儲存 | PASS | 最新已提交照片後端為 WebP、46794 bytes；手機重整縮圖仍在 |
| 首次分享規章自動視窗 | PASS | 豪哥手機回報已看到新版確認視窗 |
| 同會員同版本免重複同意 | PASS | 豪哥離開再進入，回覆「沒再跳」；後端保留 SHARE-TEST-V1 同意 |
| 文件讀到底才可滑動確認 | PASS | 豪哥先前手機驗收；新版程式回歸另有 mock 測試 |
| 本人受控提交、袋號與期限 | PASS | 手機 1000038254.jpg；資料庫確認最新申請 submitted、單一袋號、48 小時、照片及放置確認存在 |
| 本人會員中心分享紀錄 | PASS | 手機 1000038256.jpg：兩筆本人紀錄與測試期限 |
| B → A 已提交申請與照片隔離 | PASS | 手機 1000038258.jpg；目標申請、放置紀錄、照片已由後端唯讀確認存在，requests/placements/private photo 均 DENIED；service-only RPC DENIED |
| A → B 已提交申請與照片隔離 | PASS | 手機 1000038262.jpg 確認目前帳號 A；1000038264.jpg 確認另一帳號目標 requests/placements/private photo 均 DENIED；service-only RPC DENIED；目標存在已後端確認 |
| 服務專用 gateway 直接呼叫拒絕 | PASS | 上述雙向真實 Session 結果與資料庫權限檢查 |
| 同一已提交申請重送回傳原袋號 | PASS | 工程 gateway replay 及兩個並行 replay 呼叫，均回原袋號；資料庫驗證原申請仍只有一袋 |

## 證據與判讀限制

- 手機照片與 Session 截圖由豪哥實際操作提供，原圖保留在本次對話；不將含會員、住址、相片或識別碼的截圖放入公開倉庫。
- 1000038260.jpg 是 A 查詢本人資料，VISIBLE 屬預期的正向檢查，不是跨帳號外洩，也不計入隔離 PASS。
- 已提交申請的 draft_details 因草稿查詢政策可回 DENIED；隔離結論以確認存在的 requests、placements、Storage 照片為主，不把空資料計為 PASS。
- 已提交申請的 replay 通過，不等同於「兩個首次提交同時競爭」的真實網路壓力測試。斷網回執恢復及 UI 重複送出保護另有程式 mock 回歸證據，不能宣稱為手機斷網實測。
- 規章新版本要求重新同意、同帳號重新登入、快速切頁等，有 agreement-entry-regression.cjs mock 回歸；真實新版本法律發布不在本次驗收內。
- 舊的已提交照片 108680 bytes 保留原始紀錄；新上傳與新存檔驗證上限 100000 bytes。沒有批次改寫歷史照片。
- 工程雲端瀏覽器曾逾時失去 Session，後續又受 URL 安全政策阻擋；未繞過限制。最終相關實機證據來自豪哥的手機，不能寫成工程瀏覽器完成所有測試。

## 已部署基準

- 分享協議／受控提交：c06e1ad6544aa93c127ba2c5db4063072c557765；Pages run 43060642321 success。
- 100KB 與 Storage 邊界驗收工具：6944349a0559eb40b615aa72bd0817d27f4ba0d2；Pages run 43122468599 success。
- 首次進入規章／同版本略過：47a8b69a64567079eba0b25937f2736fc74c951e；Pages run 43156735540 success。
- 手機入口：https://letshare-tw.github.io/lets-share-test-site/ui-candidate/index.html?v=SHARE-AGREEMENT-ENTRY-02

## 結論與下一階段

本階段核心使用流程與指定雙帳號讀取隔離驗收 PASS，可作為下一階段開發基準。這不是無缺陷保證，也不代表正式網站、正式會員或實際收衣配送可上線。

本次結案只補工程紀錄；不新增同意、申請、照片、派單、簡訊或交易，不變更任何正式環境。
下一階段建議先唯讀盤點騎手取件端與總部受理入口，重用既有資料與權限。新角色寫入、派單及部署須先提出具體方案，再依豪哥明確授權執行。
