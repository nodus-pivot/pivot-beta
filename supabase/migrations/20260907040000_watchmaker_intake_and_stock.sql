-- Watchmakers log watches in, work the parts stage, and record stock.
--
-- Wes's requirements and the old app never kept the watchmaker out of
-- intake; the handoff design did. Reverting that: Intake and Request Part
-- are owned by brand reps AND watchmakers. Stock writes (intake, reorders,
-- adjustments) move behind definer functions that check "admin of the
-- workspace, or a watchmaker whose brand the part fits", fill in the unit
-- cost from the part (watchmakers never see it), and keep every other rule.

create or replace function app.can_act_on(p_stage stage, p_workspace uuid, p_brand uuid) returns boolean
language sql stable as $$
  select app.is_admin_of(p_workspace)
      or (p_brand = any(app.bench_brand_ids()) and p_stage in ('intake', 'received', 'request_part', 'in_repair', 'testing', 'shipped_back'))
      or (p_brand = any(app.rep_brand_ids()) and p_stage in ('intake', 'send_return_label', 'request_part'))
$$;

drop policy tickets_insert on tickets;
create policy tickets_insert on tickets for insert to authenticated
  with check (app.is_admin_of(workspace_id) or brand_id = any(app.rep_brand_ids()) or brand_id = any(app.bench_brand_ids()));

-- May the caller record stock for this part? Admins of its workspace, or a
-- watchmaker for whom the part is visible (it fits one of their brands' watches).
create or replace function app.can_record_stock(p_part uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from parts p where p.id = p_part
      and (app.is_admin_of(p.workspace_id)
        or (array_length(app.bench_brand_ids(), 1) > 0 and app.part_visible(p.id)))
  )
$$;

create or replace function record_stock_intake(p_part uuid, p_qty int, p_unit_cost numeric default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_cost numeric;
begin
  if not app.can_record_stock(p_part) then raise exception 'not allowed'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'quantity must be positive'; end if;
  select unit_cost into v_cost from parts where id = p_part;
  insert into stock_movements (part_id, qty_delta, reason, unit_cost_at_time, note, created_by)
  values (p_part, p_qty, 'intake', coalesce(p_unit_cost, v_cost), p_note, auth.uid());
end $$;

create or replace function record_stock_adjustment(p_part uuid, p_delta int, p_note text, p_ticket uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_cost numeric; v_ws uuid;
begin
  if not app.can_record_stock(p_part) then raise exception 'not allowed'; end if;
  if p_delta is null or p_delta = 0 then raise exception 'change must be non-zero'; end if;
  if p_note is null or length(trim(p_note)) < 3 then raise exception 'a reason is required'; end if;
  select unit_cost, workspace_id into v_cost, v_ws from parts where id = p_part;
  if p_ticket is not null and not exists (select 1 from tickets t where t.id = p_ticket and t.workspace_id = v_ws and app.ticket_in_scope(t.id)) then
    raise exception 'ticket not in this workspace';
  end if;
  insert into stock_movements (part_id, qty_delta, reason, ticket_id, unit_cost_at_time, note, created_by)
  values (p_part, p_delta, 'adjustment', p_ticket, v_cost, p_note, auth.uid());
end $$;

create or replace function record_part_order(p_part uuid, p_qty int, p_expected date default null, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not app.can_record_stock(p_part) then raise exception 'not allowed'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'quantity must be positive'; end if;
  insert into part_orders (part_id, qty, expected_at, note, created_by)
  values (p_part, p_qty, p_expected, p_note, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function cancel_part_order(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_part uuid; v_received timestamptz;
begin
  select part_id, received_at into v_part, v_received from part_orders where id = p_order;
  if v_part is null then raise exception 'order not found'; end if;
  if v_received is not null then raise exception 'order already received'; end if;
  if not app.can_record_stock(v_part) then raise exception 'not allowed'; end if;
  delete from part_orders where id = p_order;
end $$;

-- Receiving already exists; widen its check the same way.
create or replace function receive_part_order(p_order uuid, p_qty int, p_unit_cost numeric default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_movement uuid;
begin
  select o.id, o.part_id, o.received_at, p.workspace_id, p.unit_cost into r
    from part_orders o join parts p on p.id = o.part_id where o.id = p_order for update of o;
  if r.id is null then raise exception 'order not found'; end if;
  if not app.can_record_stock(r.part_id) then raise exception 'not allowed'; end if;
  if r.received_at is not null then raise exception 'order already received'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'quantity must be positive'; end if;
  insert into stock_movements (part_id, qty_delta, reason, unit_cost_at_time, note, created_by)
  values (r.part_id, p_qty, 'intake', coalesce(p_unit_cost, r.unit_cost), p_note, auth.uid())
  returning id into v_movement;
  update part_orders set received_at = now(), stock_movement_id = v_movement, qty = p_qty where id = r.id;
end $$;

grant execute on function record_stock_intake(uuid, int, numeric, text) to authenticated;
grant execute on function record_stock_adjustment(uuid, int, text, uuid) to authenticated;
grant execute on function record_part_order(uuid, int, date, text) to authenticated;
grant execute on function cancel_part_order(uuid) to authenticated;
grant execute on function app.can_record_stock(uuid) to authenticated;
