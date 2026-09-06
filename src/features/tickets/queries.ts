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

import type { TicketDetail, TicketEvent } from "./detail";

/** The full ticket for the detail page, or null when it doesn't exist or is out of scope. */
export async function getTicketDetail(id: string): Promise<TicketDetail | null> {
  const supabase = await createClient();
  const { data: t, error } = await supabase
    .from("tickets")
    .select("*, watches(model, reference, warranty_months), brands(name), ticket_parts(*), shipments(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!t) return null;

  // Actor names come from profiles; RLS may hide other people's rows, so the join is optional.
  const { data: events } = await supabase
    .from("ticket_events")
    .select("id, type, body, from_stage, to_stage, payload, created_at, actor:profiles(display_name, role)")
    .eq("ticket_id", id)
    .order("created_at");

  const { watches, brands, ticket_parts, shipments, ...row } = t;
  return {
    ...row,
    watch: watches,
    brand: brands,
    parts: ticket_parts,
    shipments,
    events: (events ?? []).map((e): TicketEvent => ({ ...e, actor: e.actor ?? null })),
  };
}

export type CatalogPart = { id: string; name: string; sku: string; component: string };

/** Parts that fit the ticket's watch, as the bench sees them (no cost, no stock). */
export async function getPartsForWatch(watchId: string): Promise<CatalogPart[]> {
  const supabase = await createClient();
  const { data: fits } = await supabase.from("watch_parts").select("part_id").eq("watch_id", watchId);
  const ids = (fits ?? []).map((f) => f.part_id);
  if (ids.length === 0) return [];
  const { data } = await supabase.from("parts_for_bench").select("id, sku, name, component").in("id", ids).eq("is_active", true).order("name");
  return (data ?? []).flatMap((p) => (p.id && p.sku && p.name && p.component ? [{ id: p.id, sku: p.sku, name: p.name, component: p.component }] : []));
}

export type PartStock = { qty: number; reorder_at: number };

/** Stock levels for owners. RLS hides the parts table from everyone else, so this returns {} for them. */
export async function getPartsStock(partIds: string[]): Promise<Record<string, PartStock>> {
  if (partIds.length === 0) return {};
  const supabase = await createClient();
  const [{ data: parts }, { data: stock }] = await Promise.all([
    supabase.from("parts").select("id, reorder_at").in("id", partIds),
    supabase.from("parts_stock").select("part_id, stock_qty").in("part_id", partIds),
  ]);
  const qty = new Map((stock ?? []).map((s) => [s.part_id, s.stock_qty ?? 0]));
  const out: Record<string, PartStock> = {};
  for (const p of parts ?? []) out[p.id] = { qty: qty.get(p.id) ?? 0, reorder_at: p.reorder_at };
  return out;
}
