-- TEST ONLY; close UI/Edge first. Preserve test data.
REVOKE ALL ON FUNCTION public.lx_share_test_gateway(uuid,text,jsonb) FROM service_role;
GRANT INSERT,UPDATE ON public.lx_share_draft_details TO authenticated;
DROP POLICY IF EXISTS lx_placement_photo_delete_unreferenced_draft ON storage.objects;
DROP POLICY IF EXISTS "lx_placement_photo_insert_own_folder" ON storage.objects;
CREATE POLICY "lx_placement_photo_insert_own_folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'share-placement-photos'::text) AND (auth.uid() IS NOT NULL) AND (name ~ (('^'::text || (auth.uid())::text) || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]+-[a-z0-9]{1,8}\.(jpg|png|webp)$'::text)) AND (EXISTS ( SELECT 1
   FROM lx_share_requests r
  WHERE (((r.id)::text = (storage.foldername(objects.name))[2]) AND (r.sharer_user_id = ( SELECT auth.uid() AS uid)) AND (r.status = 'draft'::text))))));
DROP POLICY IF EXISTS "lx_placement_photo_read_own_folder" ON storage.objects;
CREATE POLICY "lx_placement_photo_read_own_folder" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'share-placement-photos'::text) AND (auth.uid() IS NOT NULL) AND (name ~ (('^'::text || (auth.uid())::text) || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]+-[a-z0-9]{1,8}\.(jpg|png|webp)$'::text)) AND (EXISTS ( SELECT 1
   FROM lx_share_requests r
  WHERE (((r.id)::text = (storage.foldername(objects.name))[2]) AND (r.sharer_user_id = ( SELECT auth.uid() AS uid)))))));
