-- Dev seed: the two workspaces and three brands from the live app.
-- People are added through the app once Google sign-in is configured.
insert into workspaces (id, name, slug, ticket_prefix, send_from_email, send_from_name, send_return_label_enabled)
values
  ('00000000-0000-0000-0000-000000000001', 'Nodus', 'nodus', 'NW', 'customerservice@noduswatches.com', 'Nodus Service Team', false),
  ('00000000-0000-0000-0000-000000000002', 'Connexus', 'connexus', 'CX', null, null, false);

insert into brands (id, workspace_id, name, slug)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Nodus', 'nodus'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'Sangin', 'sangin'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000002', 'Awake', 'awake');
