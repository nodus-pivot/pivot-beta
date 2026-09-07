-- Customer status lookup (design 2b/2c). No customer accounts: a ticket
-- number plus the email on file unlocks a read-only, customer-safe view of
-- one ticket. Both functions run as definer and are the only thing anon can
-- reach; nothing internal (notes, costs, comments, staff names) is returned.

create or replace function customer_ticket_status(p_ticket_number text, p_email text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  t tickets%rowtype;
  v_model text;
  v_brand text;
  v_out shipments%rowtype;
  v_reached jsonb;
begin
  select * into t from tickets
   where upper(ticket_number) = upper(trim(p_ticket_number))
     and customer_email = lower(trim(p_email))::citext
   limit 1;
  if t.id is null then return null; end if;

  select w.model into v_model from watches w where w.id = t.watch_id;
  select b.name into v_brand from brands b where b.id = t.brand_id;
  select * into v_out from shipments s where s.ticket_id = t.id and s.direction = 'outbound' order by s.created_at desc limit 1;

  -- When each stage was first entered, for the public timeline.
  select coalesce(jsonb_object_agg(x.to_stage, x.first_at), '{}'::jsonb) into v_reached
    from (select e.to_stage, min(e.created_at) as first_at
            from ticket_events e
           where e.ticket_id = t.id and e.to_stage is not null
           group by e.to_stage) x;

  return jsonb_build_object(
    'ticket_number', t.ticket_number,
    'brand', v_brand,
    'model', v_model,
    'customer_first_name', split_part(coalesce(t.customer_name, ''), ' ', 1),
    'submitted_at', t.created_at,
    'stage', t.stage,
    'estimated_done_at', t.estimated_done_at,
    'requested_parts', exists (select 1 from ticket_parts tp where tp.ticket_id = t.id and tp.source = 'brand'),
    'reached', v_reached,
    'condition_on_arrival', case when t.watch_received_at is not null then t.intake_components else null end,
    'work_performed', case when t.stage in ('testing', 'shipped_back', 'closed') then t.repair_categories else null end,
    'testing_passed', case when t.stage in ('shipped_back', 'closed')
                        then (t.testing_checks->>'timekeeping')::boolean and (t.testing_checks->>'water_resistance')::boolean and (t.testing_checks->>'visual')::boolean
                        else null end,
    'return_address', t.return_address,
    'pending_return_address', t.pending_return_address,
    'in_person_handoff', t.in_person_handoff,
    'shipment', case when v_out.id is not null and v_out.shipped_at is not null
                     then jsonb_build_object('carrier', v_out.carrier_code, 'tracking_number', v_out.tracking_number, 'shipped_at', v_out.shipped_at, 'delivered_at', v_out.delivered_at)
                     else null end,
    'closed_at', t.closed_at
  );
end $$;

-- The customer asks for a different return address. Staff apply it from the ticket.
create or replace function customer_request_address_update(p_ticket_number text, p_email text, p_address jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if p_address is null or jsonb_typeof(p_address) <> 'object' then return false; end if;
  select id into v_id from tickets
   where upper(ticket_number) = upper(trim(p_ticket_number))
     and customer_email = lower(trim(p_email))::citext
     and stage <> 'closed'
   limit 1;
  if v_id is null then return false; end if;
  update tickets set pending_return_address = p_address, pending_return_address_at = now() where id = v_id;
  insert into ticket_events (ticket_id, type, body, payload)
  values (v_id, 'address_update_requested', 'the customer asked to change the return address', p_address);
  return true;
end $$;

revoke all on function customer_ticket_status(text, text) from public;
revoke all on function customer_request_address_update(text, text, jsonb) from public;
grant execute on function customer_ticket_status(text, text) to anon, authenticated;
grant execute on function customer_request_address_update(text, text, jsonb) to anon, authenticated;
