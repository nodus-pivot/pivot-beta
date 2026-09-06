-- The caller's real memberships, ignoring any View-as headers, so the UI can
-- show "Exit preview" and check the right to preview. Narrowing is enforced
-- separately by app.effective_memberships().
create or replace function my_real_grants()
returns table (role member_role, workspace_id uuid, brand_id uuid)
language sql stable security definer set search_path = public as $$
  select m.role, m.workspace_id, m.brand_id from memberships m where m.user_id = auth.uid()
$$;
grant execute on function my_real_grants() to authenticated;
