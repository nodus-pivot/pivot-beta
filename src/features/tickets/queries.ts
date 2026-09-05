import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Stage } from "@/features/pipeline";

/** One row of the Service Center sidebar. */
export type TicketListItem = {
  id: string;
  ticket_number: string;
  customer_name: string | null;
  stage: Stage;
  priority: boolean;
  updated_at: string;
  created_at: string;
  parts_requested_at: string | null;
  watch_model: string;
};

export async function listOpenTickets(workspaceId: string): Promise<TicketListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("id, ticket_number, customer_name, stage, priority, updated_at, created_at, parts_requested_at, watches(model)")
    .eq("workspace_id", workspaceId)
    .neq("stage", "closed")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((t) => ({
    id: t.id,
    ticket_number: t.ticket_number,
    customer_name: t.customer_name,
    stage: t.stage as Stage,
    priority: t.priority,
    updated_at: t.updated_at,
    created_at: t.created_at,
    parts_requested_at: t.parts_requested_at,
    watch_model: t.watches?.model ?? "",
  }));
}
