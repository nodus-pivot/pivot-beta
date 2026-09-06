-- Roles become scoped grants, and the holes from the schema review close.
--
-- A person holds any number of memberships: owner (global), admin (one
-- workspace), brand_rep / watchmaker (one brand). Permissions are the union.
-- profiles keeps identity only. Every scope helper is rebuilt on memberships,
-- and can_act_on() becomes ticket-aware ("holds watchmaker on THIS brand").
--
-- Also in this migration, from the review:
--   * deactivated users can no longer reactivate themselves
--   * the stale bench insert policy on the stock ledger is dropped; the ledger
--     link on ticket_parts is locked to the definer functions
--   * catalog reads are brand-scoped, not workspace-wide
--   * profile reads are limited to people who share a workspace
--   * receive_part_order(), part_demand(), cross-workspace integrity triggers
--   * "View as": owners/admins may narrow their grants per request via headers

-- ================================================================ memberships
create type member_role as enum ('owner', 'admin', 'brand_rep', 'watchmaker');

create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role member_role not null,
  workspace_id uuid references workspaces(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  constraint memberships_scope check (
    (role = 'owner' and workspace_id is null and brand_id is null)
    or (role = 'admin' and workspace_id is not null and brand_id is null)
    or (role in ('brand_rep', 'watchmaker') and brand_id is not null and workspace_id is null)
  ),
  constraint memberships_unique unique nulls not distinct (user_id, role, workspace_id, brand_id)
);
create index memberships_user on memberships (user_id);
create index memberships_brand on memberships (brand_id) where brand_id is not null;
create index memberships_workspace on memberships (workspace_id) where workspace_id is not null;

-- Backfill: every workspace_admin so far is an owner (the dev admin); brand
-- grants keep their role.
insert into memberships (user_id, role)
  select id, 'owner' from profiles where role = 'workspace_admin';
insert into memberships (user_id, role, brand_id)
  select ub.user_id, p.role::text::member_role, ub.brand_id
  from user_brands ub join profiles p on p.id = ub.user_id
  where p.role in ('watchmaker', 'brand_rep');

-- ================================================================ helpers
-- The caller's grants, possibly narrowed by "View as" headers. Owners and
-- admins may preview as a lesser role; the headers can only narrow, never widen.
--   x-pivot-view-as:    brand_rep | watchmaker | admin
--   x-pivot-view-brand: brand uuid (for brand_rep / watchmaker)
--   x-pivot-view-workspace: workspace uuid (for admin)
create or replace function app.effective_memberships()
returns table (role member_role, workspace_id uuid, brand_id uuid)
language plpgsql stable security definer set search_path = public as $$
declare
  hdr json;
  v_as text;
  v_brand uuid;
  v_ws uuid;
  v_active boolean;
begin
  select is_active into v_active from profiles where id = auth.uid();
  if not coalesce(v_active, false) then return; end if;

  begin
    hdr := current_setting('request.headers', true)::json;
  exception when others then
    hdr := null;
  end;
  v_as := hdr ->> 'x-pivot-view-as';

  if v_as is null then
    return query select m.role, m.workspace_id, m.brand_id from memberships m where m.user_id = auth.uid();
    return;
  end if;

  -- Narrowing: only an owner, or an admin of the target workspace, may preview.
  v_brand := nullif(hdr ->> 'x-pivot-view-brand', '')::uuid;
  v_ws := nullif(hdr ->> 'x-pivot-view-workspace', '')::uuid;
  if v_as in ('brand_rep', 'watchmaker') and v_brand is not null then
    select b.workspace_id into v_ws from brands b where b.id = v_brand;
    if exists (select 1 from memberships m where m.user_id = auth.uid()
                and (m.role = 'owner' or (m.role = 'admin' and m.workspace_id = v_ws))) then
      return query select v_as::member_role, null::uuid, v_brand;
    end if;
    return;
  end if;
  if v_as = 'admin' and v_ws is not null then
    if exists (select 1 from memberships m where m.user_id = auth.uid()
                and (m.role = 'owner' or (m.role = 'admin' and m.workspace_id = v_ws))) then
      return query select 'admin'::member_role, v_ws, null::uuid;
    end if;
    return;
  end if;
  -- Malformed preview: no grants at all (fail closed).
  return;
