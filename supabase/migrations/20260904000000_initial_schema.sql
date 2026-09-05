-- Pivot beta: initial schema.
-- Source of truth for the shape: the "Pivot Schema v2" design doc.
-- Sixteen tables, three roles, stage changes only through set_stage().

create extension if not exists citext;

-- ---------------------------------------------------------------- enums
create type user_role as enum ('workspace_admin', 'watchmaker', 'brand_rep');

-- Live stages first, then five legacy values kept so migrated history renders.
create type stage as enum (
  'intake', 'send_return_label', 'received', 'request_part',
  'in_repair', 'testing', 'shipped_back', 'closed',
  'submitted', 'cs_diagnosing', 'awaiting_arrival', 'confirming_address', 'shipped'
);

create type component as enum (
  'bezel_insert', 'bracelet', 'case', 'caseback', 'clasp', 'crown_tube',
  'crystal', 'dial', 'gaskets', 'hands', 'lume', 'movement'
);

-- ---------------------------------------------------------------- helpers
create schema if not exists app;

create or replace function app.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- tenancy & people
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  ticket_prefix text not null,
  stage_order stage[] not null default '{received,in_repair,testing,shipped_back}',
  send_return_label_enabled boolean not null default false,
  bench_address jsonb,
  send_from_email text,
  send_from_name text,
  skip_stage_emails boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger workspaces_updated_at before update on workspaces
  for each row execute function app.set_updated_at();

create table brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  name text not null,
  slug text not null,
  logo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);
create trigger brands_updated_at before update on brands
  for each row execute function app.set_updated_at();

-- id equals auth.users.id. The add-user server action creates the auth user
-- first (service role), then inserts here with the returned id.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  display_name text not null,
  role user_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on profiles
  for each row execute function app.set_updated_at();

create table user_workspaces (
  user_id uuid not null references profiles(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, workspace_id)
);

create table user_brands (
  user_id uuid not null references profiles(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, brand_id)
);

-- ---------------------------------------------------------------- ops catalog
create table watches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  model text not null,
  reference text,
  warranty_months int,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, model, reference)
);
create trigger watches_updated_at before update on watches
  for each row execute function app.set_updated_at();

create table watch_brands (
  watch_id uuid not null references watches(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  is_primary boolean not null default false,
  primary key (watch_id, brand_id)
);
create unique index watch_brands_one_primary on watch_brands (watch_id) where is_primary;

create table parts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  sku text not null,
  name text not null,
  component component not null,
  unit_cost numeric(10,2),
  reorder_at int not null default 0,
  supplier text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, sku)
);
create trigger parts_updated_at before update on parts
  for each row execute function app.set_updated_at();

create table watch_parts (
  watch_id uuid not null references watches(id) on delete cascade,
  part_id uuid not null references parts(id) on delete cascade,
  notes text,
  primary key (watch_id, part_id)
);

-- ---------------------------------------------------------------- repairs
create table tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  workspace_id uuid not null references workspaces(id),
  brand_id uuid not null references brands(id),
  stage stage not null default 'intake',
  created_by uuid references profiles(id),
  closed_at timestamptz,

  customer_name text,
  customer_email citext,
  customer_phone text,
  watch_id uuid references watches(id),
  watch_model text,
  watch_serial text,
  coverage text check (coverage in ('warranty', 'paid')),
  requires_payment boolean not null default false,
  payment_status text not null default 'none' check (payment_status in ('none', 'invoiced', 'paid')),
  priority boolean not null default false,
  tags text[] not null default '{}',

  issue_description text,
  return_address jsonb,
  pending_return_address jsonb,
  pending_return_address_at timestamptz,
  estimated_done_at date,
  customer_photos text[] not null default '{}',

  watch_received_at timestamptz,
  intake_components jsonb not null default '[]',
  intake_notes text,
  intake_photos text[] not null default '{}',
  parts_requested_at timestamptz,
  parts_reminder_snoozed_until timestamptz,

  repair_categories jsonb not null default '[]',
  solution_notes text,
  repair_photos text[] not null default '{}',
  time_spent_minutes int,
  repair_complete boolean not null default false,
  testing_checks jsonb not null default '{"timekeeping": false, "water_resistance": false, "visual": false}',
  testing_notes text,
  testing_photos text[] not null default '{}',

  in_person_handoff boolean not null default false,
  signature_required boolean not null default false,
  gmail_thread_id text,

  search tsvector generated always as (
    to_tsvector('simple',
      coalesce(ticket_number, '') || ' ' || coalesce(customer_name, '') || ' ' ||
      coalesce(customer_email::text, '') || ' ' || coalesce(watch_model, '') || ' ' ||
      coalesce(watch_serial, '') || ' ' || coalesce(issue_description, ''))
  ) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tickets_workspace_stage on tickets (workspace_id, stage);
