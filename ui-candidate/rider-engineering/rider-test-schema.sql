-- RIDER-TEST-01. Synthetic workspaces only. No operational role or live share-bag mutation.
create schema lx_rider_private;
revoke all on schema lx_rider_private from public,anon,authenticated;
create table lx_rider_private.workspaces (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references auth.users(id),
 revision integer not null default 0, enabled boolean not null default true,
 formal_enabled boolean not null default false check(formal_enabled=false), created_at timestamptz not null default now()
);
create table lx_rider_private.people (
 workspace_id uuid references lx_rider_private.workspaces(id), key text,
 role text not null check(role in ('rider','dispatcher','receiver')), label text not null,
 application text not null default 'draft' check(application in ('draft','submitted','supplement','approved','suspended')),
 license_status text not null default 'pending' check(license_status in ('pending','approved','rejected')),
 cert_issued_on date, cert_valid_until date, simulation_confirmed boolean not null default false,
 review_note text not null default '', application_opened_at timestamptz not null default now(), submitted_at timestamptz, review_due_on date, primary key(workspace_id,key)
);
create table lx_rider_private.vehicles (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, rider_key text not null,
 label text not null, status text not null default 'pending' check(status in ('pending','approved','revoked')),
 owner_authorized boolean not null default false, non_owner boolean not null default true,
 foreign key(workspace_id,rider_key) references lx_rider_private.people(workspace_id,key)
);
create index on lx_rider_private.vehicles(workspace_id,rider_key);
create table lx_rider_private.documents (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, rider_key text not null,
 vehicle_id uuid references lx_rider_private.vehicles(id), kind text not null check(kind in ('certificate','license','registration','owner_authorization')),
 path text not null unique, sample_only boolean not null default true check(sample_only),
 reviewed_at timestamptz, delete_after timestamptz, deleted_at timestamptz,
 legal_hold boolean not null default false, created_at timestamptz not null default now(),
 foreign key(workspace_id,rider_key) references lx_rider_private.people(workspace_id,key)
);
create index on lx_rider_private.documents(workspace_id,rider_key);
create table lx_rider_private.tasks (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references lx_rider_private.workspaces(id),
 bag_code text not null check(bag_code like 'TEST-%'), status text not null default 'unassigned'
 check(status in ('unassigned','offered','accepted','picked_up','handover_pending','delivered','exception','cancelled')),
 rider_key text, vehicle_id uuid references lx_rider_private.vehicles(id), receiver_key text not null default 'receiver',
 pickup_label text not null, delivery_label text not null,
 pickup_lat numeric not null check(pickup_lat between -90 and 90), pickup_lng numeric not null check(pickup_lng between -180 and 180),
 delivery_lat numeric not null check(delivery_lat between -90 and 90), delivery_lng numeric not null check(delivery_lng between -180 and 180),
 route_order integer not null default 1 check(route_order>0), pickup_deadline timestamptz not null default now()+interval '48 hours',
 picked_up_at timestamptz, rider_handover_at timestamptz, received_at timestamptz,
 previous_status text, exception_code text, exception_note text, receipt_code text,
 fee_status text not null default 'rate_not_set' check(fee_status='rate_not_set'), created_at timestamptz not null default now(),
 foreign key(workspace_id,rider_key) references lx_rider_private.people(workspace_id,key),
 foreign key(workspace_id,receiver_key) references lx_rider_private.people(workspace_id,key), unique(workspace_id,bag_code)
);
create index on lx_rider_private.tasks(workspace_id,rider_key,status);
create table lx_rider_private.events (
 id bigint generated always as identity primary key, workspace_id uuid not null references lx_rider_private.workspaces(id),
 actor_key text not null, action text not null, target_id uuid, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create index on lx_rider_private.events(workspace_id,id);
create table lx_rider_private.commands (
 workspace_id uuid references lx_rider_private.workspaces(id), command_id uuid, request jsonb not null,
 response jsonb not null, created_at timestamptz not null default now(),primary key(workspace_id,command_id)
);
-- No client table access. All actions go through the verified Edge gateway.
do $$ declare t text; begin
 foreach t in array array['workspaces','people','vehicles','documents','tasks','events','commands'] loop
 execute format('alter table lx_rider_private.%I enable row level security',t);
 execute format('create policy service_only on lx_rider_private.%I for all to service_role using (true) with check (true)',t);
 end loop;
end $$;
revoke all on all tables in schema lx_rider_private from public,anon,authenticated;
revoke all on all sequences in schema lx_rider_private from public,anon,authenticated;

create function lx_rider_private.qualified(w uuid,r text,v uuid default null) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from lx_rider_private.people p where p.workspace_id=w and p.key=r and p.role='rider'
 and p.application<>'suspended' and p.license_status='approved' and p.simulation_confirmed and p.cert_valid_until>=current_date
 and (v is null or exists(select 1 from lx_rider_private.vehicles x where x.id=v and x.workspace_id=w and x.rider_key=r
 and x.status='approved' and (not x.non_owner or x.owner_authorized))));
