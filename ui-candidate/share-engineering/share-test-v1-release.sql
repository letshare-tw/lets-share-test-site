-- SHARE-TEST-V1 authorized test release, not production. No user consents/submissions are created by this migration.
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.lx_share_agreement_versions) OR (SELECT submission_enabled FROM public.lx_share_submission_settings WHERE id=1) IS DISTINCT FROM false THEN RAISE EXCEPTION 'Release baseline changed'; END IF; END $$;
CREATE OR REPLACE FUNCTION public.lx_share_service_status() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid(); v_row record; v_time timestamptz;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'SHARE_LOGIN_REQUIRED'; END IF;
 SELECT a.version,a.content,a.published_at,s.submission_enabled INTO v_row FROM public.lx_share_submission_settings s JOIN public.lx_share_agreement_versions a ON a.version=s.agreement_version WHERE s.id=1 AND s.agreement_published_at IS NOT NULL AND s.agreement_published_at<=now() AND a.published_at IS NOT NULL AND a.published_at<=now();
 IF NOT FOUND THEN RETURN jsonb_build_object('published',false,'activated',false,'submission_enabled',false); END IF;
 SELECT agreed_at INTO v_time FROM public.lx_share_service_consents WHERE user_id=v_uid AND agreement_version=v_row.version;
 RETURN jsonb_build_object('published',true,'activated',v_time IS NOT NULL,'version',v_row.version,'content',v_row.content,'published_at',v_row.published_at,'agreed_at',v_time,'submission_enabled',v_row.submission_enabled,'test_only',true);
