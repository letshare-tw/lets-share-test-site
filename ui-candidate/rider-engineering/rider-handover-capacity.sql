-- RIDER-HANDOVER-CAPACITY-01: only acceptance/claim capacity predicates change.
do $migration$
declare definition text; old_predicate text := $old$x.status in ('accepted','picked_up','handover_pending','exception')$old$;
new_predicate text := $new$(x.status in ('accepted','picked_up') or (x.status='exception' and x.rider_handover_at is null))$new$;
begin
 definition:=pg_get_functiondef('lx_rider_private.gateway(uuid,text,jsonb)'::regprocedure);
 if (length(definition)-length(replace(definition,old_predicate,'')))/length(old_predicate)<>2 then
  raise exception 'Expected exactly two legacy capacity predicates; review gateway before retrying';
 end if;
 execute replace(definition,old_predicate,new_predicate);
end $migration$;
