-- Uses existing authorized synthetic PNGs via normal gateway; all operations ROLLBACK.
begin;
create temporary table rider_review_results(name text,pass boolean);
do $$
declare w lx_rider_private.workspaces; v lx_rider_private.vehicles; task lx_rider_private.tasks; rev integer; payload jsonb;
begin
 select * into w from lx_rider_private.workspaces x where lx_share_private.test_member(x.owner_id) and exists(select 1 from lx_rider_private.people p where p.workspace_id=x.id and p.key='rider1' and p.application='submitted') limit 1;
 if w.id is null then raise exception 'No submitted authorized synthetic application: positive test NOT RUN'; end if;
 perform lx_rider_private.gateway(w.owner_id,'review_application',jsonb_build_object('actor','dispatch','rider','rider1','decision','approve','revision',w.revision,'command_id',gen_random_uuid()));
 if not exists(select 1 from lx_rider_private.people p where p.workspace_id=w.id and p.key='rider1' and p.application='approved' and p.license_status='approved' and p.cert_valid_until>=current_date+364) then raise exception 'person approval failed'; end if;
 insert into rider_review_results values('application approval with uploaded sample documents',true);
 if not exists(select 1 from lx_rider_private.documents d where d.workspace_id=w.id and d.kind in ('license','certificate') and d.reviewed_at is not null and d.delete_after=d.reviewed_at+interval '30 days') then raise exception 'person retention failed'; end if;
 insert into rider_review_results values('license and certificate 30-day retention',true);
 select * into v from lx_rider_private.vehicles x where x.workspace_id=w.id and x.rider_key='rider1' and x.status='pending' and
 exists(select 1 from lx_rider_private.documents d join storage.objects o on o.bucket_id='rider-test-documents' and o.name=d.path where d.vehicle_id=x.id and d.kind='registration') and
 exists(select 1 from lx_rider_private.documents d join storage.objects o on o.bucket_id='rider-test-documents' and o.name=d.path where d.vehicle_id=x.id and d.kind='owner_authorization') limit 1;
 if v.id is null then raise exception 'No pending vehicle with both uploaded sample documents: test NOT RUN'; end if;
 select revision into rev from lx_rider_private.workspaces where id=w.id;
 perform lx_rider_private.gateway(w.owner_id,'review_vehicle',jsonb_build_object('actor','dispatch','vehicle_id',v.id,'revision',rev,'command_id',gen_random_uuid()));
 if not lx_rider_private.qualified(w.id,'rider1',v.id) then raise exception 'vehicle approval failed'; end if;
 insert into rider_review_results values('vehicle approval with both uploaded documents',true);
 if not exists(select 1 from lx_rider_private.documents d where d.vehicle_id=v.id and d.kind='registration' and d.reviewed_at is not null and d.delete_after=d.reviewed_at+interval '30 days') then raise exception 'registration retention failed'; end if;
 insert into rider_review_results values('registration 30-day retention',true);
 if not exists(select 1 from lx_rider_private.documents d where d.vehicle_id=v.id and d.kind='owner_authorization' and d.reviewed_at is not null and d.delete_after is null) then raise exception 'owner retention failed'; end if;
 insert into rider_review_results values('owner authorization does not inherit 30-day deletion',true);
 select revision into rev from lx_rider_private.workspaces where id=w.id;
 perform lx_rider_private.gateway(w.owner_id,'create_tasks',jsonb_build_object('actor','dispatch','revision',rev,'command_id',gen_random_uuid()));
 select * into task from lx_rider_private.tasks where workspace_id=w.id and status='unassigned' order by created_at desc limit 1;
 select revision into rev from lx_rider_private.workspaces where id=w.id;
 perform lx_rider_private.gateway(w.owner_id,'assign',jsonb_build_object('actor','dispatch','rider','rider1','vehicle_id',v.id,'task_id',task.id,'revision',rev,'command_id',gen_random_uuid()));
 select revision into rev from lx_rider_private.workspaces where id=w.id;
 perform lx_rider_private.gateway(w.owner_id,'accept',jsonb_build_object('actor','rider1','vehicle_id',v.id,'task_id',task.id,'revision',rev,'command_id',gen_random_uuid()));
 select revision into rev from lx_rider_private.workspaces where id=w.id;
 perform lx_rider_private.gateway(w.owner_id,'pickup',jsonb_build_object('actor','rider1','task_id',task.id,'bag_code',task.bag_code,'sealed',true,'revision',rev,'command_id',gen_random_uuid()));
 select revision into rev from lx_rider_private.workspaces where id=w.id;
 perform lx_rider_private.gateway(w.owner_id,'handover',jsonb_build_object('actor','rider1','task_id',task.id,'revision',rev,'command_id',gen_random_uuid()));
 select revision into rev from lx_rider_private.workspaces where id=w.id;
 perform lx_rider_private.gateway(w.owner_id,'receive',jsonb_build_object('actor','receiver','task_id',task.id,'bag_code',task.bag_code,'revision',rev,'command_id',gen_random_uuid()));
 if not exists(select 1 from lx_rider_private.tasks where id=task.id and status='delivered' and receipt_code is not null) then raise exception 'handover failed'; end if;
 insert into rider_review_results values('approved rider dispatch through dual handover',true);
end $$;
select jsonb_build_object('passed',count(*),'results',jsonb_agg(name),'scope','SQL gateway with existing uploaded synthetic files; not Google Session or mobile acceptance; full rollback') verification from rider_review_results;
rollback;