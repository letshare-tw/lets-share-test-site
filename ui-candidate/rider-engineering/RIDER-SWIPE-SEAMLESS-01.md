# RIDER-SWIPE-SEAMLESS-01

修正手機截圖中 LOGO 56px 高、滑軌 72px 高及 8px 左側／7px 上側內縮造成的階梯狀落差。滑塊改為 72×72px，left/top=0，滑軌 border=0；移除滑塊獨立陰影，維持 16px 圓角及父層裁切。

LOGO 原始圖不重畫、不更換，只以等比例 1.2 倍的顯示裁切去除外圍空白，保留完整笑臉；mix-blend-mode:lighten 將原圖近似綠／橘底與滑塊底色銜接。原圖四個可見裁切角像素已確認均為原品牌綠，沒有白色外角。

手勢行程與中心填色公式一併移除舊的 8px 內縮：travel = trackWidth - handleWidth，fill = position + handleWidth/2。因實際滑塊從 56+16px 改為 72px，總行程維持相同。既有 85% 放開門檻、防誤觸、防重送、縮短／取消回彈及鍵盤確認保留。

同步騎手頁及會員中心收件端共用樣式與快取；取件／收件／出發綠色、送件杏桃橘不變。

驗證：swipe-fill-regression.cjs PASS（含滑軌與滑塊 72px 同高、零位移、零陰影、中心填色及兩色），arrival-swipe-regression.cjs、prototype-ui-regression.cjs、receive-swipe-regression.cjs、trip-stops-regression.cjs PASS，幾何 mock 更新為實際 72px 滑塊。以上不是手機觸控或真實 Google Session 驗收，手機 PENDING。

本次僅前端與測試文件變更，沒有 DB、RPC、RLS、Storage 權限或遠端測試資料寫入。正式營運維持鎖定。
