-- Stock leaves the ledger when the brand hands a ticket back to the bench.
--
-- "All sent → In repair" is the moment the parts physically left Nodus, so
-- that transition writes one used_on_ticket movement per requested catalog
-- part. It runs inside set_stage() (security definer) so it is atomic with
-- the stage change and works for whichever role owns Request Part.

create or replace function app.consume_requested_parts(p_ticket uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_movement uuid;
begin
  for r in
    select tp.id, tp.part_id, tp.qty, p.unit_cost
      from ticket_parts tp
      join parts p on p.id = tp.part_id
     where tp.ticket_id = p_ticket
       and tp.source = 'brand'
       and tp.part_id is not null
       and tp.stock_movement_id is null
  loop
    insert into stock_movements (part_id, qty_delta, reason, ticket_id, unit_cost_at_time, created_by)
    values (r.part_id, -r.qty, 'used_on_ticket', p_ticket, r.unit_cost, auth.uid())
    returning id into v_movement;
    update ticket_parts set stock_movement_id = v_movement where id = r.id;
  end loop;
end $$;

create or replace function set_stage(p_ticket uuid, p_to stage, p_kind text default 'stage_changed')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_from stage;
  v_workspace uuid;
  v_brand uuid;
begin
  select stage, workspace_id, brand_id into v_from, v_workspace, v_brand
  from tickets where id = p_ticket for update;
  if v_from is null then
    raise exception 'ticket not found';
  end if;
  if not app.in_scope(v_workspace, v_brand) then
    raise exception 'ticket not in your scope';
  end if;
  if not app.can_act_on(v_from) then
    raise exception 'your role does not own the % stage', v_from;
  end if;
  if p_kind not in ('stage_changed', 'sent_back', 'reopened') then
    raise exception 'unknown event kind %', p_kind;
  end if;

  update tickets
     set stage = p_to,
         closed_at = case when p_to = 'closed' then now() else null end
   where id = p_ticket;

  insert into ticket_events (ticket_id, type, actor_id, from_stage, to_stage)
  values (p_ticket, p_kind, auth.uid(), v_from, p_to);

  if v_from = 'request_part' and p_to = 'in_repair' and p_kind = 'stage_changed' then
    perform app.consume_requested_parts(p_ticket);
  end if;
end $$;

-- The ledger outlives its ticket: deleting a ticket (admin-only) leaves the
-- movement in place with no ticket reference rather than failing.
alter table stock_movements drop constraint if exists stock_movements_check1;
alter table stock_movements drop constraint if exists stock_movements_ticket_id_fkey;
alter table stock_movements
  add constraint stock_movements_ticket_id_fkey
  foreign key (ticket_id) references tickets(id) on delete set null;
