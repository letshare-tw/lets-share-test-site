-- Approved SHARE-TEST-V1 publication, TEST PROJECT ONLY rfwqcrvxyjhtmafnbuyy.
-- Does not create consent, submission, bags, logistics, SMS or payments.
DO $publish$
DECLARE v_time timestamptz:=transaction_timestamp();
BEGIN
 IF EXISTS(SELECT 1 FROM public.lx_share_agreement_versions) OR (SELECT submission_enabled FROM public.lx_share_submission_settings WHERE id=1) IS DISTINCT FROM false THEN RAISE EXCEPTION 'Publication baseline changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.lx_share_service_consents) OR EXISTS(SELECT 1 FROM public.lx_share_bags) THEN RAISE EXCEPTION 'Unexpected user consent/submission before publication'; END IF;
 INSERT INTO public.lx_share_agreement_versions(version,content,published_at) VALUES('SHARE-TEST-V1',$approved$樂享家衣物分享功能測試協議

版本：SHARE-TEST-V1
服務提供者：張家豪（個人）
聯絡及個資權利申請信箱：sys@lets-share.com.tw
適用範圍：經開放衣物分享測試資格的指定測試會員
生效時間：以測試站文件顯示的實際發布時間為準

第一條｜測試目的與範圍

本測試提供衣物分享草稿、取件資訊、放置點照片、協議確認、測試申請提交、測試分享袋編號及紀錄查詢等功能。

本測試不代表正式營運，不安排實際收衣、騎手取送、商品上架、交易、付款或現金回饋。測試會員不因參與本測試而自動成為正式營運服務的使用者。

第二條｜測試資料與衣物

請使用有權使用的帳號及資料參與測試。照片請避免包含無關人臉、證件、車牌或其他不必要的個人資料。

不需為了本測試，將真實衣物放置在公共空間或交付他人。建立草稿、上傳照片、確認本協議或提交測試申請，均不構成真實衣物交付或所有權移轉。

第三條｜取件資訊、分享袋與照片

測試會員可填寫衣物件數，使用本人會員地址，或選擇系統實際提供的核准集貨點，並提供放置說明及照片。

草稿可以儲存及重新讀取；儲存草稿或照片不等於提交申請，也不產生測試分享袋編號。

提交前的「分享袋已放妥」確認，在本測試中表示會員已依畫面檢查測試情境，不代表平台已收受真實衣物。

第四條｜協議閱讀與確認

本協議與會員註冊條款分開確認。

會員須開啟本協議全文，將文件捲動到底，再由本人使用文件下方的滑動確認。關閉視窗、僅開啟文件或未完成滑動，不視為同意。

系統確認寫入成功後，才顯示已同意該版本。文件版本改變時，提交前須重新確認適用版本，不以先前的閱讀操作測試取代本次同意。

第五條｜提交、袋號及測試期限

正式提交測試申請前，會員須完成必要資料、照片、情境確認及有效版本的協議同意，再使用分享頁面的滑動提交。

以系統成功回執為提交成功依據。成功後產生測試分享袋編號，並顯示申報時間及其後 48 小時的測試取件期限。

測試袋號與期限僅供功能驗收，不構成實際物流預約或取件承諾。請勿因看到測試期限而等待騎手到場。

若提交後連線中斷，請先查詢本人分享紀錄，避免誤認提交失敗或重複建立申請。

第六條｜正式營運制度的說明

樂享家目前規劃的正式營運制度包括：衣物實際交付後依正式契約移轉所有權、原則不退回、不合格或最終未售衣物依法轉贈或回收，以及商品成功售出後原分享者取得成交金額 10% 現金回饋。

上述內容供理解產品流程，不因本次測試而發生真實衣物處分、交易或回饋義務。日後正式服務仍須另行提供適用契約，由會員本人確認。

第七條｜個人資料使用

本測試使用的資料包括：會員識別資料、取件地址、放置說明、放置點照片、草稿與申請紀錄，以及協議版本和同意時間。

資料用於本人資料儲存與讀回、分享功能驗收、權限隔離、安全維護及問題排查。本階段不派遣實際騎手，也不因測試申請將地址或照片提供給實際配送人員。

照片存放於私有儲存空間，不作公開商品照片。測試管理者及必要技術服務供應者於前述目的所需範圍處理資料；其餘處理期間、地區及權利行使方式，依既有測試隱私權政策辦理。

可寄信至 sys@lets-share.com.tw 提出資料查詢、更正或刪除等申請。未提供必要地址或照片，仍可使用其他已開放功能，但無法完成需要這些資料的分享提交測試。

第八條｜異常、停止測試與文件效力

如發生照片遺失、資料無法還原、讀到其他帳號資料、重複袋號或其他異常，請停止該項操作並向測試管理者回報；請勿轉傳其他會員資料。

平台得因修復問題或維護安全而暫停測試功能，並依既有隱私政策及適用規範處理測試資料。本協議不排除依法不得排除的權利或責任。

本協議須於獨立測試環境實際發布後才適用；未發布的候選稿及先前介面操作測試，不算本版本的法律同意。
$approved$,v_time);
 UPDATE public.lx_share_submission_settings SET agreement_version='SHARE-TEST-V1',agreement_published_at=v_time,submission_enabled=true,updated_at=v_time WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Missing submission settings'; END IF;
END $publish$;
