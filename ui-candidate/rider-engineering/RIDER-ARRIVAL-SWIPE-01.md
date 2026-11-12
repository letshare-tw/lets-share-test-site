# RIDER-ARRIVAL-SWIPE-01

2026-11-12（台灣）。依指示將「我已抵達取件點」改為與分享頁一致的向右滑動確認，使用原 rider-logo.png 笑臉 LOGO 作為 56×56 小圓角矩形滑塊，不重畫或變形 LOGO。

滑動至可用行程的 85% 以上並放開才呼叫既有 arrive；點擊、短滑、拉回、pointercancel、resize、失去 capture 均不送出。滑動中綁定帳號、模擬角色、任務、epoch 與 revision；換帳、切任務、離開配送或重新讀取會解除舊控制項。完成時同步鎖定，防止重送。鍵盤先 ArrowRight，再 Enter/Space；單獨 Enter 不寫入。

arrive RPC、Auth、RLS、Storage、資格、三件上限、照片及正式營運鎖均未修改。本次沒有建立測試任務或變更既有任務狀態。

## 驗證

- arrival-swipe-regression.cjs PASS：點擊/短滑/拉回/取消/resize/帳號及任務變更/解除控制項/重送 gate、鍵盤確認，以及實際 rider-app 的 arrive 綁定和抵達後的拍照按鈕。
- 更新既有 prototype-ui-regression.cjs，以實際滑動事件接續抵達；拍照、封袋、交接等待簽收、名額、XSS 與換帳檢查 PASS。
- JS 語法檢查 PASS。
- 以上為 JSDOM 模擬幾何與後端，沒有寫入真實資料；不是手機觸控或 Google Session 驗收。

手機：承接一筆尚未抵達的新任務 → 配送 → 按住笑臉 LOGO 向右滑到底並放開。應記錄抵達後出現「確認袋號與拍照」。短滑、取消及快速切任務不得誤送。手機手感與實際狀態更新 PENDING。

回復：還原本 commit 父版的 rider-app.js、rider.css、rider.html，移除新滑動模組引用即可；不需 SQL 或資料回復。