end $$;

create or replace function app.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app.effective_memberships() m where m.role = 'owner')
$$;

-- Workspaces the caller administers: every workspace for owners, else admin grants.
create or replace function app.workspace_ids() returns uuid[]
language sql stable security definer set search_path = public as $$
  select case
    when app.is_owner() then (select coalesce(array_agg(id), '{}') from workspaces)
    else (select coalesce(array_agg(m.workspace_id), '{}') from app.effective_memberships() m where m.role = 'admin')
  end
$$;

create or replace function app.rep_brand_ids() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(m.brand_id), '{}') from app.effective_memberships() m where m.role = 'brand_rep'
$$;

create or replace function app.bench_brand_ids() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(m.brand_id), '{}') from app.effective_memberships() m where m.role = 'watchmaker'
$$;

-- Brands held at brand level (either role).
create or replace function app.brand_ids() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(m.brand_id), '{}') from app.effective_memberships() m where m.brand_id is not null
$$;

create or replace function app.visible_workspace_ids() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct w), '{}') from (
    select unnest(app.workspace_ids()) as w
    union
    select b.workspace_id from brands b where b.id = any(app.brand_ids())
  ) s
$$;

create or replace function app.is_admin_of(p_workspace uuid) returns boolean
language sql stable as $$
  select p_workspace = any(app.workspace_ids())
$$;

create or replace function app.in_scope(p_workspace uuid, p_brand uuid) returns boolean
language sql stable as $$
  select p_workspace = any(app.workspace_ids()) or p_brand = any(app.brand_ids())
$$;

-- ticket_in_scope keeps its definition (it calls in_scope).

-- Stage ownership, scoped to the ticket's workspace and brand.
drop function if exists app.can_act_on(stage);
create or replace function app.can_act_on(p_stage stage, p_workspace uuid, p_brand uuid) returns boolean
language sql stable as $$
  select app.is_admin_of(p_workspace)
      or (p_brand = any(app.bench_brand_ids()) and p_stage in ('received', 'in_repair', 'testing', 'shipped_back'))
      or (p_brand = any(app.rep_brand_ids()) and p_stage in ('intake', 'send_return_label', 'request_part'))
$$;

-- Brand-aware catalog visibility.
create or replace function app.watch_visible(p_watch uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from watches w where w.id = p_watch
      and (app.is_admin_of(w.workspace_id)
        or exists (select 1 from watch_brands wb where wb.watch_id = w.id and wb.brand_id = any(app.brand_ids())))
  )
$$;

create or replace function app.part_visible(p_part uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from parts p where p.id = p_part
      and (app.is_admin_of(p.workspace_id)
        or exists (select 1 from watch_parts wp join watch_brands wb on wb.watch_id = wp.watch_id
                    where wp.part_id = p.id and wb.brand_id = any(app.brand_ids())))
  )
$$;

