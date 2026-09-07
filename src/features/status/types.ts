/** What customer_ticket_status() returns: the customer-safe view of one ticket. */
export type CustomerStatus = {
  ticket_number: string;
  brand: string | null;
  model: string | null;
  customer_first_name: string;
  submitted_at: string;
  stage: string;
  estimated_done_at: string | null;
  requested_parts: boolean;
  /** Stage → ISO timestamp when first entered. */
  reached: Record<string, string>;
  condition_on_arrival: { component: string; conditions: string[] }[] | null;
  work_performed: { component: string; action?: string; variant?: string }[] | null;
  testing_passed: boolean | null;
  return_address: Record<string, string | null> | null;
  pending_return_address: Record<string, string | null> | null;
  in_person_handoff: boolean;
  shipment: { carrier: string | null; tracking_number: string | null; shipped_at: string | null; delivered_at: string | null } | null;
  closed_at: string | null;
};