UPDATE storage.buckets SET public=false,file_size_limit=10485760 WHERE id='share-placement-photos';
CREATE OR REPLACE FUNCTION public.lx_share_submission_preflight(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_request public.lx_share_requests%rowtype; v_detail public.lx_share_draft_details%rowtype; v_settings public.lx_share_submission_settings%rowtype; v_photo_ok boolean;
begin
 if v_uid is null then raise exception '請先登入會員'; end if;
 select * into v_request from public.lx_share_requests where id=p_request_id and sharer_user_id=v_uid;
 if not found then raise exception '找不到本人分享申請'; end if;
 if v_request.status <> 'draft' then return jsonb_build_object('ready',false,'reason','申請不是草稿狀態','status',v_request.status); end if;
 select * into v_detail from public.lx_share_draft_details where request_id=p_request_id and user_id=v_uid;
 if not found then return jsonb_build_object('ready',false,'reason','尚未儲存分享明細'); end if;
 if v_detail.clothing_count < 2 or v_detail.clothing_count > 1000 then return jsonb_build_object('ready',false,'reason','衣物件數不合規'); end if;
 if v_detail.pickup_kind='home' and (v_detail.pickup_address_snapshot is null or length(trim(v_detail.pickup_address_snapshot))<6) then return jsonb_build_object('ready',false,'reason','取件地址未完成'); end if;
 if v_detail.pickup_kind='collection_point' and (v_detail.collection_point_id is null or not exists(select 1 from public.lx_approved_collection_points p where p.id=v_detail.collection_point_id and p.enabled and p.approved_at is not null)) then return jsonb_build_object('ready',false,'reason','集貨點未核定'); end if;
 if v_detail.placement_photo_path is null or v_detail.placement_photo_path !~ ('^'||v_uid::text||'/'||p_request_id::text||'/[0-9]+-[a-z0-9]{1,8}\.(jpg|png|webp)$') then return jsonb_build_object('ready',false,'reason','尚未儲存有效的放置位置照片'); end if;
 select exists(select 1 from storage.objects o where o.bucket_id='share-placement-photos' and o.name=v_detail.placement_photo_path) into v_photo_ok;
 if not v_photo_ok then return jsonb_build_object('ready',false,'reason','照片不存在於私有儲存空間'); end if;
 select * into v_settings from public.lx_share_submission_settings where id=1;
 if v_settings.submission_enabled is distinct from true or v_settings.agreement_version is null or v_settings.agreement_published_at is null or not exists(select 1 from public.lx_share_agreement_versions a where a.version=v_settings.agreement_version and a.published_at is not null and a.published_at<=now()) then return jsonb_build_object('ready',false,'reason','正式分享協議尚未發布','details_complete',true); end if;
 return jsonb_build_object('ready',true,'details_complete',true,'agreement_version',v_settings.agreement_version);
end $function$;

CREATE OR REPLACE FUNCTION public.lx_submit_share_request(p_request_id uuid, p_agreement_version text, p_transfer_agreed boolean, p_no_return_agreed boolean, p_recycling_agreed boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_uid uuid := auth.uid();
 v_settings public.lx_share_submission_settings%ROWTYPE;
 v_check jsonb;
 v_result uuid;
 v_details public.lx_share_draft_details%ROWTYPE;
 v_declared_at timestamptz;
 v_pickup_location text;
 v_code text;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION '請先登入會員'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_uid AND registration_completed_at IS NOT NULL)
 THEN RAISE EXCEPTION '請先完成會員註冊'; END IF;
 SELECT * INTO v_settings FROM public.lx_share_submission_settings WHERE id=1;
 IF NOT FOUND OR v_settings.submission_enabled IS DISTINCT FROM TRUE
  OR v_settings.agreement_version IS NULL OR v_settings.agreement_published_at IS NULL
 THEN RAISE EXCEPTION '分享協議尚未正式發布，暫不開放提交'; END IF;
 IF p_agreement_version IS DISTINCT FROM v_settings.agreement_version
 THEN RAISE EXCEPTION '協議版本不一致，請重新閱讀'; END IF;
 IF p_transfer_agreed IS DISTINCT FROM TRUE OR p_no_return_agreed IS DISTINCT FROM TRUE
  OR p_recycling_agreed IS DISTINCT FROM TRUE
 THEN RAISE EXCEPTION '請完整同意衣物分享協議'; END IF;
 PERFORM 1 FROM public.lx_share_requests
 WHERE id=p_request_id AND sharer_user_id=v_uid AND status='draft' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION '找不到可提交的本人草稿'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.lx_share_service_consents c
  JOIN public.lx_share_agreement_versions a ON a.version=c.agreement_version
  WHERE c.user_id=v_uid AND c.agreement_version=v_settings.agreement_version
    AND a.published_at IS NOT NULL AND a.published_at<=now()
 ) THEN RAISE EXCEPTION '請先啟用分享服務並同意目前版本的協議'; END IF;
 SELECT * INTO STRICT v_details FROM public.lx_share_draft_details
 WHERE request_id=p_request_id AND user_id=v_uid FOR UPDATE;
 v_check := public.lx_share_submission_preflight(p_request_id);
 IF (v_check->>'ready') IS DISTINCT FROM 'true'
 THEN RAISE EXCEPTION '分享資料尚未完成：%',coalesce(v_check->>'reason','請檢查資料'); END IF;
 IF v_details.pickup_kind='collection_point' THEN
  SELECT p.address_text INTO v_pickup_location FROM public.lx_approved_collection_points p
  WHERE p.id=v_details.collection_point_id AND p.enabled AND p.approved_at IS NOT NULL
 FOR SHARE;
 ELSE
  v_pickup_location:=v_details.pickup_address_snapshot;
 END IF;
 IF v_details.pickup_kind NOT IN ('home','collection_point') OR v_details.pickup_kind IS NULL THEN RAISE EXCEPTION '取件類型不正確'; END IF;
 IF nullif(btrim(v_pickup_location),'') IS NULL THEN RAISE EXCEPTION '取件地址不完整'; END IF;
 v_declared_at := clock_timestamp();
 UPDATE public.lx_share_requests SET status='submitted',
  transfer_agreement_version=v_settings.agreement_version,
  transfer_agreed_at=v_declared_at,no_return_agreed=true,recycling_agreed=true,
  submitted_at=v_declared_at,updated_at=v_declared_at
 WHERE id=p_request_id AND sharer_user_id=v_uid AND status='draft'
 RETURNING id INTO v_result;
 IF v_result IS NULL THEN RAISE EXCEPTION '分享申請已處理，請勿重複提交'; END IF;
 v_code := 'LS-'||to_char(v_declared_at AT TIME ZONE 'Asia/Taipei','YYMMDD')
  ||'-'||(SELECT CASE WHEN length(n::text)<6 THEN lpad(n::text,6,'0') ELSE n::text END FROM (SELECT nextval('public.lx_share_bag_code_seq'::regclass) AS n) q);
 INSERT INTO public.lx_share_bags(
  share_request_id,bag_code,status,pickup_location,declared_at,pickup_deadline_at,
  pickup_kind,collection_point_id,placement_note,placement_photo_path,placement_confirmed_at
 ) VALUES(
  p_request_id,v_code,'pending_pickup',v_pickup_location,
  v_declared_at,v_declared_at+interval '48 hours',
  v_details.pickup_kind,v_details.collection_point_id,
  v_details.placement_note,v_details.placement_photo_path,v_declared_at
 );
 RETURN v_result;
END;
$function$;
