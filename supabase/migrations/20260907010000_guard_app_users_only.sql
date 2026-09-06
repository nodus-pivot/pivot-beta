-- The ticket_parts delete guard protects the app path (an authenticated user
-- removing a consumed row). The seed and the service role run without a
-- user and may cascade-delete tickets; their ledger rows keep ticket_id null.
create or replace function app.ticket_parts_guard() returns trigger
language plpgsql as $$
declare v_ws uuid;
begin
  if tg_op = 'DELETE' then
    if old.stock_movement_id is not null and auth.uid() is not null then
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
