-- Reorders live in Ops, not on tickets. A ticket parked in Request Part shows
-- whether an out-of-stock part is already on order.

create table part_orders (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references parts(id),
  qty int not null check (qty > 0),
  ordered_at date not null default current_date,
  expected_at date,
  received_at timestamptz,
  -- Set when receiving: the intake movement that added the stock.
  stock_movement_id uuid references stock_movements(id),
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index part_orders_part_open on part_orders (part_id) where received_at is null;

-- Can the caller see this part at all? (The parts table itself is admin-only;
-- everyone in the workspace may know a part exists and whether it's on order.)
create or replace function app.part_visible(p_part uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from parts p where p.id = p_part and p.workspace_id = any(app.visible_workspace_ids()))
$$;

alter table part_orders enable row level security;
create policy part_orders_read on part_orders for select to authenticated
  using (app.part_visible(part_id));
create policy part_orders_admin on part_orders for all to authenticated
  using (exists (select 1 from parts p where p.id = part_id and app.is_admin_of(p.workspace_id)))
  with check (exists (select 1 from parts p where p.id = part_id and app.is_admin_of(p.workspace_id)));

grant execute on function app.part_visible(uuid) to authenticated;