-- People who share one of my visible workspaces (through any grant).
create or replace function app.user_in_scope(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_user = auth.uid() or exists (
    select 1 from memberships m
    left join brands b on b.id = m.brand_id
    where m.user_id = p_user
      and (m.role = 'owner'
        or m.workspace_id = any(app.visible_workspace_ids())
        or b.workspace_id = any(app.visible_workspace_ids()))
  )
$$;

-- May the caller grant / revoke this membership? Owners: anything. Admins:
-- brand-level roles for brands in their workspaces.
create or replace function app.membership_manageable(p_role member_role, p_workspace uuid, p_brand uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select app.is_owner()
      or (p_role in ('brand_rep', 'watchmaker')
          and exists (select 1 from brands b where b.id = p_brand and app.is_admin_of(b.workspace_id)))
$$;

-- May the caller manage this person (name, active, password)? Owners: anyone
-- in scope. Admins: people whose only grants are brand-level in their workspaces.
create or replace function app.can_manage_user(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_user <> auth.uid() and app.user_in_scope(p_user) and (
    app.is_owner()
    or not exists (
      select 1 from memberships m left join brands b on b.id = m.brand_id
      where m.user_id = p_user and not app.membership_manageable(m.role, m.workspace_id, m.brand_id)
    )
  )
$$;

-- ================================================================ profiles
drop policy profiles_read on profiles;
drop policy profiles_update_self on profiles;
drop policy user_workspaces_read on user_workspaces;
drop policy user_brands_read on user_brands;

create policy profiles_read on profiles for select to authenticated
  using (app.user_in_scope(id));
-- Self may edit display_name only (column revoke below); managers go through the function.
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

alter table profiles drop column role;
drop table user_workspaces;
drop table user_brands;

create or replace function admin_update_profile(p_user uuid, p_display_name text, p_is_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not app.can_manage_user(p_user) then raise exception 'not allowed'; end if;
  update profiles set display_name = coalesce(p_display_name, display_name), is_active = coalesce(p_is_active, is_active)
   where id = p_user;
end $$;
grant execute on function admin_update_profile(uuid, text, boolean) to authenticated;

alter table memberships enable row level security;
create policy memberships_read on memberships for select to authenticated
  using (user_id = auth.uid() or app.user_in_scope(user_id));
create policy memberships_insert on memberships for insert to authenticated
  with check (app.membership_manageable(role, workspace_id, brand_id) and created_by = auth.uid());
create policy memberships_delete on memberships for delete to authenticated
  using (app.membership_manageable(role, workspace_id, brand_id) and user_id <> auth.uid());
-- no update policy: change a grant by delete + insert

-- ================================================================ workspaces & brands
drop policy workspaces_create on workspaces;
create policy workspaces_create on workspaces for insert to authenticated
  with check (app.is_owner());

-- ================================================================ catalog: brand-scoped reads
drop policy watches_read on watches;
create policy watches_read on watches for select to authenticated
  using (app.watch_visible(id));

drop policy watch_brands_read on watch_brands;
create policy watch_brands_read on watch_brands for select to authenticated
  using (app.watch_visible(watch_id)
     and (exists (select 1 from watches w where w.id = watch_id and app.is_admin_of(w.workspace_id))
          or brand_id = any(app.brand_ids())));

drop policy watch_parts_read on watch_parts;
create policy watch_parts_read on watch_parts for select to authenticated
  using (app.watch_visible(watch_id));

drop view if exists parts_for_bench;
create view parts_for_bench with (security_barrier) as
  select p.id, p.workspace_id, p.sku, p.name, p.component, p.reorder_at, p.is_active
  from parts p
  where app.part_visible(p.id);
grant select on parts_for_bench to authenticated;

drop view if exists parts_stock;
create view parts_stock with (security_barrier) as
  select part_id, sum(qty_delta)::int as stock_qty
  from stock_movements
  where app.part_visible(part_id)
  group by part_id;
grant select on parts_stock to authenticated;

-- Ledger history without cost, for Supply as seen by non-owners.
create view stock_movements_for_bench with (security_barrier) as
  select id, part_id, qty_delta, reason,
         case when ticket_id is not null and app.ticket_in_scope(ticket_id) then ticket_id end as ticket_id,
         note, created_by, created_at
  from stock_movements
  where app.part_visible(part_id);
grant select on stock_movements_for_bench to authenticated;

drop policy part_orders_read on part_orders;
create policy part_orders_read on part_orders for select to authenticated
  using (app.part_visible(part_id));

-- ================================================================ column privileges
-- A column REVOKE is a no-op while the table-level privilege stands (this
-- also means the initial migration's `revoke update (stage)` never bit).
-- Correct pattern: revoke the table privilege, grant it back per column.
create or replace function app.grant_columns_except(p_table regclass, p_privilege text, p_except text[])
returns void language plpgsql as $$
declare cols text;
begin
  select string_agg(quote_ident(attname), ', ') into cols
    from pg_attribute
   where attrelid = p_table and attnum > 0 and not attisdropped and attname <> all(p_except);
  execute format('revoke %s on %s from authenticated', p_privilege, p_table);
  execute format('grant %s (%s) on %s to authenticated', p_privilege, cols, p_table);
end $$;

select app.grant_columns_except('tickets', 'update', array['stage', 'closed_at', 'ticket_number', 'workspace_id']);
select app.grant_columns_except('profiles', 'update', array['id', 'email', 'is_active', 'created_at', 'updated_at']);
select app.grant_columns_except('ticket_parts', 'insert', array['stock_movement_id', 'used_at']);
select app.grant_columns_except('ticket_parts', 'update', array['id', 'ticket_id', 'stock_movement_id', 'used_at', 'created_at']);

-- ================================================================ ledger hardening
drop policy stock_insert_bench on stock_movements;
revoke execute on function app.consume_requested_parts(uuid) from public, authenticated;

create or replace function app.ticket_parts_guard() returns trigger
language plpgsql as $$
declare v_ws uuid;
begin
  if tg_op = 'DELETE' then
    if old.stock_movement_id is not null then
      raise exception 'release the part before removing it (stock is still consumed)';
    end if;
    return old;
  end if;
  if new.part_id is not null then
    select t.workspace_id into v_ws from tickets t where t.id = new.ticket_id;
    if not exists (select 1 from parts p where p.id = new.part_id and p.workspace_id = v_ws) then
      raise exception 'part belongs to a different workspace than the ticket';
    end if;
  end if;
  return new;
end $$;
create trigger ticket_parts_guard before insert or update or delete on ticket_parts
  for each row execute function app.ticket_parts_guard();

-- ================================================================ cross-workspace integrity
create or replace function app.same_workspace_guard() returns trigger
language plpgsql as $$
declare a uuid; b uuid;
begin
  if tg_table_name = 'watch_parts' then
    select workspace_id into a from watches where id = new.watch_id;
    select workspace_id into b from parts where id = new.part_id;
  elsif tg_table_name = 'watch_brands' then
    select workspace_id into a from watches where id = new.watch_id;
    select workspace_id into b from brands where id = new.brand_id;
  elsif tg_table_name = 'tickets' then
    select workspace_id into a from watches where id = new.watch_id;
    select workspace_id into b from brands where id = new.brand_id;
    if a <> new.workspace_id or b <> new.workspace_id then
      raise exception 'watch and brand must belong to the ticket''s workspace';
    end if;
    return new;
  end if;
  if a <> b then raise exception 'rows must belong to the same workspace'; end if;
  return new;
end $$;
create trigger watch_parts_same_workspace before insert or update on watch_parts
  for each row execute function app.same_workspace_guard();
create trigger watch_brands_same_workspace before insert or update on watch_brands
  for each row execute function app.same_workspace_guard();
create trigger tickets_same_workspace before insert or update of watch_id, brand_id, workspace_id on tickets
  for each row execute function app.same_workspace_guard();

-- ================================================================ tickets: role-scoped policies
drop policy tickets_insert on tickets;
create policy tickets_insert on tickets for insert to authenticated
  with check (app.is_admin_of(workspace_id) or brand_id = any(app.rep_brand_ids()));

drop policy invoices_write on invoices;
create policy invoices_write on invoices for all to authenticated
  using (exists (select 1 from tickets t where t.id = ticket_id and (app.is_admin_of(t.workspace_id) or t.brand_id = any(app.rep_brand_ids()))))
  with check (exists (select 1 from tickets t where t.id = ticket_id and (app.is_admin_of(t.workspace_id) or t.brand_id = any(app.rep_brand_ids()))));

-- ================================================================ stage machine & part RPCs (ticket-aware ownership)
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
  if not app.can_act_on(v_from, v_workspace, v_brand) then
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

  if p_to = 'in_repair' and p_kind = 'stage_changed' then
    perform app.consume_requested_parts(p_ticket);
  end if;
end $$;

create or replace function consume_ticket_part(p_row uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_movement uuid;
begin
  select tp.id, tp.ticket_id, tp.part_id, tp.qty, tp.stock_movement_id, p.unit_cost, t.workspace_id, t.brand_id
    into r
    from ticket_parts tp
    join tickets t on t.id = tp.ticket_id
    left join parts p on p.id = tp.part_id
   where tp.id = p_row
   for update of tp;
  if r.id is null then raise exception 'part row not found'; end if;
  if not app.can_act_on('in_repair', r.workspace_id, r.brand_id) then raise exception 'not allowed'; end if;
  if r.part_id is null or r.stock_movement_id is not null then return; end if;
  insert into stock_movements (part_id, qty_delta, reason, ticket_id, unit_cost_at_time, created_by)
  values (r.part_id, -r.qty, 'used_on_ticket', r.ticket_id, r.unit_cost, auth.uid())
  returning id into v_movement;
  update ticket_parts set stock_movement_id = v_movement, used_at = coalesce(used_at, now()) where id = r.id;
end $$;

create or replace function release_ticket_part(p_row uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  select tp.id, tp.ticket_id, tp.part_id, tp.qty, tp.stock_movement_id, m.unit_cost_at_time, t.workspace_id, t.brand_id
    into r
    from ticket_parts tp
    join tickets t on t.id = tp.ticket_id
    left join stock_movements m on m.id = tp.stock_movement_id
   where tp.id = p_row
   for update of tp;
  if r.id is null then raise exception 'part row not found'; end if;
  if not app.can_act_on('in_repair', r.workspace_id, r.brand_id) then raise exception 'not allowed'; end if;
  if r.stock_movement_id is null then return; end if;
  insert into stock_movements (part_id, qty_delta, reason, ticket_id, unit_cost_at_time, created_by, note)
  values (r.part_id, r.qty, 'returned', r.ticket_id, r.unit_cost_at_time, auth.uid(), 'replace unpicked in repair');
  update ticket_parts set stock_movement_id = null, used_at = null where id = r.id;
end $$;

-- ================================================================ supply helpers
-- Receive a reorder: adds the stock and closes the order atomically. Owners/admins.
create or replace function receive_part_order(p_order uuid, p_qty int, p_unit_cost numeric default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_movement uuid;
begin
  select o.id, o.part_id, o.received_at, p.workspace_id, p.unit_cost into r
    from part_orders o join parts p on p.id = o.part_id where o.id = p_order for update of o;
  if r.id is null then raise exception 'order not found'; end if;
  if not app.is_admin_of(r.workspace_id) then raise exception 'not allowed'; end if;
  if r.received_at is not null then raise exception 'order already received'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'quantity must be positive'; end if;
  insert into stock_movements (part_id, qty_delta, reason, unit_cost_at_time, note, created_by)
  values (r.part_id, p_qty, 'intake', coalesce(p_unit_cost, r.unit_cost), p_note, auth.uid())
  returning id into v_movement;
  update part_orders set received_at = now(), stock_movement_id = v_movement, qty = p_qty where id = r.id;
end $$;
grant execute on function receive_part_order(uuid, int, numeric, text) to authenticated;

-- How many open tickets are waiting on each part (diagnosed, not yet consumed), in the caller's scope.
create or replace function part_demand(p_workspace uuid)
returns table (part_id uuid, waiting_qty int, ticket_count int)
language sql stable security definer set search_path = public as $$
  select tp.part_id, sum(tp.qty)::int, count(distinct tp.ticket_id)::int
  from ticket_parts tp
  join tickets t on t.id = tp.ticket_id
  where t.workspace_id = p_workspace
    and tp.part_id is not null
    and tp.stock_movement_id is null
    and t.stage <> 'closed'
    and app.ticket_in_scope(t.id)
  group by tp.part_id
$$;
grant execute on function part_demand(uuid) to authenticated;

-- ================================================================ grants
grant execute on all functions in schema app to authenticated;
revoke execute on function app.consume_requested_parts(uuid) from authenticated;

-- ================================================================ retire the old role model
-- Every policy that referenced app.role() has been replaced above.
drop function if exists app.role();
drop type user_role;
