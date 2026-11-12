# RIDER-UI-READABILITY-01

2026-11-12（台灣）。依手機比較回饋放大騎手測試站字級，僅修改 rider.css 與 rider.html CSS 快取版號；不改原型站、JavaScript、資料庫、RLS、Storage 或營運鎖。

| 文字 | 原字級 | 新字級 |
|---|---:|---:|
| 主要標題 | 23px | 32px |
| 區塊標題 | 17px | 22px |
| 地址 | 19px | 24px |
| 基本內文 | 15px | 18px |
| 輔助說明 | 12px | 16px |
| 主要操作按鈕 | 15px | 18px |
| 底部分頁 | 11px | 14px |

底部分頁保持 44px 高；LOGO 40×40、品牌綠及原互動效果不變。列容器允許換行、長文字可折行，底部內容預留固定導覽與安全區空間。不是照抄或推定 Uber 的實際 CSS 尺寸。

驗證：JSDOM CSS 解析與 computed style 檢查 PASS，覆蓋標題/地址/內文/按鈕/分頁字級、44px 分頁高度、40px LOGO 及選中綠色。這不是瀏覽器排版或真實手機驗收；320–430px 螢幕的實際換行與視覺效果待實機確認。未為純樣式變更重跑資料庫測試。

回復：還原本 commit 父版的 rider.css 與 rider.html 即可。
