-- Database transaction tests with synthetic fixture qualification. ROLLBACK: no persistent fixtures.
-- This is NOT a real Google Session, image-upload, or two-work-account role test.
begin;
create temporary table rider_results(name text,pass boolean);
create function pg_temp.check_rider(name text,passed boolean) returns void language plpgsql as $$begin
 if not coalesce(passed,false) then raise exception 'FAIL: %',name; end if;
 insert into rider_results values(name,true);
end $$;
create function pg_temp.cmd(uid uuid,actor text,action text,args jsonb default '{}',cid uuid default null) returns jsonb language plpgsql as $$
declare rev integer;begin
 select revision into rev from lx_rider_private.workspaces where owner_id=uid;
 return lx_rider_private.gateway(uid,action,args||jsonb_build_object('actor',actor,'revision',rev,'command_id',coalesce(cid,gen_random_uuid())));
end $$;
create function pg_temp.denied(uid uuid,actor text,action text,args jsonb,expected text) returns boolean language plpgsql as $$begin
 perform pg_temp.cmd(uid,actor,action,args);return false;
 exception when others then return sqlerrm=expected;
end $$;
do $$
declare u uuid; b uuid; w uuid; v1 uuid; v2 uuid; vb uuid; task uuid; cid uuid; req jsonb; r jsonb; before_count bigint; after_count bigint; rev int; doc uuid;
begin
 select id into u from auth.users where lx_share_private.test_member(id) order by id limit 1;
 select id into b from auth.users where lx_share_private.test_member(id) order by id offset 1 limit 1;
 if u is null or b is null then raise exception 'test identities missing'; end if;
 select count(*) into before_count from public.lx_share_bags;
 perform lx_rider_private.gateway(u,'initialize','{}');perform lx_rider_private.gateway(b,'initialize','{}');
 select id into w from lx_rider_private.workspaces where owner_id=u;
 perform pg_temp.check_rider('non-whitelist denied',pg_temp.denied(gen_random_uuid(),'rider1','create_tasks','{}','RIDER_MEMBER_DENIED'));
 perform pg_temp.check_rider('formal mode locked',pg_temp.denied(u,'dispatch','operate_live','{}','RIDER_FORMAL_LOCKED'));
 perform pg_temp.check_rider('rider cannot dispatch',pg_temp.denied(u,'rider1','create_tasks','{}','RIDER_ROLE_DENIED'));
 perform pg_temp.check_rider('receiver cannot approve',pg_temp.denied(u,'receiver','review_application','{"rider":"rider1","decision":"approve"}','RIDER_ROLE_DENIED'));
 perform pg_temp.check_rider('missing images block application',pg_temp.denied(u,'rider1','submit_application',jsonb_build_object('simulation_confirmed',true,'cert_issued_on',current_date),'RIDER_DOCUMENT_REQUIRED'));
 perform pg_temp.check_rider('old certificate denied',pg_temp.denied(u,'rider1','submit_application',jsonb_build_object('simulation_confirmed',true,'cert_issued_on',current_date-31),'RIDER_CERT_DATE_INVALID'));
 perform pg_temp.check_rider('future certificate denied',pg_temp.denied(u,'rider1','submit_application',jsonb_build_object('simulation_confirmed',true,'cert_issued_on',current_date+1),'RIDER_CERT_DATE_INVALID'));
 r:=pg_temp.cmd(u,'rider1','add_vehicle');v1:=(r->>'vehicle_id')::uuid;
 r:=pg_temp.cmd(u,'rider1','add_vehicle');v2:=(r->>'vehicle_id')::uuid;
 r:=pg_temp.cmd(u,'rider2','add_vehicle');vb:=(r->>'vehicle_id')::uuid;
 perform pg_temp.check_rider('vehicle approval requires both documents',pg_temp.denied(u,'dispatch','review_vehicle',jsonb_build_object('vehicle_id',v1),'RIDER_DOCUMENT_REQUIRED'));
 perform pg_temp.check_rider('other workspace vehicle denied',pg_temp.denied(b,'dispatch','review_vehicle',jsonb_build_object('vehicle_id',v1),'RIDER_VEHICLE_DENIED'));
 -- Fixture-approved virtual people/vehicles. No real user role is granted or modified.
 update lx_rider_private.people set application='approved',license_status='approved',simulation_confirmed=true,cert_valid_until=current_date+365 where workspace_id=w and role='rider';
 update lx_rider_private.vehicles set status='approved',owner_authorized=true where workspace_id=w and id in(v1,vb);
 perform pg_temp.check_rider('pending second bike does not disable first',lx_rider_private.qualified(w,'rider1',v1) and not lx_rider_private.qualified(w,'rider1',v2));
 perform pg_temp.cmd(u,'dispatch','create_tasks'); select id into task from lx_rider_private.tasks where workspace_id=w order by created_at desc limit 1;
 perform pg_temp.check_rider('unapproved vehicle cannot assign',pg_temp.denied(u,'dispatch','assign',jsonb_build_object('task_id',task,'rider','rider1','vehicle_id',v2),'RIDER_ASSIGN_DENIED'));
 perform pg_temp.cmd(u,'dispatch','assign',jsonb_build_object('task_id',task,'rider','rider1','vehicle_id',v1));
 perform pg_temp.check_rider('cross-workspace task denied',pg_temp.denied(b,'dispatch','cancel',jsonb_build_object('task_id',task),'RIDER_TASK_DENIED'));
 perform pg_temp.check_rider('other rider cannot take task',pg_temp.denied(u,'rider2','accept',jsonb_build_object('task_id',task,'vehicle_id',vb),'RIDER_TASK_DENIED'));
 perform pg_temp.check_rider('other rider snapshot hides assigned task',not exists(select 1 from jsonb_array_elements(lx_rider_private.snapshot(w,'rider2')->'tasks') x where x->>'id'=task::text));
 perform pg_temp.check_rider('receiver hides pre-handover tasks',jsonb_array_length(lx_rider_private.snapshot(w,'receiver')->'tasks')=0);
 select revision into rev from lx_rider_private.workspaces where id=w;
 cid:=gen_random_uuid();req:=jsonb_build_object('actor','rider1','task_id',task,'vehicle_id',v1,'revision',rev,'command_id',cid);
 r:=lx_rider_private.gateway(u,'accept',req);
 perform pg_temp.check_rider('same command replay is idempotent',lx_rider_private.gateway(u,'accept',req)=r);
 perform pg_temp.check_rider('single accept event after replay',(select count(*)=1 from lx_rider_private.events where workspace_id=w and action='accept' and target_id=task));
 begin
 perform lx_rider_private.gateway(u,'accept',req||'{"sealed":true}'::jsonb);raise exception 'FAIL reused command';
 exception when others then if sqlerrm<>'RIDER_COMMAND_REUSED' then raise; end if;
 end;
 perform pg_temp.check_rider('same command different payload rejected',true);
 begin
 perform lx_rider_private.gateway(u,'pickup',req||jsonb_build_object('command_id',gen_random_uuid()));raise exception 'FAIL stale command';
 exception when others then if sqlerrm<>'RIDER_STALE_STATE' then raise; end if;
 end;
 perform pg_temp.check_rider('stale revision rejected',true);
 perform pg_temp.check_rider('incorrect bag denied',pg_temp.denied(u,'rider1','pickup',jsonb_build_object('task_id',task,'bag_code','WRONG','sealed',true),'RIDER_BAG_CHECK_REQUIRED'));
 perform pg_temp.cmd(u,'dispatch','revoke_vehicle',jsonb_build_object('vehicle_id',v1));
 perform pg_temp.check_rider('revoked bike blocks pickup',pg_temp.denied(u,'rider1','pickup',jsonb_build_object('task_id',task,'bag_code','TEST-0001','sealed',true),'RIDER_QUALIFICATION_DENIED'));
 perform pg_temp.check_rider('revoking one bike leaves another rider bike eligible',lx_rider_private.qualified(w,'rider2',vb));
 perform pg_temp.cmd(u,'rider1','exception',jsonb_build_object('task_id',task,'code','safety','note','synthetic test'));
 perform pg_temp.cmd(u,'dispatch','reassign',jsonb_build_object('task_id',task,'rider','rider2','vehicle_id',vb));
 perform pg_temp.cmd(u,'rider2','accept',jsonb_build_object('task_id',task,'vehicle_id',vb));
 perform pg_temp.cmd(u,'rider2','pickup',jsonb_build_object('task_id',task,'bag_code','TEST-0001','sealed',true));
 perform pg_temp.cmd(u,'rider2','renew_application');
 perform pg_temp.check_rider('renewal preserves still-valid qualification',lx_rider_private.qualified(w,'rider2',vb));
 perform pg_temp.cmd(u,'dispatch','expire_certificate','{"rider":"rider2"}');
 perform pg_temp.check_rider('expiry disables new work',not lx_rider_private.qualified(w,'rider2',vb));
 perform pg_temp.check_rider('cannot cancel in-custody bag',pg_temp.denied(u,'dispatch','cancel',jsonb_build_object('task_id',task),'RIDER_CANCEL_DENIED'));
 perform pg_temp.check_rider('cannot silently reassign in-custody bag',pg_temp.denied(u,'dispatch','reassign',jsonb_build_object('task_id',task,'rider','rider1','vehicle_id',v1),'RIDER_REASSIGN_DENIED'));
 perform pg_temp.cmd(u,'rider2','exception',jsonb_build_object('task_id',task,'code','cannot_deliver'));
 perform pg_temp.cmd(u,'dispatch','resolve',jsonb_build_object('task_id',task));
 perform pg_temp.cmd(u,'rider2','handover',jsonb_build_object('task_id',task));
 perform pg_temp.check_rider('rider handover alone is not complete',(select status='handover_pending' and received_at is null from lx_rider_private.tasks where id=task));
 perform pg_temp.check_rider('rider cannot sign for receiver',pg_temp.denied(u,'rider2','receive',jsonb_build_object('task_id',task,'bag_code','TEST-0001'),'RIDER_RECEIVE_DENIED'));
 perform pg_temp.check_rider('wrong receiver bag denied',pg_temp.denied(u,'receiver','receive',jsonb_build_object('task_id',task,'bag_code','WRONG'),'RIDER_RECEIVE_DENIED'));
 perform pg_temp.cmd(u,'receiver','receive',jsonb_build_object('task_id',task,'bag_code','TEST-0001'));
 perform pg_temp.check_rider('expired rider can finish safety handover',(select status='delivered' and received_at is not null and rider_handover_at is not null and fee_status='rate_not_set' from lx_rider_private.tasks where id=task));
 perform pg_temp.check_rider('completed state cannot be replayed as new operation',pg_temp.denied(u,'receiver','receive',jsonb_build_object('task_id',task,'bag_code','TEST-0001'),'RIDER_RECEIVE_DENIED'));
 select count(*) into after_count from public.lx_share_bags;
 perform pg_temp.check_rider('live share bags untouched',before_count=after_count);
 -- Metadata-only retention fixtures: no Storage objects are inserted or deleted through SQL.
 insert into lx_rider_private.documents(workspace_id,rider_key,kind,path,reviewed_at,delete_after)
 values(w,'rider1','license',w::text||'/rider1/expired-test.png',now()-interval '31 days',now()-interval '1 day') returning id into doc;
 perform pg_temp.check_rider('expired document cannot issue link',pg_temp.denied(u,'rider1','document_link',jsonb_build_object('document_id',doc),'RIDER_DOCUMENT_DENIED'));
 perform pg_temp.check_rider('another workspace cannot read document',pg_temp.denied(b,'dispatch','document_link',jsonb_build_object('document_id',doc),'RIDER_DOCUMENT_DENIED'));
 perform pg_temp.check_rider('expired document appears in own cleanup queue',jsonb_array_length(lx_rider_private.cleanup(u))=1);
 perform pg_temp.check_rider('another workspace cleanup does not include target',jsonb_array_length(lx_rider_private.cleanup(b))=0);
 update lx_rider_private.documents set legal_hold=true where id=doc;
 perform pg_temp.check_rider('legal hold removes document from cleanup',jsonb_array_length(lx_rider_private.cleanup(u))=0);
 update lx_rider_private.documents set legal_hold=false where id=doc;
 perform lx_rider_private.cleanup(u,jsonb_build_array(w::text||'/rider1/expired-test.png'));
 perform pg_temp.check_rider('cleanup mark recorded after absent object',(select deleted_at is not null from lx_rider_private.documents where id=doc));
 perform pg_temp.check_rider('reviewed or expired sample cannot be uploaded again',not public.lx_rider_test_sample_upload_allowed(u,w::text||'/rider1/expired-test.png'));
 perform pg_temp.check_rider('no formal workspace enabled',not exists(select 1 from lx_rider_private.workspaces where formal_enabled));
 perform pg_temp.check_rider('anonymous and authenticated cannot execute service gateway',not has_function_privilege('anon','public.lx_rider_test_gateway(uuid,text,jsonb)','execute') and not has_function_privilege('authenticated','public.lx_rider_test_gateway(uuid,text,jsonb)','execute'));
 perform pg_temp.check_rider('no client access to private workspaces',not has_table_privilege('authenticated','lx_rider_private.workspaces','select'));
end $$;
select jsonb_build_object('suite','RIDER-TEST-01 database transaction','passed',count(*),'failed',0,'results',jsonb_agg(name order by name),'limitation','Fixture-approved virtual riders; not Google Session, Storage upload, concurrent-connection or mobile acceptance') verification from rider_results;
rollback;
