# RIDER-DELIVERY-APRICOT-01

僅限 letshare-tw/lets-share-test-site/ui-candidate。送件交付滑鈕採杏桃橘 #F4A574；取件與收件端簽收仍是品牌綠 #09923A。滑動前維持 15% 灰 #D9D9D9 與黑字，確認放開並吸附右側時切換該階段顏色與白字，文字仍顯示正在確認，不代表後端已成功。

橘色 LOGO 使用原圖嵌入 SVG，經 sRGB 分色線性轉換；原圖幾何及白色笑臉保持，不使用生成預覽圖裁切。

驗證：既有手勢、防重送、核袋/照片、交付等待收件端流程 regression PASS；收件端簽收 regression PASS；green/apricot 元件綁定、computed style、白色保持與顏色映射 PASS。以上使用模擬 session/backend，不是手機或 Google Session 驗收；手機 PENDING。

此版本沒有 DB/Storage/權限/任務寫入。正式營運仍鎖定。
