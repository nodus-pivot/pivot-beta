-- Stock follows the diagnosis.
--
-- A Replace decision with a catalog part consumes one unit when the ticket
-- enters In repair (the decision was made in Received and checked against
-- stock in Request Part). Edits inside In repair adjust: a new Replace row
-- consumes, an unpicked one returns. Every ticket_parts row carries at most
-- one open movement, so nothing double-counts.

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
       and tp.part_id is not null
       and tp.stock_movement_id is null
  loop
    insert into stock_movements (part_id, qty_delta, reason, ticket_id, unit_cost_at_time, created_by)
    values (r.part_id, -r.qty, 'used_on_ticket', p_ticket, r.unit_cost, auth.uid())
    returning id into v_movement;
    update ticket_parts set stock_movement_id = v_movement, used_at = coalesce(used_at, now()) where id = r.id;
  end loop;
end $$;

-- One row: consume (if not already) — used by In repair when a Replace is added.
create or replace function consume_ticket_part(p_row uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_movement uuid;
begin
  select tp.id, tp.ticket_id, tp.part_id, tp.qty, tp.stock_movement_id, p.unit_cost
    into r
    from ticket_parts tp
    left join parts p on p.id = tp.part_id
   where tp.id = p_row
   for update;
  if r.id is null then raise exception 'part row not found'; end if;
  if not app.ticket_in_scope(r.ticket_id) or not app.can_act_on('in_repair') then
    raise exception 'not allowed';
  end if;
  if r.part_id is null or r.stock_movement_id is not null then return; end if;
  insert into stock_movements (part_id, qty_delta, reason, ticket_id, unit_cost_at_time, created_by)
  values (r.part_id, -r.qty, 'used_on_ticket', r.ticket_id, r.unit_cost, auth.uid())
  returning id into v_movement;
  update ticket_parts set stock_movement_id = v_movement, used_at = coalesce(used_at, now()) where id = r.id;
end $$;

-- One row: return the unit (if one was taken) — used when a Replace is unpicked.
create or replace function release_ticket_part(p_row uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  select tp.id, tp.ticket_id, tp.part_id, tp.qty, tp.stock_movement_id, m.unit_cost_at_time
    into r
    from ticket_parts tp
    left join stock_movements m on m.id = tp.stock_movement_id
   where tp.id = p_row
   for update;
  if r.id is null then raise exception 'part row not found'; end if;
  if not app.ticket_in_scope(r.ticket_id) or not app.can_act_on('in_repair') then
    raise exception 'not allowed';
  end if;
  if r.stock_movement_id is null then return; end if;
  insert into stock_movements (part_id, qty_delta, reason, ticket_id, unit_cost_at_time, created_by, note)
  values (r.part_id, r.qty, 'returned', r.ticket_id, r.unit_cost_at_time, auth.uid(), 'replace unpicked in repair');
  update ticket_parts set stock_movement_id = null, used_at = null where id = r.id;
end $$;

grant execute on function consume_ticket_part(uuid) to authenticated;
grant execute on function release_ticket_part(uuid) to authenticated;

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

  -- Entering In repair (moving forward) takes the diagnosed replacements out of stock.
  if p_to = 'in_repair' and p_kind = 'stage_changed' then
    perform app.consume_requested_parts(p_ticket);
  end if;
end $$;
