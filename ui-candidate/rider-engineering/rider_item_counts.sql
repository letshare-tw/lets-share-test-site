alter table lx_rider_private.tasks add column clothing_count integer;
alter table lx_rider_private.tasks add constraint rider_clothing_count_range check (clothing_count is null or clothing_count between 1 and 1000);
comment on column lx_rider_private.tasks.clothing_count is 'Declared items per one-bag test task; null means unknown, not zero. Editable by simulated dispatcher before acceptance only; synthetic tasks start with 2 test items.';
CREATE OR REPLACE FUNCTION lx_rider_private.gateway(p_actor uuid, p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s lx_rider_private.workspaces; p lx_rider_private.people; t lx_rider_private.tasks; v lx_rider_private.vehicles;
 a text:=coalesce(p_payload->>'actor','rider1'); target text; cmd uuid; cached lx_rider_private.commands;
 result jsonb; tid uuid; vid uuid; rid text; kind text; doc_path text; n integer; issue date;
begin
 if not lx_share_private.test_member(p_actor) then raise exception 'RIDER_MEMBER_DENIED'; end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8192 then raise exception 'RIDER_INPUT_INVALID'; end if;
 if p_action='initialize' then
 insert into lx_rider_private.workspaces(owner_id) values(p_actor) on conflict(owner_id) do nothing;
 select * into s from lx_rider_private.workspaces where owner_id=p_actor for update;
 insert into lx_rider_private.people(workspace_id,key,role,label) values
 (s.id,'rider1','rider','模擬騎手 A'),(s.id,'rider2','rider','模擬騎手 B'),(s.id,'dispatch','dispatcher','模擬總部'),(s.id,'receiver','receiver','模擬收件端') on conflict do nothing;
 insert into lx_rider_private.events(workspace_id,actor_key,action) select s.id,'system','initialize' where not exists(select 1 from lx_rider_private.events where workspace_id=s.id);
 else
 select * into s from lx_rider_private.workspaces where owner_id=p_actor for update;
 end if;
 if s.id is null then return jsonb_build_object('initialized',false,'simulation_only',true,'formal_enabled',false); end if;
 if not s.enabled then raise exception 'RIDER_TEST_LOCKED'; end if;
 select * into p from lx_rider_private.people where workspace_id=s.id and key=a;
 if p.key is null then raise exception 'RIDER_ROLE_DENIED'; end if;
 if p_action in ('bootstrap','initialize') then
 result:=lx_rider_private.snapshot(s.id,a);
 if p_action='bootstrap' and p_payload ? 'task_id' then
  if p.role<>'rider' or not exists(select 1 from lx_rider_private.vehicles x where x.workspace_id=s.id and x.rider_key=a and lx_rider_private.qualified(s.id,a,x.id)) then raise exception 'RIDER_QUALIFICATION_DENIED'; end if;
  tid:=nullif(p_payload->>'task_id','')::uuid;
  select * into t from lx_rider_private.tasks x where x.id=tid and x.workspace_id=s.id and (x.status='unassigned' or (x.rider_key=a and x.status in ('offered','accepted','picked_up')));
  if t.id is null then raise exception 'RIDER_TASK_DENIED'; end if;
  result:=result||jsonb_build_object('task_preview',jsonb_build_object('id',t.id,'bag_code',t.bag_code,'pickup_label',t.pickup_label,'delivery_label',t.delivery_label,'pickup_lat',t.pickup_lat,'pickup_lng',t.pickup_lng,'delivery_lat',t.delivery_lat,'delivery_lng',t.delivery_lng,'clothing_count',t.clothing_count));
 end if;
 return result;
 end if;
 if p_action='document_link' then
 select d.path into doc_path from lx_rider_private.documents d where d.id=(p_payload->>'document_id')::uuid and d.workspace_id=s.id and d.deleted_at is null and (p.role='dispatcher' or d.rider_key=a) and (d.delete_after is null or d.delete_after>now() or d.legal_hold);
 if doc_path is null then raise exception 'RIDER_DOCUMENT_DENIED'; end if;
 insert into lx_rider_private.events(workspace_id,actor_key,action) values(s.id,a,'document_link');
 return jsonb_build_object('path',doc_path);
 end if;
 if p_action='proof_link' then
 select * into t from lx_rider_private.tasks x where x.workspace_id=s.id and x.id=(p_payload->>'task_id')::uuid;
 if t.id is null or not (a='dispatch' or t.rider_key=a or (a=t.receiver_key and t.status in ('handover_pending','delivered'))) then raise exception 'RIDER_TASK_DENIED'; end if;
 doc_path:=case when p_payload->>'stage'='pickup' then t.pickup_photo_path when p_payload->>'stage'='delivery' then t.delivery_photo_path else null end;
 if doc_path is null then raise exception 'RIDER_DOCUMENT_DENIED'; end if;
 return jsonb_build_object('path',doc_path);
 end if;
 if p_action='operate_live' then raise exception 'RIDER_FORMAL_LOCKED'; end if;
 cmd:=(p_payload->>'command_id')::uuid;
 if cmd is null then raise exception 'RIDER_COMMAND_REQUIRED'; end if;
 select * into cached from lx_rider_private.commands where workspace_id=s.id and command_id=cmd;
 if found then
 if cached.request<>jsonb_build_object('action',p_action,'payload',p_payload) then raise exception 'RIDER_COMMAND_REUSED'; end if;
 return cached.response;
 end if;
 if (p_payload->>'revision')::integer is distinct from s.revision then raise exception 'RIDER_STALE_STATE'; end if;
 if p_action in ('review_application','review_vehicle','revoke_vehicle','expire_certificate','create_tasks','set_item_count','assign','reassign','resolve','cancel','route') and p.role<>'dispatcher' then raise exception 'RIDER_ROLE_DENIED'; end if;
 if p_action in ('add_vehicle','submit_application','renew_application','accept','claim','arrive','pickup','handover','exception') and p.role<>'rider' then raise exception 'RIDER_ROLE_DENIED'; end if;
 rid:=coalesce(p_payload->>'rider',a); tid:=nullif(p_payload->>'task_id','')::uuid; vid:=nullif(p_payload->>'vehicle_id','')::uuid;
 if tid is not null then
 select * into t from lx_rider_private.tasks where id=tid and workspace_id=s.id for update;
 if not found then raise exception 'RIDER_TASK_DENIED'; end if;
 if p.role='rider' and t.rider_key is distinct from a and not (p_action='claim' and t.status='unassigned') then raise exception 'RIDER_TASK_DENIED'; end if;
 if p.role='receiver' and t.receiver_key<>a then raise exception 'RIDER_TASK_DENIED'; end if;
 end if;
 if vid is not null then
 select * into v from lx_rider_private.vehicles where id=vid and workspace_id=s.id for update;
 if not found or (p.role='rider' and v.rider_key<>a) then raise exception 'RIDER_VEHICLE_DENIED'; end if;
 end if;
 case p_action
 when 'add_vehicle' then
 select count(*) into n from lx_rider_private.vehicles where workspace_id=s.id and rider_key=a;
 if n>=3 then raise exception 'RIDER_VEHICLE_LIMIT'; end if;
 insert into lx_rider_private.vehicles(workspace_id,rider_key,label) values(s.id,a,'TEST-機車 '||(n+1)) returning id into vid;
 when 'prepare_sample' then
 -- This only reserves a server-generated TEST image. Client file bytes are never accepted.
 if p.role<>'rider' then raise exception 'RIDER_ROLE_DENIED'; end if;
 kind:=p_payload->>'kind';
 if kind not in ('certificate','license','registration','owner_authorization') or kind is null then raise exception 'RIDER_INPUT_INVALID'; end if;
 if kind in ('registration','owner_authorization') and vid is null then raise exception 'RIDER_VEHICLE_DENIED'; end if;
 if kind in ('license','certificate') and vid is not null then raise exception 'RIDER_INPUT_INVALID'; end if;
 select count(*) into n from lx_rider_private.documents where workspace_id=s.id and rider_key=a;
 if n>=20 then raise exception 'RIDER_DOCUMENT_LIMIT'; end if;
 doc_path:=s.id::text||'/'||a||'/'||gen_random_uuid()::text||'.png';
 insert into lx_rider_private.documents(workspace_id,rider_key,vehicle_id,kind,path) values(s.id,a,vid,kind,doc_path);
 when 'renew_application' then
 if p.application<>'approved' then raise exception 'RIDER_STATE_DENIED'; end if;
 update lx_rider_private.people set application='draft',application_opened_at=now(),submitted_at=null,review_due_on=null where workspace_id=s.id and key=a;
 when 'submit_application' then
 if coalesce((p_payload->>'simulation_confirmed')::boolean,false)<>true then raise exception 'RIDER_CONFIRM_REQUIRED'; end if;
 issue:=(p_payload->>'cert_issued_on')::date;
 if issue is null or issue>current_date or issue<current_date-30 then raise exception 'RIDER_CERT_DATE_INVALID'; end if;
 if p.application not in ('draft','supplement') then raise exception 'RIDER_STATE_DENIED'; end if;
 if (p.license_status<>'approved' and not exists(select 1 from lx_rider_private.documents d join storage.objects o on o.bucket_id='rider-test-documents' and o.name=d.path where d.workspace_id=s.id and d.rider_key=a and d.kind='license' and d.deleted_at is null))
 or not exists(select 1 from lx_rider_private.documents d join storage.objects o on o.bucket_id='rider-test-documents' and o.name=d.path where d.workspace_id=s.id and d.rider_key=a and d.kind='certificate' and d.deleted_at is null and d.created_at>=p.application_opened_at) then raise exception 'RIDER_DOCUMENT_REQUIRED'; end if;
 update lx_rider_private.people set application='submitted',cert_issued_on=issue,simulation_confirmed=true,review_note='',submitted_at=now(),review_due_on=(select day::date from generate_series(current_date+1,current_date+7,interval '1 day') day where extract(isodow from day)<6 order by day offset 2 limit 1) where workspace_id=s.id and key=a;
 when 'review_application' then
 if not exists(select 1 from lx_rider_private.people where workspace_id=s.id and key=rid and role='rider' and application='submitted') then raise exception 'RIDER_STATE_DENIED'; end if;
 if p_payload->>'decision'='supplement' then
 update lx_rider_private.people set application='supplement',review_note='請確認模擬證件資料後重新提交' where workspace_id=s.id and key=rid;
 elsif p_payload->>'decision'='approve' then
 if not exists(select 1 from lx_rider_private.people where workspace_id=s.id and key=rid and cert_issued_on between current_date-30 and current_date) then raise exception 'RIDER_CERT_DATE_INVALID'; end if;
 update lx_rider_private.people set application='approved',license_status='approved',cert_valid_until=(current_date+interval '12 months')::date,review_note='模擬審核通過，不是正式資格' where workspace_id=s.id and key=rid;
 update lx_rider_private.documents d set reviewed_at=now(),delete_after=now()+interval '30 days' where d.workspace_id=s.id and d.rider_key=rid and d.kind in ('license','certificate') and d.reviewed_at is null;
 else raise exception 'RIDER_INPUT_INVALID'; end if;
 when 'review_vehicle' then
 if vid is null or v.status<>'pending' then raise exception 'RIDER_STATE_DENIED'; end if;
 if not exists(select 1 from lx_rider_private.documents d join storage.objects o on o.bucket_id='rider-test-documents' and o.name=d.path where d.workspace_id=s.id and d.vehicle_id=vid and d.kind='registration' and d.deleted_at is null)
 or (v.non_owner and not exists(select 1 from lx_rider_private.documents d join storage.objects o on o.bucket_id='rider-test-documents' and o.name=d.path where d.workspace_id=s.id and d.vehicle_id=vid and d.kind='owner_authorization' and d.deleted_at is null)) then raise exception 'RIDER_DOCUMENT_REQUIRED'; end if;
 update lx_rider_private.vehicles set status='approved',owner_authorized=true where id=vid;
 update lx_rider_private.documents d set reviewed_at=now(),delete_after=case when d.kind='registration' then now()+interval '30 days' else null end where d.vehicle_id=vid and d.reviewed_at is null;
 when 'revoke_vehicle' then
 if vid is null then raise exception 'RIDER_VEHICLE_DENIED'; end if;
 update lx_rider_private.vehicles set status='revoked',owner_authorized=false where id=vid;
 when 'expire_certificate' then
 update lx_rider_private.people set cert_valid_until=current_date-1 where workspace_id=s.id and key=rid and role='rider';
 if not found then raise exception 'RIDER_ROLE_DENIED'; end if;
 when 'create_tasks' then
 select count(*) into n from lx_rider_private.tasks where workspace_id=s.id;
 if n>=12 then raise exception 'RIDER_TASK_LIMIT'; end if;
 insert into lx_rider_private.tasks(workspace_id,bag_code,pickup_label,delivery_label,pickup_lat,pickup_lng,delivery_lat,delivery_lng,route_order,clothing_count)
 values(s.id,'TEST-'||to_char(n+1,'FM0000'),'模擬取件點（臺南車站周邊）','模擬交接點（公園周邊）',22.9971,120.2125,23.004,120.211,n+1,2);
 when 'set_item_count' then
 if tid is null or t.status not in ('unassigned','offered') then raise exception 'RIDER_STATE_DENIED'; end if;
 if not coalesce(jsonb_typeof(p_payload->'clothing_count')='number' and (p_payload->>'clothing_count') ~ '^[0-9]{1,4}$',false) then raise exception 'RIDER_INPUT_INVALID'; end if;
 if (p_payload->>'clothing_count')::integer not between 1 and 1000 then raise exception 'RIDER_INPUT_INVALID'; end if;
 update lx_rider_private.tasks set clothing_count=(p_payload->>'clothing_count')::integer where id=tid;
 when 'assign' then
 if tid is null or t.status<>'unassigned' or not lx_rider_private.qualified(s.id,rid,vid) or vid is null then raise exception 'RIDER_ASSIGN_DENIED'; end if;
 update lx_rider_private.tasks set rider_key=rid,vehicle_id=vid,status='offered' where id=tid;
 when 'claim' then
 if tid is null or t.status<>'unassigned' or vid is null or not lx_rider_private.qualified(s.id,a,vid) then raise exception 'RIDER_QUALIFICATION_DENIED'; end if;
 if (select count(*) from lx_rider_private.tasks x where x.workspace_id=s.id and x.rider_key=a and (x.status in ('accepted','picked_up') or (x.status='exception' and x.rider_handover_at is null)))>=3 then raise exception 'RIDER_CAPACITY_REACHED'; end if;
 update lx_rider_private.tasks set status='accepted',rider_key=a,vehicle_id=vid where id=tid;
 when 'arrive' then
 if tid is null or t.status<>'accepted' then raise exception 'RIDER_STATE_DENIED'; end if;
 update lx_rider_private.tasks set arrived_at=coalesce(arrived_at,now()) where id=tid;
 when 'accept' then
 if tid is null or t.status<>'offered' or vid is null or not lx_rider_private.qualified(s.id,a,vid) then raise exception 'RIDER_QUALIFICATION_DENIED'; end if;
 if (select count(*) from lx_rider_private.tasks x where x.workspace_id=s.id and x.rider_key=a and (x.status in ('accepted','picked_up') or (x.status='exception' and x.rider_handover_at is null)))>=3 then raise exception 'RIDER_CAPACITY_REACHED'; end if;
 update lx_rider_private.tasks set status='accepted',vehicle_id=vid where id=tid;
 when 'pickup' then
 if tid is null or t.status<>'accepted' or not lx_rider_private.qualified(s.id,a,t.vehicle_id) then raise exception 'RIDER_QUALIFICATION_DENIED'; end if;
 if p_payload->>'bag_code' is distinct from t.bag_code or coalesce((p_payload->>'sealed')::boolean,false)<>true then raise exception 'RIDER_BAG_CHECK_REQUIRED'; end if;
 if p_payload->>'photo_path' is not null and not lx_rider_private.valid_proof(p_actor,s.id,t.id,a,'pickup',p_payload->>'photo_path') then raise exception 'RIDER_PHOTO_INVALID'; end if;
 update lx_rider_private.tasks set status='picked_up',picked_up_at=now(),pickup_photo_path=p_payload->>'photo_path' where id=tid;
 when 'handover' then
 if tid is null or t.status<>'picked_up' then raise exception 'RIDER_STATE_DENIED'; end if;
 if p_payload->>'photo_path' is not null and not lx_rider_private.valid_proof(p_actor,s.id,t.id,a,'delivery',p_payload->>'photo_path') then raise exception 'RIDER_PHOTO_INVALID'; end if;
 update lx_rider_private.tasks set status='handover_pending',rider_handover_at=now(),delivery_photo_path=p_payload->>'photo_path' where id=tid;
 when 'receive' then
 if p.role<>'receiver' or tid is null or t.status<>'handover_pending' or p_payload->>'bag_code' is distinct from t.bag_code then raise exception 'RIDER_RECEIVE_DENIED'; end if;
 update lx_rider_private.tasks set status='delivered',received_at=now(),receipt_code='TEST-RECEIPT-'||left(id::text,8) where id=tid;
 when 'exception' then
 if tid is null or t.status not in ('accepted','picked_up','handover_pending') then raise exception 'RIDER_STATE_DENIED'; end if;
 if coalesce(p_payload->>'code','') not in ('bag_missing','seal_broken','address_issue','cannot_deliver','safety') then raise exception 'RIDER_INPUT_INVALID'; end if;
 if length(coalesce(p_payload->>'note',''))>200 then raise exception 'RIDER_INPUT_INVALID'; end if;
 update lx_rider_private.tasks set previous_status=status,status='exception',exception_code=p_payload->>'code',exception_note=coalesce(p_payload->>'note','') where id=tid;
 when 'resolve' then
 if tid is null or t.status<>'exception' then raise exception 'RIDER_STATE_DENIED'; end if;
 update lx_rider_private.tasks set status=previous_status,exception_code=null,exception_note=null,previous_status=null where id=tid;
 when 'reassign' then
 -- A bag already in custody must complete an explicit safety handover; never silently move it.
 if tid is null or t.status not in ('offered','accepted','exception') or t.picked_up_at is not null or vid is null or not lx_rider_private.qualified(s.id,rid,vid) then raise exception 'RIDER_REASSIGN_DENIED'; end if;
 update lx_rider_private.tasks set rider_key=rid,vehicle_id=vid,status='offered',previous_status=null,exception_code=null,exception_note=null where id=tid;
 when 'cancel' then
 if tid is null or t.status not in ('unassigned','offered','accepted','exception') or t.picked_up_at is not null then raise exception 'RIDER_CANCEL_DENIED'; end if;
 update lx_rider_private.tasks set status='cancelled' where id=tid;
 when 'route' then
 if tid is null or (p_payload->>'order')::int not between 1 and 100 then raise exception 'RIDER_INPUT_INVALID'; end if;
 update lx_rider_private.tasks set route_order=route_order+1 where workspace_id=s.id and id<>tid and route_order>=(p_payload->>'order')::int;
 update lx_rider_private.tasks set route_order=(p_payload->>'order')::int where id=tid;
 when 'document_link' then
 select d.path into doc_path from lx_rider_private.documents d where d.id=(p_payload->>'document_id')::uuid and d.workspace_id=s.id and d.deleted_at is null and (p.role='dispatcher' or d.rider_key=a) and (d.delete_after is null or d.delete_after>now() or d.legal_hold);
 if doc_path is null then raise exception 'RIDER_DOCUMENT_DENIED'; end if;
 else raise exception 'RIDER_ACTION_DENIED';
 end case;
 insert into lx_rider_private.events(workspace_id,actor_key,action,target_id,detail) values(s.id,a,p_action,coalesce(tid,vid),jsonb_strip_nulls(jsonb_build_object('rider',rid,'kind',kind,'decision',p_payload->>'decision','code',p_payload->>'code','clothing_count',case when p_action='set_item_count' then p_payload->'clothing_count' when p_action='create_tasks' then to_jsonb(2) else null end,'previous_clothing_count',case when p_action='set_item_count' then to_jsonb(t.clothing_count) else null end)));
 update lx_rider_private.workspaces set revision=revision+1 where id=s.id;
 result:=jsonb_build_object('ok',true,'revision',s.revision+1,'path',doc_path,'vehicle_id',vid,'simulation_only',true,'formal_enabled',false);
 insert into lx_rider_private.commands values(s.id,cmd,jsonb_build_object('action',p_action,'payload',p_payload),result,now());
 return result;
end;
$function$;

CREATE OR REPLACE FUNCTION lx_rider_private.snapshot(w uuid, a text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select jsonb_build_object('workspace_id',w,'revision',s.revision,'simulation_only',true,'formal_enabled',false,'actor',a,
 'notifications',(select coalesce(jsonb_agg(jsonb_build_object('rider',key,'days_left',cert_valid_until-current_date,'message',case when cert_valid_until<current_date then '資格已到期，停止承接新任務' else '良民證資格即將到期，請準備更新' end)),'[]') from lx_rider_private.people where workspace_id=w and role='rider' and (a='dispatch' or key=a) and cert_valid_until<=current_date+30),
 'people',(select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('eligible',lx_rider_private.qualified(w,p.key)) order by p.key),'[]')
 from lx_rider_private.people p where p.workspace_id=w and (a='dispatch' or p.key=a or p.role<>'rider')),
 'vehicles',(select coalesce(jsonb_agg(to_jsonb(v) order by v.label),'[]') from lx_rider_private.vehicles v where v.workspace_id=w and (a='dispatch' or v.rider_key=a)),
 'documents',(select coalesce(jsonb_agg((to_jsonb(d)-'path') order by d.created_at),'[]') from lx_rider_private.documents d where d.workspace_id=w and (a='dispatch' or d.rider_key=a)),
 'available_tasks',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'bag_code',x.bag_code,'status',x.status,'pickup_area','臺南取件區','delivery_area','臺南交接區','pickup_deadline',x.pickup_deadline,'bag_count',1,'clothing_count',x.clothing_count) order by x.created_at),'[]') from lx_rider_private.tasks x where x.workspace_id=w and x.status='unassigned' and a in ('rider1','rider2')),
 'tasks',(select coalesce(jsonb_agg(to_jsonb(t) order by t.route_order,t.created_at),'[]') from lx_rider_private.tasks t where t.workspace_id=w
 and (a='dispatch' or t.rider_key=a or (a=t.receiver_key and t.status in ('handover_pending','delivered')))),
 'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]') from (select id,actor_key,action,target_id,detail,created_at from lx_rider_private.events e where e.workspace_id=w
 and (a='dispatch' or e.actor_key=a or e.target_id in (select t.id from lx_rider_private.tasks t where t.workspace_id=w and (t.rider_key=a or (t.receiver_key=a and t.status in ('handover_pending','delivered'))))) order by id desc limit 100) e))
 from lx_rider_private.workspaces s where s.id=w;
$function$;
