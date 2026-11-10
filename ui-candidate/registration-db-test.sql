-- Transactional fixtures are rolled back inside an exception subtransaction.
-- No real user updates, published documents, SMS or completed memberships persist.
create or replace function pg_temp.expect_reg_error(p_sql text,p_expected text)
returns integer language plpgsql security invoker as $$
begin
 begin
  execute p_sql;
 exception when others then
  if position(p_expected in sqlerrm)>0 then return 1; end if;
  raise exception 'Unexpected test error: %',sqlerrm;
 end;
 raise exception 'Expected rejection missing: %',p_expected;
end;
$$;
do $$ begin
 execute format('grant usage on schema %I to authenticated,anon',
 (select nspname from pg_namespace where oid=pg_my_temp_schema()));
end $$;
create or replace function pg_temp.run_registration_tests()
returns jsonb language plpgsql security invoker as $regtest$
declare
 a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();d uuid:=gen_random_uuid();
 checks integer:=0; first_result jsonb;second_result jsonb;status_result jsonb;n integer;
begin
 begin
  insert into auth.users(id,aud,role,email,phone,phone_confirmed_at,is_anonymous,created_at,updated_at) values
  (a,'authenticated','authenticated',a::text||'@example.invalid','886900000001',now(),false,now(),now()),
  (b,'authenticated','authenticated',b::text||'@example.invalid','886900000002',null,false,now(),now()),
  (c,'authenticated','authenticated',c::text||'@example.invalid','886900000003',now(),false,now(),now()),
  (d,'authenticated','authenticated',d::text||'@example.invalid','886900000004',now(),false,now(),now());
  insert into auth.identities(user_id,provider,provider_id,identity_data)
  select id,'google',id::text,jsonb_build_object('sub',id::text)
  from auth.users where id in (a,b,d);
  update public.profiles set display_name='測試會員' where id in (a,b,c);
  -- Existing insert trigger leaves real name/address empty, as required for this test.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select public.lx_member_registration_status() into status_result;
  if (status_result->>'can_complete')::boolean is distinct from false
   or (status_result->>'phone_verified')::boolean is distinct from true
   or (status_result->>'google_verified')::boolean is distinct from true
  then raise exception 'TEST_FAIL_LOCKED_STATUS';end if;checks:=checks+1;
  checks:=checks+pg_temp.expect_reg_error(
   $$select public.lx_complete_member_registration('reg-fixture-v1',true,true)$$,'REG_LOCKED');
  checks:=checks+pg_temp.expect_reg_error(
   $$select public.lx_complete_member_registration('reg-fixture-v1',false,true)$$,'REG_EXPLICIT_CONSENT_REQUIRED');
  checks:=checks+pg_temp.expect_reg_error(
   $$select public.lx_complete_member_registration('reg-fixture-v1',true,null)$$,'REG_EXPLICIT_CONSENT_REQUIRED');
  checks:=checks+pg_temp.expect_reg_error(
   $$update public.profiles set registration_completed_at=now()$$,'permission denied');
  checks:=checks+pg_temp.expect_reg_error(
   $$update public.profiles set phone='886900000009'$$,'permission denied');
  checks:=checks+pg_temp.expect_reg_error(
   $$select * from lx_registration_private.settings$$,'permission denied');
  checks:=checks+pg_temp.expect_reg_error(
   $$update lx_registration_private.settings set enabled=true where id=1$$,'permission denied');
  checks:=checks+pg_temp.expect_reg_error(
   $$insert into public.lx_member_registration_consents(user_id,legal_version,terms_agreed,privacy_acknowledged) values(auth.uid(),'reg-fixture-v1',true,true)$$,'permission denied');
  perform set_config('request.jwt.claims','{}',true);
  checks:=checks+pg_temp.expect_reg_error(
   $$select public.lx_member_registration_status()$$,'REG_LOGIN_REQUIRED');
  execute 'reset role';
  insert into public.lx_member_legal_versions(version,terms_text,privacy_text)
   values('reg-fixture-v1','TEST ONLY - TERMS','TEST ONLY - PRIVACY');
  update lx_registration_private.settings set enabled=true,active_version='reg-fixture-v1' where id=1;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  checks:=checks+pg_temp.expect_reg_error(
   $$select public.lx_complete_member_registration('reg-fixture-v1',true,true)$$,'REG_LEGAL_NOT_PUBLISHED');
  checks:=checks+pg_temp.expect_reg_error(
   $$select public.lx_complete_member_registration('old-version',true,true)$$,'REG_LEGAL_VERSION_CHANGED');
  execute 'reset role';
  update public.lx_member_legal_versions set approved_at=now(),published_at=now() where version='reg-fixture-v1';
  checks:=checks+pg_temp.expect_reg_error(
   $$update public.lx_member_legal_versions set terms_text='tampered' where version='reg-fixture-v1'$$,'REG_APPROVED_LEGAL_IMMUTABLE');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  checks:=checks+pg_temp.expect_reg_error(
   $$select public.lx_complete_member_registration('reg-fixture-v1',true,true)$$,'REG_PHONE_VERIFICATION_REQUIRED');
  execute 'reset role';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',c,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  checks:=checks+pg_temp.expect_reg_error(
   $$select public.lx_complete_member_registration('reg-fixture-v1',true,true)$$,'REG_GOOGLE_REQUIRED');
  execute 'reset role';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',d,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  checks:=checks+pg_temp.expect_reg_error(
   $$select public.lx_complete_member_registration('reg-fixture-v1',true,true)$$,'REG_NAME_REQUIRED');
  execute 'reset role';
  update public.profiles set display_name=repeat('字',31) where id=d;
  execute 'set local role authenticated';
  checks:=checks+pg_temp.expect_reg_error(
   $$select public.lx_complete_member_registration('reg-fixture-v1',true,true)$$,'REG_NAME_REQUIRED');
  execute 'reset role';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select public.lx_complete_member_registration('reg-fixture-v1',true,true) into first_result;
  select public.lx_complete_member_registration('reg-fixture-v1',true,true) into second_result;
  if first_result is distinct from second_result or (first_result->>'user_id')::uuid<>a
  then raise exception 'TEST_FAIL_IDEMPOTENCE';end if;checks:=checks+1;
  select count(*) into n from public.lx_member_registration_consents;
  if n<>1 then raise exception 'TEST_FAIL_DUPLICATE_CONSENTS';end if;checks:=checks+1;
  select public.lx_member_registration_status() into status_result;
  if (status_result->>'registered')::boolean is distinct from true
  then raise exception 'TEST_FAIL_REGISTERED_STATUS';end if;checks:=checks+1;
  if not exists(select 1 from public.profiles where id=a and full_name is null and home_address is null and registration_completed_at is not null)
  then raise exception 'TEST_FAIL_OPTIONAL_NAME_ADDRESS';end if;checks:=checks+1;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  select count(*) into n from public.lx_member_registration_consents;
  if n<>0 then raise exception 'TEST_FAIL_CONSENT_ISOLATION';end if;checks:=checks+1;
  select count(*) into n from public.profiles where id=a;
  if n<>0 then raise exception 'TEST_FAIL_PROFILE_ISOLATION';end if;checks:=checks+1;
  checks:=checks+pg_temp.expect_reg_error(
   $$delete from public.lx_member_registration_consents$$,'permission denied');
  execute 'reset role';
  insert into public.lx_member_legal_versions(version,terms_text,privacy_text,approved_at,published_at,valid_until)
   values('reg-fixture-expired','TEST ONLY','TEST ONLY',now()-interval '3 days',now()-interval '2 days',now()-interval '1 day');
  update lx_registration_private.settings set active_version='reg-fixture-expired' where id=1;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  checks:=checks+pg_temp.expect_reg_error(
   $$select public.lx_complete_member_registration('reg-fixture-expired',true,true)$$,'REG_LEGAL_NOT_PUBLISHED');
  execute 'reset role';
  update lx_registration_private.settings set active_version='reg-fixture-v1' where id=1;
  update public.lx_member_legal_versions set withdrawn_at=now() where version='reg-fixture-v1';
  execute 'set local role authenticated';
  checks:=checks+pg_temp.expect_reg_error(
   $$select public.lx_complete_member_registration('reg-fixture-v1',true,true)$$,'REG_LEGAL_NOT_PUBLISHED');
  execute 'reset role';
  execute 'set local role anon';
  checks:=checks+pg_temp.expect_reg_error(
   $$select public.lx_member_registration_status()$$,'permission denied');
  checks:=checks+pg_temp.expect_reg_error(
   $$select * from public.lx_member_registration_consents$$,'permission denied');
  execute 'reset role';
  raise exception using errcode='ZX001',message='EXPECTED_FIXTURE_ROLLBACK';
 exception when sqlstate 'ZX001' then
  return jsonb_build_object('result','PASS','checks',checks,'fixtures_rolled_back',true,'sms_requests',0);
 end;
end;
$regtest$;
select pg_temp.run_registration_tests() as registration_test_result;

