-- FOR UPDATE cannot lock the nullable side of an outer join; lock ticket_parts only.

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
   for update of tp;
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
   for update of tp;
  if r.id is null then raise exception 'part row not found'; end if;
  if not app.ticket_in_scope(r.ticket_id) or not app.can_act_on('in_repair') then
    raise exception 'not allowed';
  end if;
  if r.stock_movement_id is null then return; end if;
  insert into stock_movements (part_id, qty_delta, reason, ticket_id, unit_cost_at_time, created_by, note)
  values (r.part_id, r.qty, 'returned', r.ticket_id, r.unit_cost_at_time, auth.uid(), 'replace unpicked in repair');
  update ticket_parts set stock_movement_id = null, used_at = null where id = r.id;
end $$;

