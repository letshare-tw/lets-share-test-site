-- REG-01: lets-share-test only. No legal documents published or members completed.
create schema lx_registration_private;
revoke all on schema lx_registration_private from public, anon, authenticated;
grant usage on schema lx_registration_private to authenticated;

create table public.lx_member_legal_versions (
 version text primary key check (char_length(btrim(version)) between 1 and 100),
 terms_text text not null,
 privacy_text text not null,
 created_at timestamptz not null default now(),
 approved_at timestamptz,
 published_at timestamptz,
 valid_until timestamptz,
 withdrawn_at timestamptz,
 check (approved_at is null or (char_length(btrim(terms_text))>0 and char_length(btrim(privacy_text))>0)),
 check (published_at is null or (approved_at is not null and published_at>=approved_at)),
 check (valid_until is null or (published_at is not null and valid_until>published_at))
);
alter table public.lx_member_legal_versions enable row level security;
revoke all on public.lx_member_legal_versions from public,anon,authenticated;
grant select on public.lx_member_legal_versions to authenticated;
create policy member_legal_published_read on public.lx_member_legal_versions
 for select to authenticated using (
 approved_at is not null and published_at is not null and published_at<=now()
 and withdrawn_at is null and (valid_until is null or valid_until>now())
 );

create table lx_registration_private.settings (
 id smallint primary key check(id=1),
 enabled boolean not null default false,
 active_version text references public.lx_member_legal_versions(version),
 check (not enabled or active_version is not null)
);
insert into lx_registration_private.settings(id,enabled) values(1,false);
alter table lx_registration_private.settings enable row level security;
revoke all on lx_registration_private.settings from public,anon,authenticated;
create policy registration_settings_no_client_access on lx_registration_private.settings
 for all to authenticated using(false) with check(false);

create table public.lx_member_registration_consents (
 user_id uuid not null references public.profiles(id) on delete cascade,
 legal_version text not null references public.lx_member_legal_versions(version),
 terms_agreed boolean not null check(terms_agreed),
 privacy_acknowledged boolean not null check(privacy_acknowledged),
 agreed_at timestamptz not null default now(),
 consent_method text not null default 'explicit_member_registration' check(consent_method='explicit_member_registration'),
 primary key(user_id,legal_version)
);
alter table public.lx_member_registration_consents enable row level security;
revoke all on public.lx_member_registration_consents from public,anon,authenticated;
grant select on public.lx_member_registration_consents to authenticated;
create policy member_registration_consents_own_read on public.lx_member_registration_consents
 for select to authenticated using ((select auth.uid())=user_id);

create function lx_registration_private.immutable_approved_legal()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 if old.approved_at is not null and
 (new.version,new.terms_text,new.privacy_text,new.created_at,new.approved_at,new.valid_until)
 is distinct from
 (old.version,old.terms_text,old.privacy_text,old.created_at,old.approved_at,old.valid_until)
 then raise exception 'REG_APPROVED_LEGAL_IMMUTABLE'; end if;
 if old.published_at is not null and new.published_at is distinct from old.published_at
 then raise exception 'REG_PUBLISHED_TIME_IMMUTABLE'; end if;
 return new;
end;
$$;
revoke all on function lx_registration_private.immutable_approved_legal() from public,anon,authenticated;
create trigger immutable_approved_member_legal before update on public.lx_member_legal_versions
 for each row execute function lx_registration_private.immutable_approved_legal();

-- Definer is intentionally private: reads Auth and atomically writes protected records.
-- No caller-supplied user ID; every operation is scoped to auth.uid().
create function lx_registration_private.registration_status()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare
 v_uid uuid:=auth.uid(); v_profile public.profiles%rowtype;
 v_settings lx_registration_private.settings%rowtype;
 v_legal public.lx_member_legal_versions%rowtype;
 v_google boolean; v_phone boolean; v_name boolean; v_legal_ready boolean:=false;
 v_has_consent boolean;
begin
 if v_uid is null then raise exception 'REG_LOGIN_REQUIRED'; end if;
 select * into v_profile from public.profiles where id=v_uid;
 if not found then raise exception 'REG_PROFILE_REQUIRED'; end if;
 select exists(select 1 from auth.identities where user_id=v_uid and provider='google'),
 exists(select 1 from auth.users where id=v_uid and not is_anonymous
 and phone_confirmed_at is not null and coalesce(phone,'')<>'')
 into v_google,v_phone;
 v_name:=char_length(btrim(coalesce(v_profile.display_name,''))) between 2 and 30
 and coalesce(v_profile.display_name,'') !~ '[[:cntrl:]]';
 select * into v_settings from lx_registration_private.settings where id=1;
 select * into v_legal from public.lx_member_legal_versions
 where version=v_settings.active_version and approved_at is not null
 and published_at is not null and published_at<=now()
 and withdrawn_at is null and (valid_until is null or valid_until>now());
 v_legal_ready:=found;
 select exists(select 1 from public.lx_member_registration_consents where user_id=v_uid)
 into v_has_consent;
 return jsonb_build_object(
 'user_id',v_uid,'google_verified',v_google,'name_ready',v_name,'phone_verified',v_phone,
 'registration_completed_at',v_profile.registration_completed_at,
 'registered',v_profile.registration_completed_at is not null and v_has_consent,
 'registration_enabled',coalesce(v_settings.enabled,false),
 'legal_ready',v_legal_ready,
 'can_complete',coalesce(v_settings.enabled,false) and v_legal_ready and v_google and v_name and v_phone,
 'legal',case when v_legal_ready then jsonb_build_object(
 'version',v_legal.version,'terms_text',v_legal.terms_text,'privacy_text',v_legal.privacy_text,
 'published_at',v_legal.published_at) else null end
 );
