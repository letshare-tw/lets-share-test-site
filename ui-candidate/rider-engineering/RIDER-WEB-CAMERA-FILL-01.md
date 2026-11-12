# RIDER-WEB-CAMERA-FILL-01

## 範圍與結果

僅修改 letshare-tw/lets-share-test-site/ui-candidate。新增 rider-camera.js 頁內取景控制器，沿用 rider-photo.js 壓縮、既有私密 Storage 與核袋／照片／滑動取送流程。新相機只在騎手取送核對視窗使用；不更動會員分享拍照、Google、Gmail、Drive 或任何正式環境。

開啟核袋拍照視窗時請求 video-only 相機，優先後鏡頭；在頁面內取景、拍攝、預覽、重新開啟重拍。拍攝原始畫面長邊先限制 1280，再由既有壓縮器限制 100000 bytes。拍攝與壓縮不會上傳，原有最後滑動才上傳。重新啟用相機重拍時清除前次未送出的選片，防止意外提交上一張。

不使用系統相機 capture 入口為主要流程。瀏覽器不支援或拒絕權限時顯示原因，保留可展開的選檔備援；不繞過權限、不請求音訊、不自動切換其他原生應用程式。取景是否能在手機實際啟動仍需手機驗收。

拍攝後、關閉核對視窗、換帳號、任務／視窗版本失效、頁面離開及背景時皆停止 tracks。權限回應若晚於關閉或換帳，取得的 stream 立即停止，不重新開啟舊畫面。僅記錄照片與袋件資訊，不錄音、不持續錄影。

## 滑鈕

新增獨立底層填色，隨 LOGO 位移，分界為滑塊左邊距 8px + 位移 + 滑塊寬的一半。取件／收件端簽收／出發為品牌綠；送件為杏桃橘。短滑、反向、取消或重設時填色一同退回。有效放開後吸附右端，填滿剩餘右側，保留正在確認的白字；不把填色完成當成後端成功。85% 門檻、取消、防重送及身分檢查不變。

同時更新 rider.html 與 index.html 的共用滑鈕腳本／樣式快取。修正會員中心收件端樣式中重複祖先選擇器，避免共用滑鈕填色與文字位移漏套。

## 驗證

- web-camera-regression.cjs PASS：video-only、後鏡頭偏好、畫面尺寸、拍攝停流、取消後遲到授權、換帳／任務失效、背景停流、權限拒絕。
- trip-stops-regression.cjs PASS：頁內相機拍攝→壓縮與預覽→最後滑動才上傳；仍保留選檔備援，三袋四站與簽收規則保留。
- swipe-fill-regression.cjs PASS：LOGO 中心填色、逆向、取消、吸附填滿、取送兩色、會員中心共用樣式。
- arrival-swipe-regression.cjs、prototype-ui-regression.cjs、receive-swipe-regression.cjs PASS。
- JS 語法 PASS。
- 上述為模擬 media/canvas/Auth/Storage/backend/手勢幾何，不能視為真實硬體相機、Google Session 或手機觸控驗收。手機 PENDING。

沒有 DB、RPC、RLS、Storage 權限或遠端測試資料寫入；正式營運維持鎖定。

## 手機驗收

在目前取件任務按已抵達（已抵達者按繼續確認取件）→允許相機→頁內取景→拍攝並確認縮圖→核袋、確認封袋→滑動確認。測試重拍、關閉與重新開啟；不同意權限時應能看到說明及展開選檔。滑動中確認 LOGO 中心左側連續填色，取消回彈；送件杏桃橘、收件品牌綠。