create index tickets_brand on tickets (brand_id);
create index tickets_search on tickets using gin (search);
create trigger tickets_updated_at before update on tickets
  for each row execute function app.set_updated_at();

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references parts(id),
  qty_delta int not null check (qty_delta <> 0),
  reason text not null check (reason in ('intake', 'used_on_ticket', 'returned', 'adjustment', 'initial_count')),
  ticket_id uuid references tickets(id),
  unit_cost_at_time numeric(10,2),
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  check (reason <> 'adjustment' or note is not null),
  check (reason not in ('used_on_ticket', 'returned') or ticket_id is not null)
);
create index stock_movements_part on stock_movements (part_id);

create table ticket_parts (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  part_id uuid references parts(id),
  component component,
  name text not null,
  sku text,
  source text not null check (source in ('brand', 'bench_stock')),
  qty int not null default 1 check (qty > 0),
  requested_at timestamptz,
  requested_by uuid references profiles(id),
  sent_at timestamptz,
  sent_by uuid references profiles(id),
  tracking_number text,
  used_at timestamptz,
  stock_movement_id uuid references stock_movements(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ticket_parts_ticket on ticket_parts (ticket_id);
create index ticket_parts_part on ticket_parts (part_id);
create trigger ticket_parts_updated_at before update on ticket_parts
  for each row execute function app.set_updated_at();

create table ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  type text not null,
  actor_id uuid references profiles(id),
  from_stage stage,
  to_stage stage,
  body text,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index ticket_events_ticket on ticket_events (ticket_id, created_at);

create table ticket_emails (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  template text not null,
  to_email citext not null,
  subject text not null,
  body_html text not null,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  skipped_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index ticket_emails_due on ticket_emails (scheduled_at) where sent_at is null and skipped_at is null;
create unique index ticket_emails_one_pending on ticket_emails (ticket_id, template) where sent_at is null and skipped_at is null;

create table shipments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  source text not null check (source in ('shipstation', 'manual')),
  carrier_code text,
  service_code text,
  tracking_number text,
  shipstation_label_id text,
  label_path text,
  ship_to jsonb,
  cost numeric(10,2),
  signature_required boolean not null default false,
  shipped_at timestamptz,
  delivered_at timestamptz,
  voided_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index shipments_ticket on shipments (ticket_id);
create index shipments_tracking on shipments (tracking_number);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  amount numeric(10,2) not null,
  stripe_session_id text unique,
  url text,
  sent_at timestamptz,
  reminder_sent_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,
  paid_manually_reason text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index invoices_ticket on invoices (ticket_id);

-- ---------------------------------------------------------------- scope helpers
-- Stable, security definer: evaluated once per statement, read profiles + junctions.

create or replace function app.role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and is_active
$$;

create or replace function app.workspace_ids() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(uw.workspace_id), '{}')
  from user_workspaces uw
  join profiles p on p.id = uw.user_id
  where uw.user_id = auth.uid() and p.is_active and p.role = 'workspace_admin'
$$;

create or replace function app.brand_ids() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(ub.brand_id), '{}')
  from user_brands ub
  join profiles p on p.id = ub.user_id
  where ub.user_id = auth.uid() and p.is_active and p.role in ('watchmaker', 'brand_rep')
$$;

-- Workspaces the caller can read anything from: held as admin, or the
-- workspace of any held brand.
create or replace function app.visible_workspace_ids() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct w), '{}') from (
    select unnest(app.workspace_ids()) as w
    union
    select b.workspace_id from brands b where b.id = any(app.brand_ids())
  ) s