$$;

create function lx_rider_private.snapshot(w uuid,a text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('workspace_id',w,'revision',s.revision,'simulation_only',true,'formal_enabled',false,'actor',a,
 'notifications',(select coalesce(jsonb_agg(jsonb_build_object('rider',key,'days_left',cert_valid_until-current_date,'message',case when cert_valid_until<current_date then '資格已到期，停止承接新任務' else '良民證資格即將到期，請準備更新' end)),'[]') from lx_rider_private.people where workspace_id=w and role='rider' and (a='dispatch' or key=a) and cert_valid_until<=current_date+30),
 'people',(select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('eligible',lx_rider_private.qualified(w,p.key)) order by p.key),'[]')
 from lx_rider_private.people p where p.workspace_id=w and (a='dispatch' or p.key=a or p.role<>'rider')),
 'vehicles',(select coalesce(jsonb_agg(to_jsonb(v) order by v.label),'[]') from lx_rider_private.vehicles v where v.workspace_id=w and (a='dispatch' or v.rider_key=a)),
 'documents',(select coalesce(jsonb_agg((to_jsonb(d)-'path') order by d.created_at),'[]') from lx_rider_private.documents d where d.workspace_id=w and (a='dispatch' or d.rider_key=a)),
 'tasks',(select coalesce(jsonb_agg(to_jsonb(t) order by t.route_order,t.created_at),'[]') from lx_rider_private.tasks t where t.workspace_id=w
 and (a='dispatch' or t.rider_key=a or (a=t.receiver_key and t.status in ('handover_pending','delivered')))),
 'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]') from (select id,actor_key,action,target_id,detail,created_at from lx_rider_private.events e where e.workspace_id=w
 and (a='dispatch' or e.actor_key=a or e.target_id in (select t.id from lx_rider_private.tasks t where t.workspace_id=w and (t.rider_key=a or (t.receiver_key=a and t.status in ('handover_pending','delivered'))))) order by id desc limit 100) e))
 from lx_rider_private.workspaces s where s.id=w;
$$;

