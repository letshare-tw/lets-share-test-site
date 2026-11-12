create function public.lx_rider_test_proof_cleanup(p_actor uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(d.name),'[]') from (
 select o.name from storage.objects o where lx_share_private.test_member(p_actor) and o.bucket_id='rider-test-proofs'
 and split_part(o.name,'/',1)=p_actor::text and o.created_at<now()-interval '24 hours'
 and not exists(select 1 from lx_rider_private.tasks t where t.pickup_photo_path=o.name or t.delivery_photo_path=o.name) limit 50) d;
$$;
revoke all on function public.lx_rider_test_proof_cleanup(uuid) from public,anon,authenticated;
grant execute on function public.lx_rider_test_proof_cleanup(uuid) to service_role;