END $$;
CREATE OR REPLACE FUNCTION lx_share_private.gateway(p_actor uuid, p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_id uuid; v_request public.lx_share_requests%rowtype; v_d jsonb; v_result jsonb;
 v_kind text; v_address text; v_photo text; v_note text; v_count integer; v_point uuid; v_settings public.lx_share_submission_settings%rowtype; v_detail public.lx_share_draft_details%rowtype; v_agreement text;
BEGIN
 IF NOT lx_share_private.test_member(p_actor) THEN RAISE EXCEPTION 'SHARE_MEMBER_DENIED'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_actor,'role','authenticated')::text,true);
 PERFORM set_config('request.jwt.claim.sub',p_actor::text,true);
 IF p_action='activate' THEN
  SELECT * INTO v_settings FROM public.lx_share_submission_settings WHERE id=1 FOR SHARE;
  IF NOT FOUND OR v_settings.submission_enabled IS DISTINCT FROM true THEN RAISE EXCEPTION 'SHARE_SUBMISSION_LOCKED'; END IF;
  IF v_settings.agreement_published_at IS NULL OR v_settings.agreement_published_at>now() THEN RAISE EXCEPTION 'SHARE_LEGAL_UNPUBLISHED'; END IF;
  IF p_payload->>'agreement_version' IS DISTINCT FROM v_settings.agreement_version THEN RAISE EXCEPTION 'SHARE_VERSION_CHANGED'; END IF;
  PERFORM 1 FROM public.lx_share_agreement_versions WHERE version=v_settings.agreement_version AND published_at IS NOT NULL AND published_at<=now() FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SHARE_LEGAL_UNPUBLISHED'; END IF;
  IF p_payload->'explicit_agreement' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'SHARE_EXPLICIT_CONSENT_REQUIRED'; END IF;
  PERFORM public.lx_activate_share_service(v_settings.agreement_version,true);
  RETURN public.lx_share_service_status();
 ELSIF p_action IN ('submit','receipt') THEN
  v_id:=(p_payload->>'request_id')::uuid;
  SELECT * INTO v_request FROM public.lx_share_requests WHERE id=v_id AND sharer_user_id=p_actor FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SHARE_DRAFT_DENIED'; END IF;
  IF v_request.status='submitted' OR p_action='receipt' THEN
   SELECT jsonb_build_object('request_id',r.id,'bag_code',b.bag_code,'bag_status',b.status,'declared_at',b.declared_at,'pickup_deadline_at',b.pickup_deadline_at,'agreement_version',r.transfer_agreement_version,'test_only',true) INTO v_result
   FROM public.lx_share_requests r JOIN public.lx_share_bags b ON b.share_request_id=r.id WHERE r.id=v_id AND r.sharer_user_id=p_actor;
   IF v_result IS NULL THEN RAISE EXCEPTION 'SHARE_RECEIPT_NOT_FOUND'; END IF;
   RETURN v_result;
  END IF;
  IF v_request.status<>'draft' THEN RAISE EXCEPTION 'SHARE_DRAFT_DENIED'; END IF;
  SELECT * INTO v_settings FROM public.lx_share_submission_settings WHERE id=1 FOR SHARE;
  IF NOT FOUND OR v_settings.submission_enabled IS DISTINCT FROM true THEN RAISE EXCEPTION 'SHARE_SUBMISSION_LOCKED'; END IF;
  IF v_settings.agreement_published_at IS NULL OR v_settings.agreement_published_at>now() THEN RAISE EXCEPTION 'SHARE_LEGAL_UNPUBLISHED'; END IF;
  IF p_payload->>'agreement_version' IS DISTINCT FROM v_settings.agreement_version THEN RAISE EXCEPTION 'SHARE_VERSION_CHANGED'; END IF;
  PERFORM 1 FROM public.lx_share_agreement_versions WHERE version=v_settings.agreement_version AND published_at IS NOT NULL AND published_at<=now() FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SHARE_LEGAL_UNPUBLISHED'; END IF;
  IF p_payload->'placement_confirmed' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'SHARE_PLACEMENT_REQUIRED'; END IF;
  IF p_payload->'transfer_agreed' IS DISTINCT FROM 'true'::jsonb OR p_payload->'no_return_agreed' IS DISTINCT FROM 'true'::jsonb OR p_payload->'recycling_agreed' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'SHARE_EXPLICIT_CONSENT_REQUIRED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.lx_share_service_consents WHERE user_id=p_actor AND agreement_version=v_settings.agreement_version) THEN RAISE EXCEPTION 'SHARE_CONSENT_REQUIRED'; END IF;
  SELECT * INTO v_detail FROM public.lx_share_draft_details WHERE request_id=v_id AND user_id=p_actor FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SHARE_DETAILS_REQUIRED'; END IF;
  IF v_detail.pickup_kind='home' AND v_detail.pickup_address_snapshot IS DISTINCT FROM (SELECT home_address FROM public.profiles WHERE id=p_actor) THEN RAISE EXCEPTION 'SHARE_ADDRESS_CHANGED'; END IF;
  v_result:=public.lx_share_submission_preflight(v_id);
  IF v_result->>'ready' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'SHARE_DETAILS_INCOMPLETE'; END IF;
  IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='share-placement-photos' AND name=v_detail.placement_photo_path AND (metadata->>'size')::bigint BETWEEN 1 AND 300000 AND metadata->>'mimetype' IN ('image/jpeg','image/png','image/webp')) THEN RAISE EXCEPTION 'SHARE_PHOTO_INVALID'; END IF;
  INSERT INTO public.lx_share_draft_placements(request_id,user_id,pickup_kind,pickup_address_snapshot,collection_point_id,placement_photo_path,placement_note,placed_confirmed_at,updated_at)
  VALUES(v_id,p_actor,v_detail.pickup_kind,v_detail.pickup_address_snapshot,v_detail.collection_point_id,v_detail.placement_photo_path,v_detail.placement_note,clock_timestamp(),clock_timestamp())
  ON CONFLICT(request_id) DO UPDATE SET pickup_kind=EXCLUDED.pickup_kind,pickup_address_snapshot=EXCLUDED.pickup_address_snapshot,collection_point_id=EXCLUDED.collection_point_id,placement_photo_path=EXCLUDED.placement_photo_path,placement_note=EXCLUDED.placement_note,placed_confirmed_at=EXCLUDED.placed_confirmed_at,updated_at=EXCLUDED.updated_at;
  PERFORM public.lx_submit_share_request(v_id,v_settings.agreement_version,true,true,true);
  SELECT jsonb_build_object('request_id',r.id,'bag_code',b.bag_code,'bag_status',b.status,'declared_at',b.declared_at,'pickup_deadline_at',b.pickup_deadline_at,'agreement_version',r.transfer_agreement_version,'test_only',true) INTO STRICT v_result
  FROM public.lx_share_requests r JOIN public.lx_share_bags b ON b.share_request_id=r.id WHERE r.id=v_id AND r.sharer_user_id=p_actor;
  RETURN v_result;
 END IF;
 IF p_action='bootstrap' THEN
  SELECT jsonb_build_object('draft',
   (SELECT jsonb_build_object('id',r.id,'status',r.status,'details',(SELECT to_jsonb(d) - 'user_id' FROM public.lx_share_draft_details d WHERE d.request_id=r.id AND d.user_id=p_actor))
    FROM public.lx_share_requests r WHERE r.sharer_user_id=p_actor AND r.status='draft'),
   'address',(SELECT jsonb_build_object('home_address',p.home_address,'home_placement_note',p.home_placement_note) FROM public.profiles p WHERE p.id=p_actor),
   'points',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'address_text',p.address_text,'placement_note',p.placement_note)) FROM public.lx_approved_collection_points p WHERE p.enabled AND p.approved_at IS NOT NULL),'[]'::jsonb),
   'bags',coalesce((SELECT jsonb_agg(to_jsonb(b)) FROM public.lx_get_my_share_bags() b),'[]'::jsonb),
   'service',public.lx_share_service_status(),'submission_enabled',coalesce((SELECT submission_enabled FROM public.lx_share_submission_settings WHERE id=1),false),'version','SHARE-TEST-V1') INTO v_result;
  RETURN v_result;
 ELSIF p_action='create' THEN
  v_id:=public.lx_create_share_draft(); RETURN jsonb_build_object('id',v_id,'status','draft');
 ELSIF p_action IN ('save','preflight') THEN
  v_id:=(p_payload->>'request_id')::uuid;
  SELECT * INTO v_request FROM public.lx_share_requests WHERE id=v_id AND sharer_user_id=p_actor FOR UPDATE;
  IF NOT FOUND OR v_request.status<>'draft' THEN RAISE EXCEPTION 'SHARE_DRAFT_DENIED'; END IF;
  IF p_action='preflight' THEN
   v_result:=public.lx_share_submission_preflight(v_id);
   IF NOT EXISTS(SELECT 1 FROM public.lx_share_service_consents c JOIN public.lx_share_submission_settings s ON s.id=1 AND s.agreement_version=c.agreement_version WHERE c.user_id=p_actor) THEN RETURN v_result||jsonb_build_object('ready',false,'reason','請先閱讀並同意目前版本的分享測試協議'); END IF;
   RETURN v_result;
  END IF;
  v_d:=p_payload->'details';
  IF jsonb_typeof(v_d)<>'object' OR v_d IS NULL THEN RAISE EXCEPTION 'SHARE_INVALID_DETAILS'; END IF;
  IF coalesce(v_d->>'clothing_count','') !~ '^[0-9]{1,4}$' THEN RAISE EXCEPTION 'SHARE_INVALID_COUNT'; END IF;
  v_count:=(v_d->>'clothing_count')::integer;
  IF v_count<2 OR v_count>1000 THEN RAISE EXCEPTION 'SHARE_INVALID_COUNT'; END IF;
  v_kind:=v_d->>'pickup_kind';
  v_note:=coalesce(v_d->>'placement_note','');
  IF length(v_note)>200 OR v_note ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'SHARE_INVALID_NOTE'; END IF;
  IF v_kind='home' THEN
   SELECT home_address INTO v_address FROM public.profiles WHERE id=p_actor;
   IF length(btrim(coalesce(v_address,'')))<6 THEN RAISE EXCEPTION 'SHARE_ADDRESS_REQUIRED'; END IF;
  ELSIF v_kind='collection_point' THEN
   v_point:=(v_d->>'collection_point_id')::uuid;
   SELECT address_text INTO v_address FROM public.lx_approved_collection_points WHERE id=v_point AND enabled AND approved_at IS NOT NULL FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'SHARE_POINT_UNAVAILABLE'; END IF;
  ELSE RAISE EXCEPTION 'SHARE_INVALID_PICKUP'; END IF;
  v_photo:=nullif(v_d->>'placement_photo_path','');
  IF v_photo IS NOT NULL THEN
   IF v_photo !~ ('^'||p_actor::text||'/'||v_id::text||'/[0-9]+-[a-z0-9]{1,8}[.](jpg|png|webp)$')
   OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='share-placement-photos' AND o.name=v_photo
      AND (o.metadata->>'size')::bigint BETWEEN 1 AND 300000
      AND o.metadata->>'mimetype' IN ('image/jpeg','image/png','image/webp'))
   THEN RAISE EXCEPTION 'SHARE_PHOTO_INVALID'; END IF;
  END IF;
  INSERT INTO public.lx_share_draft_details(request_id,user_id,clothing_count,pickup_kind,pickup_address_snapshot,collection_point_id,placement_note,placement_photo_path,updated_at)
  VALUES(v_id,p_actor,v_count,v_kind,v_address,v_point,v_note,v_photo,clock_timestamp())
  ON CONFLICT(request_id) DO UPDATE SET clothing_count=EXCLUDED.clothing_count,pickup_kind=EXCLUDED.pickup_kind,
   pickup_address_snapshot=EXCLUDED.pickup_address_snapshot,collection_point_id=EXCLUDED.collection_point_id,
   placement_note=EXCLUDED.placement_note,placement_photo_path=EXCLUDED.placement_photo_path,updated_at=EXCLUDED.updated_at;
  RETURN jsonb_build_object('id',v_id,'saved',true,'details',(SELECT to_jsonb(d)-'user_id' FROM public.lx_share_draft_details d WHERE request_id=v_id AND user_id=p_actor));
 ELSE RAISE EXCEPTION 'SHARE_ACTION_DENIED'; END IF;