create function lx_rider_private.gateway(p_actor uuid,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
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
 if p_action in ('bootstrap','initialize') then return lx_rider_private.snapshot(s.id,a); end if;
 if p_action='document_link' then
 select d.path into doc_path from lx_rider_private.documents d where d.id=(p_payload->>'document_id')::uuid and d.workspace_id=s.id and d.deleted_at is null and (p.role='dispatcher' or d.rider_key=a) and (d.delete_after is null or d.delete_after>now() or d.legal_hold);
 if doc_path is null then raise exception 'RIDER_DOCUMENT_DENIED'; end if;
 insert into lx_rider_private.events(workspace_id,actor_key,action) values(s.id,a,'document_link');
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
 if p_action in ('review_application','review_vehicle','revoke_vehicle','expire_certificate','create_tasks','assign','reassign','resolve','cancel','route') and p.role<>'dispatcher' then raise exception 'RIDER_ROLE_DENIED'; end if;
 if p_action in ('add_vehicle','submit_application','renew_application','accept','pickup','handover','exception') and p.role<>'rider' then raise exception 'RIDER_ROLE_DENIED'; end if;
 rid:=coalesce(p_payload->>'rider',a); tid:=nullif(p_payload->>'task_id','')::uuid; vid:=nullif(p_payload->>'vehicle_id','')::uuid;
 if tid is not null then
 select * into t from lx_rider_private.tasks where id=tid and workspace_id=s.id for update;
 if not found then raise exception 'RIDER_TASK_DENIED'; end if;
 if p.role='rider' and t.rider_key is distinct from a then raise exception 'RIDER_TASK_DENIED'; end if;
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
 insert into lx_rider_private.tasks(workspace_id,bag_code,pickup_label,delivery_label,pickup_lat,pickup_lng,delivery_lat,delivery_lng,route_order)
 values(s.id,'TEST-'||to_char(n+1,'FM0000'),'模擬取件點（臺南車站周邊）','模擬交接點（公園周邊）',22.9971,120.2125,23.004,120.211,n+1);
 when 'assign' then
 if tid is null or t.status<>'unassigned' or not lx_rider_private.qualified(s.id,rid,vid) or vid is null then raise exception 'RIDER_ASSIGN_DENIED'; end if;
 update lx_rider_private.tasks set rider_key=rid,vehicle_id=vid,status='offered' where id=tid;
 when 'accept' then
 if tid is null or t.status<>'offered' or vid is null or not lx_rider_private.qualified(s.id,a,vid) then raise exception 'RIDER_QUALIFICATION_DENIED'; end if;
 update lx_rider_private.tasks set status='accepted',vehicle_id=vid where id=tid;
 when 'pickup' then
 if tid is null or t.status<>'accepted' or not lx_rider_private.qualified(s.id,a,t.vehicle_id) then raise exception 'RIDER_QUALIFICATION_DENIED'; end if;
 if p_payload->>'bag_code' is distinct from t.bag_code or coalesce((p_payload->>'sealed')::boolean,false)<>true then raise exception 'RIDER_BAG_CHECK_REQUIRED'; end if;
 update lx_rider_private.tasks set status='picked_up',picked_up_at=now() where id=tid;
 when 'handover' then
 if tid is null or t.status<>'picked_up' then raise exception 'RIDER_STATE_DENIED'; end if;
 update lx_rider_private.tasks set status='handover_pending',rider_handover_at=now() where id=tid;
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
 insert into lx_rider_private.events(workspace_id,actor_key,action,target_id,detail) values(s.id,a,p_action,coalesce(tid,vid),jsonb_strip_nulls(jsonb_build_object('rider',rid,'kind',kind,'decision',p_payload->>'decision','code',p_payload->>'code')));
 update lx_rider_private.workspaces set revision=revision+1 where id=s.id;
 result:=jsonb_build_object('ok',true,'revision',s.revision+1,'path',doc_path,'vehicle_id',vid,'simulation_only',true,'formal_enabled',false);
 insert into lx_rider_private.commands values(s.id,cmd,jsonb_build_object('action',p_action,'payload',p_payload),result,now());
 return result;
end;
$$;
revoke all on all functions in schema lx_rider_private from public,anon,authenticated;
grant usage on schema lx_rider_private to service_role;
grant execute on function lx_rider_private.gateway(uuid,text,jsonb) to service_role;
create function public.lx_rider_test_gateway(p_actor uuid,p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select lx_rider_private.gateway(p_actor,p_action,p_payload); $$;
revoke all on function public.lx_rider_test_gateway(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.lx_rider_test_gateway(uuid,text,jsonb) to service_role;
-- Reserved for server-generated sample documents only; no client INSERT/SELECT policies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('rider-test-documents','rider-test-documents',false,2000000,array['image/png']);
create function lx_rider_private.cleanup(p_actor uuid,p_paths jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare w uuid; result jsonb; n integer; begin
 if not lx_share_private.test_member(p_actor) then raise exception 'RIDER_MEMBER_DENIED'; end if;
 select id into w from lx_rider_private.workspaces where owner_id=p_actor;
 if p_paths is null then
 select coalesce(jsonb_agg(path),'[]') into result from (select path from lx_rider_private.documents where workspace_id=w and delete_after<=now() and not legal_hold and deleted_at is null limit 50) d;
 return result;
 end if;
 if jsonb_typeof(p_paths)<>'array' or jsonb_array_length(p_paths)>50 then raise exception 'RIDER_INPUT_INVALID'; end if;
 update lx_rider_private.documents d set deleted_at=now() where workspace_id=w and delete_after<=now() and not legal_hold and deleted_at is null
 and path in(select jsonb_array_elements_text(p_paths)) and not exists(select 1 from storage.objects o where o.bucket_id='rider-test-documents' and o.name=d.path);
 get diagnostics n = row_count;
 return jsonb_build_object('deleted',n);
end $$;
revoke all on function lx_rider_private.cleanup(uuid,jsonb) from public,anon,authenticated;
grant execute on function lx_rider_private.cleanup(uuid,jsonb) to service_role;
create function public.lx_rider_test_cleanup(p_actor uuid,p_paths jsonb default null) returns jsonb language sql security invoker set search_path='' as $$ select lx_rider_private.cleanup(p_actor,p_paths); $$;
revoke all on function public.lx_rider_test_cleanup(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.lx_rider_test_cleanup(uuid,jsonb) to service_role;

create function public.lx_rider_test_sample_upload_allowed(p_actor uuid,p_path text) returns boolean language sql security definer set search_path='' as $$
 select lx_share_private.test_member(p_actor) and exists(select 1 from lx_rider_private.documents d join lx_rider_private.workspaces w on w.id=d.workspace_id where w.owner_id=p_actor and w.enabled and d.path=p_path and d.reviewed_at is null and d.deleted_at is null and d.created_at>now()-interval '10 minutes');
$$;
revoke all on function public.lx_rider_test_sample_upload_allowed(uuid,text) from public,anon,authenticated;
grant execute on function public.lx_rider_test_sample_upload_allowed(uuid,text) to service_role;
