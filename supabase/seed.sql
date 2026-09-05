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

-- ---------------------------------------------------------------- demo tickets
-- DEMO DATA. One ticket per live stage so the Service Center sidebar has
-- something to show. Names and models follow the mockups. Inserted as the
-- seed role, so stage is written directly (the app goes through set_stage).

insert into tickets (id, ticket_number, workspace_id, brand_id, stage, customer_name, customer_email, watch_id, watch_serial,
                     issue_description, priority, requires_payment, watch_received_at, intake_components, repair_categories,
                     repair_complete, testing_checks, closed_at, created_at)
values
  ('00000000-0000-0000-0000-000000000401', 'NW260041', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'received', 'Maria Lopez', 'maria@example.com', '00000000-0000-0000-0000-000000000101', '501122',
   'Second hand stutters and the watch loses about two minutes a day.', false, false, null, '[]', '[]',
   false, '{"timekeeping": false, "water_resistance": false, "visual": false}', null, now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000000402', 'NW260038', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'request_part', 'James Whitfield', 'james@example.com', '00000000-0000-0000-0000-000000000102', '204056',
   'Crown fell off while setting the time.', false, false, now() - interval '6 days',
   '[{"component": "Crown/Stem", "conditions": ["Cracked"]}]', '[]',
   false, '{"timekeeping": false, "water_resistance": false, "visual": false}', null, now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000000403', 'NW260035', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'in_repair', 'Adam Ferguson', 'adam@example.com', '00000000-0000-0000-0000-000000000101', '506269',
   'Bezel insert cracked after a drop.', true, true, now() - interval '9 days',
   '[{"component": "Bezel", "conditions": ["Cracked"]}, {"component": "Case", "conditions": ["Scratches"]}]',
   '[{"component": "bezel_insert", "action": "replace", "variant": "ceramic"}]',
   false, '{"timekeeping": false, "water_resistance": false, "visual": false}', null, now() - interval '10 days'),
  ('00000000-0000-0000-0000-000000000404', 'NW260031', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'testing', 'Sarah Chen', 'sarah@example.com', '00000000-0000-0000-0000-000000000102', '0303291',
   'Fogging under the crystal after swimming.', false, false, now() - interval '14 days',
   '[{"component": "Crystal", "conditions": ["Discolored"]}]',
   '[{"component": "gaskets", "action": "replace"}, {"component": "crystal", "action": "repair"}]',
   true, '{"timekeeping": true, "water_resistance": false, "visual": false}', null, now() - interval '15 days'),
  ('00000000-0000-0000-0000-000000000405', 'NW260027', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'shipped_back', 'Leo Park', 'leo@example.com', '00000000-0000-0000-0000-000000000101', '5090169',
   'Running slow, needs regulation.', false, false, now() - interval '20 days',
   '[{"component": "Case", "conditions": ["Lightly worn"]}]',
   '[{"component": "movement", "action": "regulate"}]',
   true, '{"timekeeping": true, "water_resistance": true, "visual": true}', null, now() - interval '21 days'),
  ('00000000-0000-0000-0000-000000000406', 'NW260019', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'closed', 'Tom Reyes', 'tom@example.com', '00000000-0000-0000-0000-000000000102', '096/100',
   'Clasp would not stay closed.', false, false, now() - interval '40 days',
   '[{"component": "Clasp", "conditions": ["Lightly worn"]}]',
   '[{"component": "clasp", "action": "repair"}]',
   true, '{"timekeeping": true, "water_resistance": true, "visual": true}', now() - interval '30 days', now() - interval '42 days')
on conflict (id) do nothing;

-- The part James's ticket is waiting on.
insert into ticket_parts (id, ticket_id, part_id, component, name, sku, source, requested_at)
values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000204',
   'movement', 'NH35 movement', 'MV-NH35', 'brand', now() - interval '5 days')
on conflict (id) do nothing;

insert into ticket_events (id, ticket_id, type, to_stage, created_at)
select gen_random_uuid(), id, 'created', 'intake', created_at from tickets
where id between '00000000-0000-0000-0000-000000000401' and '00000000-0000-0000-0000-000000000406'
  and not exists (select 1 from ticket_events e where e.ticket_id = tickets.id);