end;
$$;
revoke all on function lx_registration_private.registration_status() from public,anon,authenticated;
grant execute on function lx_registration_private.registration_status() to authenticated;

create function lx_registration_private.complete_registration(
 p_legal_version text,p_terms_agreed boolean,p_privacy_acknowledged boolean)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();v_settings lx_registration_private.settings%rowtype;
 v_legal public.lx_member_legal_versions%rowtype;v_profile public.profiles%rowtype;
 v_user auth.users%rowtype;v_completed_at timestamptz;v_consent_at timestamptz;
begin
 if v_uid is null then raise exception 'REG_LOGIN_REQUIRED'; end if;
 if p_terms_agreed is distinct from true or p_privacy_acknowledged is distinct from true
 then raise exception 'REG_EXPLICIT_CONSENT_REQUIRED'; end if;
 -- Serialize publication changes against completion, and duplicates against the profile.
 select * into v_settings from lx_registration_private.settings where id=1 for share;
 if v_settings.enabled is distinct from true then raise exception 'REG_LOCKED'; end if;
 if p_legal_version is null or p_legal_version is distinct from v_settings.active_version
 then raise exception 'REG_LEGAL_VERSION_CHANGED'; end if;
 select * into v_legal from public.lx_member_legal_versions
 where version=p_legal_version and approved_at is not null
 and published_at is not null and published_at<=now()
 and withdrawn_at is null and (valid_until is null or valid_until>now()) for share;
 if not found then raise exception 'REG_LEGAL_NOT_PUBLISHED'; end if;
 select * into v_user from auth.users where id=v_uid for share;
 if not found or v_user.is_anonymous or not exists(
 select 1 from auth.identities where user_id=v_uid and provider='google')
 then raise exception 'REG_GOOGLE_REQUIRED'; end if;
 if v_user.phone_confirmed_at is null or coalesce(v_user.phone,'')=''
 then raise exception 'REG_PHONE_VERIFICATION_REQUIRED'; end if;
 select * into v_profile from public.profiles where id=v_uid for update;
 if not found then raise exception 'REG_PROFILE_REQUIRED'; end if;
 if char_length(btrim(coalesce(v_profile.display_name,''))) not between 2 and 30
 or coalesce(v_profile.display_name,'') ~ '[[:cntrl:]]'
 then raise exception 'REG_NAME_REQUIRED'; end if;
 -- Real name/address are intentionally not registration requirements.
 v_completed_at:=coalesce(v_profile.registration_completed_at,now());
 insert into public.lx_member_registration_consents(user_id,legal_version,terms_agreed,privacy_acknowledged,agreed_at)
 values(v_uid,p_legal_version,true,true,now()) on conflict(user_id,legal_version) do nothing;
 select agreed_at into v_consent_at from public.lx_member_registration_consents
 where user_id=v_uid and legal_version=p_legal_version;
 if v_profile.registration_completed_at is null then
 update public.profiles set registration_completed_at=v_completed_at,updated_at=now() where id=v_uid;
 end if;
 return jsonb_build_object('registered',true,'user_id',v_uid,'legal_version',p_legal_version,
 'registration_completed_at',v_completed_at,'agreed_at',v_consent_at);
end;
$$;
revoke all on function lx_registration_private.complete_registration(text,boolean,boolean) from public,anon,authenticated;
grant execute on function lx_registration_private.complete_registration(text,boolean,boolean) to authenticated;

create function public.lx_member_registration_status()
returns jsonb language sql stable security invoker set search_path=''
as $$ select lx_registration_private.registration_status(); $$;
revoke all on function public.lx_member_registration_status() from public,anon,authenticated;
grant execute on function public.lx_member_registration_status() to authenticated;

create function public.lx_complete_member_registration(
 p_legal_version text,p_terms_agreed boolean,p_privacy_acknowledged boolean)
returns jsonb language sql security invoker set search_path=''
as $$ select lx_registration_private.complete_registration(p_legal_version,p_terms_agreed,p_privacy_acknowledged); $$;
revoke all on function public.lx_complete_member_registration(text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.lx_complete_member_registration(text,boolean,boolean) to authenticated;

-- Preserve existing profile column grants and RLS; these protected columns were already read-only.
revoke update(registration_completed_at,phone),insert(registration_completed_at,phone)
 on public.profiles from authenticated,anon;
comment on table lx_registration_private.settings is 'REG-01: default locked; enable only after legal documents are reviewed and explicitly authorized.';
notify pgrst,'reload schema';

