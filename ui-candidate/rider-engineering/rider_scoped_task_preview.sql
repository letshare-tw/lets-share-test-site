do $migration$ declare def text; old text:=$old$if p_action in ('bootstrap','initialize') then return lx_rider_private.snapshot(s.id,a); end if;$old$; replacement text:=$new$if p_action in ('bootstrap','initialize') then
 result:=lx_rider_private.snapshot(s.id,a);
 if p_action='bootstrap' and p_payload ? 'task_id' then
  if p.role<>'rider' or not exists(select 1 from lx_rider_private.vehicles x where x.workspace_id=s.id and x.rider_key=a and lx_rider_private.qualified(s.id,a,x.id)) then raise exception 'RIDER_QUALIFICATION_DENIED'; end if;
  tid:=nullif(p_payload->>'task_id','')::uuid;
  select * into t from lx_rider_private.tasks x where x.id=tid and x.workspace_id=s.id and (x.status='unassigned' or (x.rider_key=a and x.status in ('offered','accepted','picked_up')));
  if t.id is null then raise exception 'RIDER_TASK_DENIED'; end if;
  result:=result||jsonb_build_object('task_preview',jsonb_build_object('id',t.id,'bag_code',t.bag_code,'pickup_label',t.pickup_label,'delivery_label',t.delivery_label,'pickup_lat',t.pickup_lat,'pickup_lng',t.pickup_lng,'delivery_lat',t.delivery_lat,'delivery_lng',t.delivery_lng));
 end if;
 return result;
 end if;$new$; begin select pg_get_functiondef('lx_rider_private.gateway(uuid,text,jsonb)'::regprocedure) into def; if (length(def)-length(replace(def,old,'')))/length(old)<>1 then raise exception 'Unexpected gateway bootstrap; review required';end if; execute replace(def,old,replacement);end $migration$;
