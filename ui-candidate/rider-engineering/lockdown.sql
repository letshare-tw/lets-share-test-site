-- Reversible emergency closure of synthetic rider testing. Do not run as part of normal deployment.
begin;
update lx_rider_private.workspaces set enabled=false;
revoke execute on function public.lx_rider_test_gateway(uuid,text,jsonb) from service_role;
revoke execute on function public.lx_rider_test_cleanup(uuid,jsonb) from service_role;
revoke execute on function public.lx_rider_test_sample_upload_allowed(uuid,text) from service_role;
commit;