$$;

create or replace function app.in_scope(p_workspace uuid, p_brand uuid) returns boolean
language sql stable as $$
  select p_workspace = any(app.workspace_ids()) or p_brand = any(app.brand_ids())
$$;

create or replace function app.ticket_in_scope(p_ticket uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from tickets t where t.id = p_ticket and app.in_scope(t.workspace_id, t.brand_id)
  )
$$;

create or replace function app.is_admin_of(p_workspace uuid) returns boolean
language sql stable as $$
  select p_workspace = any(app.workspace_ids())
$$;

-- Which role owns which stage. Workspace admins can act on every stage.
create or replace function app.can_act_on(p_stage stage) returns boolean
language sql stable as $$
  select case app.role()
    when 'workspace_admin' then true
    when 'watchmaker' then p_stage in ('received', 'in_repair', 'testing', 'shipped_back')
    when 'brand_rep' then p_stage in ('intake', 'send_return_label', 'request_part')
    else false
  end
$$;

-- ---------------------------------------------------------------- stage machine
-- The only door to tickets.stage. Guards live in TypeScript; this checks
-- scope and stage ownership, then writes the stage and the event together.
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
end $$;

-- Autosave may update any ordinary column, never the stage.
revoke update (stage) on tickets from authenticated;

-- ---------------------------------------------------------------- views
create view parts_stock as
  select part_id, sum(qty_delta)::int as stock_qty
  from stock_movements
  group by part_id;

-- What the bench sees: no unit cost, no stock. Security definer by default,
-- filtered to the caller's visible workspaces.
create view parts_for_bench as
  select p.id, p.workspace_id, p.sku, p.name, p.component, p.is_active
  from parts p
  where p.workspace_id = any(app.visible_workspace_ids());

grant select on parts_for_bench to authenticated;
grant select on parts_stock to authenticated;

-- ---------------------------------------------------------------- row-level security
alter table workspaces enable row level security;
alter table brands enable row level security;
alter table profiles enable row level security;
alter table user_workspaces enable row level security;
alter table user_brands enable row level security;
alter table watches enable row level security;
alter table watch_brands enable row level security;
alter table parts enable row level security;
alter table watch_parts enable row level security;
alter table stock_movements enable row level security;
alter table tickets enable row level security;
alter table ticket_parts enable row level security;
alter table ticket_events enable row level security;
alter table ticket_emails enable row level security;
alter table shipments enable row level security;
alter table invoices enable row level security;

-- workspaces: read what you can see; write what you administer.
create policy workspaces_read on workspaces for select to authenticated
  using (id = any(app.visible_workspace_ids()));
create policy workspaces_write on workspaces for update to authenticated
  using (app.is_admin_of(id)) with check (app.is_admin_of(id));
create policy workspaces_create on workspaces for insert to authenticated
  with check (app.role() = 'workspace_admin');

-- brands: admins see the workspace's brands; others see held brands.
create policy brands_read on brands for select to authenticated
  using (app.is_admin_of(workspace_id) or id = any(app.brand_ids()));
create policy brands_write on brands for all to authenticated
  using (app.is_admin_of(workspace_id)) with check (app.is_admin_of(workspace_id));

-- profiles: self, or any profile if you are a workspace admin.
-- Creation and role changes go through the service role in server actions.
create policy profiles_read on profiles for select to authenticated
  using (id = auth.uid() or app.role() = 'workspace_admin');
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

create policy user_workspaces_read on user_workspaces for select to authenticated
  using (user_id = auth.uid() or app.is_admin_of(workspace_id));
create policy user_brands_read on user_brands for select to authenticated
  using (user_id = auth.uid()
      or exists (select 1 from brands b where b.id = brand_id and app.is_admin_of(b.workspace_id)));

-- catalog: read within visible workspaces; write as admin of the workspace.
create policy watches_read on watches for select to authenticated
  using (workspace_id = any(app.visible_workspace_ids()));
create policy watches_write on watches for all to authenticated
  using (app.is_admin_of(workspace_id)) with check (app.is_admin_of(workspace_id));

