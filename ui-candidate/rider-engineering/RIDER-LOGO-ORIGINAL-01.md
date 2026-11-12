# RIDER-LOGO-ORIGINAL-01

依豪哥手機回饋撤除 RIDER-SWIPE-SEAMLESS-01 的額外 scale(1.2) 與 lighten 混色。綠色與杏桃橘 LOGO 都完整使用原有圖片，object-fit:contain、transform:none、mix-blend-mode:normal、max-height:none。72×72px 等高滑塊、零內縮及無獨立陰影保留；LOGO 不再額外放大裁切。沒有修改 LOGO 圖檔、五官形狀或比例。

swipe-fill-regression.cjs PASS，增加原圖完整顯示、無縮放變換、無混色與 contain 檢查；原中心填色、取消回彈、吸附與兩色共用樣式仍 PASS。此為程式／樣式測試，不代替手機驗收；手機 PENDING。

僅更新騎手與會員中心共用樣式、快取、測試及此文件；沒有 DB、RPC、RLS、Storage 權限、遠端測試資料或正式營運變更。本文件取代前版文件的縮放裁切與混色安排。
