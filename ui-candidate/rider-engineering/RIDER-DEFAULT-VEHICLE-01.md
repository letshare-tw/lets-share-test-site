# RIDER-DEFAULT-VEHICLE-01

依豪哥指示，騎手任務詳情整段「本趟使用機車」與選單、車名全部移除，沒有改成隱藏欄位。一般承接只需確認任務，不需每次選車。

程式自動使用目前騎手可見、approved 且 owner_authorized 的機車；優先沿用後端既有任務中最近使用且仍有效者，否則使用既有清單第一台合格車。撤回或未核准車不會帶入；快照如混入其他騎手機車亦不選用。這是既有資料推導的預設，沒有建立新的機車設定資料表或寫入會員預設欄位。

承接仍傳 vehicle_id 至原 gateway，後端持續檢查騎手與該車資格、授權、revision 及三袋上限；沒有略過或移除實際車輛綁定。無合格車時禁止承接，顯示配送資格需補齊的簡短提示；資格管理及「我的」車輛資料保留。

驗證：default-vehicle-regression.cjs PASS（任務不顯示車名或選單、自動帶入、最近使用偏好、撤回車回退、未核准／未授權／其他騎手車拒絕）；prototype-ui-regression.cjs、trip-stops-regression.cjs PASS，保留既有實際車輛 payload 綁定及承接留在挑選頁。以上為模擬 Auth/backend，手機及真實 Google Session 新流程驗收 PENDING。

本版僅修改 ui-candidate/rider-app.js、rider.html、測試與此文件。沒有 Supabase、RPC、RLS、Storage 或遠端會員／任務資料變更，正式營運維持鎖定。