END $function$;
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
 SELECT * INTO v_settings FROM public.lx_share_submission_settings WHERE id=1 FOR SHARE;
 IF NOT FOUND OR v_settings.submission_enabled IS DISTINCT FROM TRUE
  OR v_settings.agreement_version IS NULL OR v_settings.agreement_published_at IS NULL
 THEN RAISE EXCEPTION '分享協議尚未正式發布，暫不開放提交'; END IF;
 IF p_agreement_version IS DISTINCT FROM v_settings.agreement_version
 THEN RAISE EXCEPTION '協議版本不一致，請重新閱讀'; END IF;
 IF p_transfer_agreed IS DISTINCT FROM TRUE OR p_no_return_agreed IS DISTINCT FROM TRUE
  OR p_recycling_agreed IS DISTINCT FROM TRUE
 THEN RAISE EXCEPTION '請完整同意衣物分享協議'; END IF;
 PERFORM 1 FROM public.lx_share_requests
 WHERE id=p_request_id AND sharer_user_id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION '找不到可提交的本人草稿'; END IF;
 IF EXISTS(SELECT 1 FROM public.lx_share_requests r JOIN public.lx_share_bags b ON b.share_request_id=r.id WHERE r.id=p_request_id AND r.sharer_user_id=v_uid AND r.status='submitted') THEN RETURN p_request_id; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lx_share_requests r WHERE r.id=p_request_id AND r.sharer_user_id=v_uid AND r.status='draft') THEN RAISE EXCEPTION '找不到可提交的本人草稿'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.lx_share_service_consents c
  JOIN public.lx_share_agreement_versions a ON a.version=c.agreement_version
  WHERE c.user_id=v_uid AND c.agreement_version=v_settings.agreement_version
    AND a.published_at IS NOT NULL AND a.published_at<=now()
 ) THEN RAISE EXCEPTION '請先啟用分享服務並同意目前版本的協議'; END IF;
 SELECT * INTO STRICT v_details FROM public.lx_share_draft_details
 WHERE request_id=p_request_id AND user_id=v_uid FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.lx_share_draft_placements p WHERE p.request_id=p_request_id AND p.user_id=v_uid AND p.placement_photo_path=v_details.placement_photo_path AND p.pickup_kind=v_details.pickup_kind AND p.pickup_address_snapshot IS NOT DISTINCT FROM v_details.pickup_address_snapshot AND p.collection_point_id IS NOT DISTINCT FROM v_details.collection_point_id AND p.placement_note IS NOT DISTINCT FROM v_details.placement_note AND p.placed_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'SHARE_PLACEMENT_REQUIRED'; END IF;
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
CREATE OR REPLACE FUNCTION lx_share_private.protect_published_agreement() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN IF OLD.published_at IS NOT NULL THEN RAISE EXCEPTION 'Published agreement is immutable; publish a new version'; END IF; IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION lx_share_private.protect_published_agreement() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER lx_share_agreement_immutable BEFORE UPDATE OR DELETE ON public.lx_share_agreement_versions FOR EACH ROW EXECUTE FUNCTION lx_share_private.protect_published_agreement();
-- Publication and enablement are a separate final transaction after engineering checks.
