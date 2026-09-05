-- Dev seed: the two workspaces and three brands from the live app, plus a
-- small demo catalog. Every insert is idempotent so the file can be re-run.
-- People are added by an admin (auth user + profiles row), not here.
insert into workspaces (id, name, slug, ticket_prefix, send_from_email, send_from_name, send_return_label_enabled)
values
  ('00000000-0000-0000-0000-000000000001', 'Nodus', 'nodus', 'NW', 'customerservice@noduswatches.com', 'Nodus Service Team', false),
  ('00000000-0000-0000-0000-000000000002', 'Connexus', 'connexus', 'CX', null, null, false)
on conflict (id) do nothing;

insert into brands (id, workspace_id, name, slug)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Nodus', 'nodus'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'Sangin', 'sangin'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000002', 'Awake', 'awake')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- demo catalog
-- DEMO DATA. Two Nodus watches and the parts that fit them, taken from the
-- Ops mockup. Replace with the real lineup and inventory sheet when Wes
-- exports them.

insert into watches (id, workspace_id, model, reference, warranty_months)
values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Sector Deep', null, 24),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Avalon II', null, 24)
on conflict (id) do nothing;

insert into watch_brands (watch_id, brand_id, is_primary)
values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000011', true),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000011', true)
on conflict do nothing;

insert into parts (id, workspace_id, sku, name, component, unit_cost, reorder_at)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'CT-SD-01',  'Casetube',              'crown_tube',  8.00,  5),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'CR-SD-01',  'Crown, signed',         'crown_tube',  12.00, 4),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'BZ-SD-CER', 'Bezel insert, ceramic', 'bezel_insert', 52.00, 2),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', 'MV-NH35',   'NH35 movement',         'movement',    45.00, 3),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000001', 'GK-UNI-01', 'Gasket set',            'gaskets',     3.00,  15)
on conflict (id) do nothing;

-- Which parts fit which watch. The movement and gaskets fit both.
insert into watch_parts (watch_id, part_id)
values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000202'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000203'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000204'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000205'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000204'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000205')
on conflict do nothing;

-- Opening stock counts (the ledger's first entry per part).
insert into stock_movements (id, part_id, qty_delta, reason, unit_cost_at_time, note)
values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 2,  'initial_count', 8.00,  'demo seed'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000202', 11, 'initial_count', 12.00, 'demo seed'),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000203', 3,  'initial_count', 52.00, 'demo seed'),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000204', 4,  'initial_count', 45.00, 'demo seed'),
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000205', 40, 'initial_count', 3.00,  'demo seed')
on conflict (id) do nothing;
