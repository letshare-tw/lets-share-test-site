-- ARTISAN-TEST-01: isolated test identity, not formal artisan approval.
create schema lx_artisan_private;
revoke all on schema lx_artisan_private from public, anon, authenticated;
grant usage on schema lx_artisan_private to authenticated;
create table lx_artisan_private.workspaces (
 owner_id uuid primary key references auth.users(id),
 enabled boolean not null default true,
 formal_enabled boolean not null default false check(formal_enabled=false),
 capacity integer not null default 12 check(capacity between 1 and 100),
 receiving_open boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table lx_artisan_private.workspaces enable row level security;
revoke all on lx_artisan_private.workspaces from public,anon,authenticated;
create function lx_artisan_private.gateway(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); w lx_artisan_private.workspaces%rowtype; n integer; own_name text;
begin
 if uid is null then raise exception 'ARTISAN_LOGIN_REQUIRED'; end if;
 if not lx_registration_private.is_registration_test_user(uid) then raise exception 'ARTISAN_TEST_ACCOUNT_NOT_ALLOWED'; end if;
 select p.display_name into own_name from public.profiles p where p.id=uid and p.registration_completed_at is not null;
 if not found then raise exception 'ARTISAN_REGISTRATION_REQUIRED'; end if;
 if p_action not in ('status','activate','capacity','receiving') or p_action is null then raise exception 'ARTISAN_ACTION_NOT_ALLOWED'; end if;
 if p_action='activate' then
  if p_payload->>'confirm_test_only' is distinct from 'true' then raise exception 'ARTISAN_CONFIRM_REQUIRED'; end if;
  insert into lx_artisan_private.workspaces(owner_id) values(uid) on conflict(owner_id) do nothing;
 end if;
 select * into w from lx_artisan_private.workspaces where owner_id=uid for update;
 if not found then return jsonb_build_object('activated',false,'user_id',uid,'display_name',own_name,'formal_enabled',false); end if;
 if not w.enabled then raise exception 'ARTISAN_WORKSPACE_DISABLED'; end if;
 if p_action='capacity' then
  if jsonb_typeof(p_payload->'capacity') is distinct from 'number' or (p_payload->>'capacity')!~'^[0-9]{1,3}$' then raise exception 'ARTISAN_CAPACITY_INVALID'; end if;
  n:=(p_payload->>'capacity')::integer;
  if n<1 or n>100 then raise exception 'ARTISAN_CAPACITY_INVALID'; end if;
  update lx_artisan_private.workspaces set capacity=n,updated_at=now() where owner_id=uid;
 elsif p_action='receiving' then
  if jsonb_typeof(p_payload->'open') is distinct from 'boolean' then raise exception 'ARTISAN_RECEIVING_INVALID'; end if;
  update lx_artisan_private.workspaces set receiving_open=(p_payload->>'open')::boolean,updated_at=now() where owner_id=uid;
 end if;
 select * into w from lx_artisan_private.workspaces where owner_id=uid;
 return jsonb_build_object('activated',true,'user_id',uid,'display_name',own_name,'formal_enabled',false,'capacity',w.capacity,'receiving_open',w.receiving_open,'bags','[]'::jsonb,'inventory','[]'::jsonb,'integration_stage','identity_capacity_only');
end; $$;
revoke all on function lx_artisan_private.gateway(text,jsonb) from public,anon;
grant execute on function lx_artisan_private.gateway(text,jsonb) to authenticated;
create function public.lx_artisan_test_gateway(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select lx_artisan_private.gateway(p_action,p_payload); $$;
revoke all on function public.lx_artisan_test_gateway(text,jsonb) from public,anon;
grant execute on function public.lx_artisan_test_gateway(text,jsonb) to authenticated;
