-- Test-only private rider selfie, one current object per owner/workspace/actor.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('rider-test-avatars','rider-test-avatars',false,100000,array['image/jpeg','image/png','image/webp']);
create function lx_rider_private.avatar_access(path text)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(
 auth.uid() is not null and lx_share_private.test_member(auth.uid())
 and array_length(string_to_array(path,'/'),1)=4
 and split_part(path,'/',1)=auth.uid()::text
 and split_part(path,'/',4)='selfie'
 and exists(select 1 from lx_rider_private.workspaces w
 join lx_rider_private.people p on p.workspace_id=w.id
 where w.owner_id=auth.uid() and w.id::text=split_part(path,'/',2)
 and w.enabled and p.key=split_part(path,'/',3) and p.role='rider'),false)
$$;
revoke all on function lx_rider_private.avatar_access(text) from public,anon;
grant execute on function lx_rider_private.avatar_access(text) to authenticated;
create policy rider_avatar_select on storage.objects for select to authenticated
using(bucket_id='rider-test-avatars' and lx_rider_private.avatar_access(name));
create policy rider_avatar_insert on storage.objects for insert to authenticated
with check(bucket_id='rider-test-avatars' and lx_rider_private.avatar_access(name));
create policy rider_avatar_update on storage.objects for update to authenticated
using(bucket_id='rider-test-avatars' and lx_rider_private.avatar_access(name))
with check(bucket_id='rider-test-avatars' and lx_rider_private.avatar_access(name));
create policy rider_avatar_delete on storage.objects for delete to authenticated
using(bucket_id='rider-test-avatars' and lx_rider_private.avatar_access(name));
