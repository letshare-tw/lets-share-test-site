-- Test receiving bridge. Existing real share bags are never touched.
create table lx_artisan_private.test_bags (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 bag_code text not null, clothing_count integer not null default 2,
 status text not null default 'in_transit' check(status in ('in_transit','pending','received')),
 handed_over_at timestamptz,received_at timestamptz,receipt_code text,
 unique(owner_id,bag_code)
);
create table lx_artisan_private.receiving_batches (
 owner_id uuid not null references auth.users(id),command_id uuid not null,
 codes jsonb not null,receipt_code text not null,created_at timestamptz not null default now(),
 primary key(owner_id,command_id)
);
alter table lx_artisan_private.test_bags enable row level security;
alter table lx_artisan_private.receiving_batches enable row level security;
revoke all on lx_artisan_private.test_bags,lx_artisan_private.receiving_batches from public,anon,authenticated;
create function lx_artisan_private.receiving_snapshot() returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(x.obj order by x.sort_at desc,x.code),'[]'::jsonb) from (
 select b.bag_code code,coalesce(b.received_at,b.handed_over_at,'epoch') sort_at,
 jsonb_build_object('id',b.bag_code,'source_id',b.id,'source','fixture','name','獨立測試袋','count',b.clothing_count,'state',case when b.status='in_transit' then 'transit' else b.status end,'rider','模擬交件','area','測試資料','receipt_code',b.receipt_code,'received_at',b.received_at) obj
 from lx_artisan_private.test_bags b where b.owner_id=auth.uid()
 union all
 select t.bag_code,coalesce(t.received_at,t.rider_handover_at,t.created_at),
 jsonb_build_object('id',t.bag_code,'source_id',t.id,'source','rider','name',t.pickup_label,'count',t.clothing_count,'state',case when t.status='delivered' then 'received' else 'pending' end,'rider','騎手測試任務','area','本人隔離測試工作站','receipt_code',t.receipt_code,'received_at',t.received_at)
 from lx_rider_private.tasks t join lx_rider_private.workspaces w on w.id=t.workspace_id
 where w.owner_id=auth.uid() and w.enabled and not w.formal_enabled and t.receiver_key='receiver' and t.status in ('handover_pending','delivered')
) x;
$$;
revoke all on function lx_artisan_private.receiving_snapshot() from public,anon,authenticated;
alter function lx_artisan_private.gateway(text,jsonb) rename to identity_gateway;
revoke all on function lx_artisan_private.identity_gateway(text,jsonb) from public,anon,authenticated;
create function lx_artisan_private.gateway(p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); base jsonb; cmd uuid; codes jsonb; cached lx_artisan_private.receiving_batches; code text; bag lx_artisan_private.test_bags; t lx_rider_private.tasks; rw lx_rider_private.workspaces; rc text; n integer;
begin
 base:=lx_artisan_private.identity_gateway('status','{}');
 if not coalesce((base->>'activated')::boolean,false) then
  if p_action in ('status','activate') then base:=lx_artisan_private.identity_gateway(p_action,p_payload);else raise exception 'ARTISAN_ACTIVATION_REQUIRED';end if;
 else
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8192 then raise exception 'ARTISAN_INPUT_INVALID';end if;
  case p_action
  when 'status','activate','capacity','receiving' then base:=lx_artisan_private.identity_gateway(p_action,p_payload);
  when 'create_test_bags' then
   if p_payload->>'confirm_test_only' is distinct from 'true' then raise exception 'ARTISAN_CONFIRM_REQUIRED';end if;
   insert into lx_artisan_private.test_bags(owner_id,bag_code)
   select uid,'AT-'||upper(left(replace(uid::text,'-',''),12))||'-'||lpad(i::text,3,'0') from generate_series(1,3) i on conflict(owner_id,bag_code) do nothing;
  when 'simulate_handover' then
   if p_payload->>'confirm_test_only' is distinct from 'true' then raise exception 'ARTISAN_CONFIRM_REQUIRED';end if;
   update lx_artisan_private.test_bags set status='pending',handed_over_at=now() where owner_id=uid and status='in_transit';
  when 'receive_batch' then
   if p_payload->>'confirmed' is distinct from 'true' then raise exception 'ARTISAN_CONFIRM_REQUIRED';end if;
   cmd:=nullif(p_payload->>'command_id','')::uuid;
   if cmd is null or jsonb_typeof(p_payload->'codes') is distinct from 'array' then raise exception 'ARTISAN_INPUT_INVALID';end if;
   select jsonb_agg(v order by v) into codes from jsonb_array_elements_text(p_payload->'codes') v;
   n:=jsonb_array_length(p_payload->'codes');
   if n<1 or n>30 or n<>(select count(distinct v) from jsonb_array_elements_text(codes) v) then raise exception 'ARTISAN_BATCH_INVALID';end if;
   select * into cached from lx_artisan_private.receiving_batches where owner_id=uid and command_id=cmd;
   if found then
    if cached.codes<>codes then raise exception 'ARTISAN_COMMAND_REUSED';end if;
    rc:=cached.receipt_code;
   else
    rc:='AT-RECEIPT-'||upper(left(replace(cmd::text,'-',''),16));
    -- Own artisan workspace lock (identity_gateway) serializes own submissions.
    for code in select jsonb_array_elements_text(codes) loop
     select * into bag from lx_artisan_private.test_bags b where b.owner_id=uid and b.bag_code=code for update;
     if found then
      if bag.status<>'pending' then raise exception 'ARTISAN_BAG_NOT_READY';end if;
      update lx_artisan_private.test_bags set status='received',received_at=now(),receipt_code=rc where id=bag.id;
     else
      select * into rw from lx_rider_private.workspaces where owner_id=uid and enabled and not formal_enabled for update;
      if rw.id is null then raise exception 'ARTISAN_BAG_NOT_ALLOWED';end if;
      select * into t from lx_rider_private.tasks x where x.workspace_id=rw.id and x.bag_code=code and x.receiver_key='receiver' and x.status='handover_pending';
      if not found then raise exception 'ARTISAN_BAG_NOT_READY';end if;
      perform lx_rider_private.gateway(uid,'receive',jsonb_build_object('actor','receiver','task_id',t.id,'bag_code',code,'revision',rw.revision,'command_id',gen_random_uuid()));
     end if;
    end loop;
    insert into lx_artisan_private.receiving_batches(owner_id,command_id,codes,receipt_code) values(uid,cmd,codes,rc);
   end if;
  else raise exception 'ARTISAN_ACTION_NOT_ALLOWED';
  end case;
 end if;
 if coalesce((base->>'activated')::boolean,false) then
  return base||jsonb_build_object('bags',lx_artisan_private.receiving_snapshot(),'integration_stage','test_receiving','receipt_code',rc);
 end if;
 return base;
end; $$;
revoke all on function lx_artisan_private.gateway(text,jsonb) from public,anon;
grant execute on function lx_artisan_private.gateway(text,jsonb) to authenticated;