create policy watch_brands_read on watch_brands for select to authenticated
  using (exists (select 1 from watches w where w.id = watch_id and w.workspace_id = any(app.visible_workspace_ids())));
create policy watch_brands_write on watch_brands for all to authenticated
  using (exists (select 1 from watches w where w.id = watch_id and app.is_admin_of(w.workspace_id)))
  with check (exists (select 1 from watches w where w.id = watch_id and app.is_admin_of(w.workspace_id)));

-- parts: the base table is admin-only; everyone else reads parts_for_bench.
create policy parts_admin on parts for all to authenticated
  using (app.is_admin_of(workspace_id)) with check (app.is_admin_of(workspace_id));

create policy watch_parts_read on watch_parts for select to authenticated
  using (exists (select 1 from watches w where w.id = watch_id and w.workspace_id = any(app.visible_workspace_ids())));
create policy watch_parts_write on watch_parts for all to authenticated
  using (exists (select 1 from watches w where w.id = watch_id and app.is_admin_of(w.workspace_id)))
  with check (exists (select 1 from watches w where w.id = watch_id and app.is_admin_of(w.workspace_id)));

-- stock ledger: append-only. Admins insert any reason; watchmakers only
-- consumption against a ticket in their scope. No update or delete policies.
create policy stock_read on stock_movements for select to authenticated
  using (exists (select 1 from parts p where p.id = part_id and app.is_admin_of(p.workspace_id)));
create policy stock_insert_admin on stock_movements for insert to authenticated
  with check (exists (select 1 from parts p where p.id = part_id and app.is_admin_of(p.workspace_id)));
create policy stock_insert_bench on stock_movements for insert to authenticated
  with check (app.role() = 'watchmaker'
          and reason in ('used_on_ticket', 'returned')
          and app.ticket_in_scope(ticket_id));

-- tickets: everything in scope. Field-level rules live in the server actions;
-- the stage column is revoked above.
create policy tickets_read on tickets for select to authenticated
  using (app.in_scope(workspace_id, brand_id));
create policy tickets_insert on tickets for insert to authenticated
  with check (app.in_scope(workspace_id, brand_id) and app.role() in ('workspace_admin', 'brand_rep'));
create policy tickets_update on tickets for update to authenticated
  using (app.in_scope(workspace_id, brand_id)) with check (app.in_scope(workspace_id, brand_id));
create policy tickets_delete on tickets for delete to authenticated
  using (app.is_admin_of(workspace_id));

-- ticket children: follow the ticket.
create policy ticket_parts_all on ticket_parts for all to authenticated
  using (app.ticket_in_scope(ticket_id)) with check (app.ticket_in_scope(ticket_id));

create policy ticket_events_read on ticket_events for select to authenticated
  using (app.ticket_in_scope(ticket_id));
create policy ticket_events_insert on ticket_events for insert to authenticated
  with check (app.ticket_in_scope(ticket_id) and actor_id = auth.uid());

create policy ticket_emails_read on ticket_emails for select to authenticated
  using (app.ticket_in_scope(ticket_id));
create policy ticket_emails_write on ticket_emails for all to authenticated
  using (app.ticket_in_scope(ticket_id)) with check (app.ticket_in_scope(ticket_id));

create policy shipments_read on shipments for select to authenticated
  using (app.ticket_in_scope(ticket_id));
create policy shipments_write on shipments for all to authenticated
  using (app.ticket_in_scope(ticket_id)) with check (app.ticket_in_scope(ticket_id));

create policy invoices_read on invoices for select to authenticated
  using (app.ticket_in_scope(ticket_id));
create policy invoices_write on invoices for all to authenticated
  using (app.ticket_in_scope(ticket_id) and app.role() in ('workspace_admin', 'brand_rep'))
  with check (app.ticket_in_scope(ticket_id) and app.role() in ('workspace_admin', 'brand_rep'));

-- ---------------------------------------------------------------- grants
grant usage on schema app to authenticated, anon;
grant execute on all functions in schema app to authenticated;
grant execute on function set_stage(uuid, stage, text) to authenticated;
