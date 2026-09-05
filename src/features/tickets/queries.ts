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

export type CatalogBrand = { id: string; name: string };
export type CatalogWatch = { id: string; model: string; reference: string | null; brand_ids: string[] };

/** Brands and watches the intake form can choose from, for one workspace. */
export async function getIntakeCatalog(workspaceId: string): Promise<{ brands: CatalogBrand[]; watches: CatalogWatch[] }> {
  const supabase = await createClient();
  const [brandsRes, watchesRes] = await Promise.all([
    supabase.from("brands").select("id, name").eq("workspace_id", workspaceId).eq("is_active", true).order("name"),
    supabase
      .from("watches")
      .select("id, model, reference, watch_brands(brand_id)")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("model"),
  ]);
  if (brandsRes.error) throw brandsRes.error;
  if (watchesRes.error) throw watchesRes.error;
  return {
    brands: brandsRes.data ?? [],
    watches: (watchesRes.data ?? []).map((w) => ({
      id: w.id,
      model: w.model,
      reference: w.reference,
      brand_ids: w.watch_brands.map((b) => b.brand_id),
    })),
  };
}
