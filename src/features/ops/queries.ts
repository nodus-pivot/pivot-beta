import "server-only";
import { canSeeCost } from "@/features/auth/permissions";
import type { Grant } from "@/features/pipeline";
import { createClient } from "@/lib/supabase/server";

/** One row of the Supply table. Cost is null for anyone who may not see it. */
export type SupplyRow = {
  id: string;
  sku: string;
  name: string;
  component: string;
  reorder_at: number;
  is_active: boolean;
  unit_cost: number | null;
  supplier: string | null;
  stock: number;
  waiting_tickets: number;
  waiting_qty: number;
  on_order_qty: number;
  fits: { id: string; model: string }[];
};

/**
 * Parts for a workspace as the caller may see them. Owners/admins read the
 * base table (cost, supplier); everyone else the cost-free view, which RLS
 * has already narrowed to their brands' watches.
 */
export async function listSupply(workspaceId: string, grants: Grant[]): Promise<SupplyRow[]> {
  const supabase = await createClient();
  const seeCost = canSeeCost(grants, workspaceId);

  const base = seeCost
    ? await supabase.from("parts").select("id, sku, name, component, reorder_at, is_active, unit_cost, supplier").eq("workspace_id", workspaceId).order("name")
    : await supabase.from("parts_for_bench").select("id, sku, name, component, reorder_at, is_active").eq("workspace_id", workspaceId).order("name");
  if (base.error) throw base.error;
  const parts = (base.data ?? []).flatMap((p) => (p.id && p.sku && p.name && p.component ? [p] : []));
  const ids = parts.map((p) => p.id as string);
  if (ids.length === 0) return [];

  const [{ data: stock }, { data: demand }, { data: orders }, { data: fits }] = await Promise.all([
    supabase.from("parts_stock").select("part_id, stock_qty").in("part_id", ids),
    supabase.rpc("part_demand", { p_workspace: workspaceId }),
    supabase.from("part_orders").select("part_id, qty").in("part_id", ids).is("received_at", null),
    supabase.from("watch_parts").select("part_id, watches(id, model)").in("part_id", ids),
  ]);
  const stockBy = new Map((stock ?? []).map((s) => [s.part_id, s.stock_qty ?? 0]));
  const demandBy = new Map((demand ?? []).map((d) => [d.part_id, d]));
  const orderBy = new Map<string, number>();
  for (const o of orders ?? []) orderBy.set(o.part_id, (orderBy.get(o.part_id) ?? 0) + o.qty);
  const fitsBy = new Map<string, { id: string; model: string }[]>();
  for (const f of fits ?? []) {
    if (!f.watches) continue;
    fitsBy.set(f.part_id, [...(fitsBy.get(f.part_id) ?? []), { id: f.watches.id, model: f.watches.model }]);
  }

  return parts.map((p) => ({
    id: p.id as string,
    sku: p.sku as string,
    name: p.name as string,
    component: p.component as string,
    reorder_at: (p.reorder_at as number | null) ?? 0,
    is_active: (p.is_active as boolean | null) ?? true,
    unit_cost: seeCost ? ((p as { unit_cost?: number | null }).unit_cost ?? null) : null,
    supplier: seeCost ? ((p as { supplier?: string | null }).supplier ?? null) : null,
    stock: stockBy.get(p.id as string) ?? 0,
    waiting_tickets: demandBy.get(p.id as string)?.ticket_count ?? 0,
    waiting_qty: demandBy.get(p.id as string)?.waiting_qty ?? 0,
    on_order_qty: orderBy.get(p.id as string) ?? 0,
    fits: (fitsBy.get(p.id as string) ?? []).sort((a, b) => a.model.localeCompare(b.model)),
  }));
}

export type LedgerRow = {
  id: string;
  qty_delta: number;
  reason: string;
  ticket: { id: string; ticket_number: string; customer_name: string | null } | null;
  note: string | null;
  unit_cost_at_time: number | null;
  actor: string | null;
  created_at: string;
};

export type OpenOrder = { id: string; qty: number; ordered_at: string; expected_at: string | null; note: string | null };

export type WaitingTicket = { id: string; ticket_number: string; customer_name: string | null; stage: string; qty: number };

export type PartDetail = SupplyRow & {
  workspace_id: string;
  ledger: LedgerRow[];
  open_orders: OpenOrder[];
  waiting: WaitingTicket[];
  /** Every watch in the workspace, for the fit editor. */
  watches: { id: string; model: string }[];
  /** Recent tickets in the workspace, for attaching an adjustment to one. */
  tickets: { id: string; ticket_number: string; customer_name: string | null }[];
};

export async function getPartDetail(partId: string, grants: Grant[]): Promise<PartDetail | null> {
  const supabase = await createClient();
  const { data: probe } = await supabase.from("parts_for_bench").select("id, workspace_id").eq("id", partId).maybeSingle();
  if (!probe?.id || !probe.workspace_id) return null;
  const workspaceId = probe.workspace_id;
  const row = (await listSupply(workspaceId, grants)).find((p) => p.id === partId);
  if (!row) return null;
  const seeCost = canSeeCost(grants, workspaceId);

  const ledgerQuery = seeCost
    ? supabase.from("stock_movements").select("id, qty_delta, reason, ticket_id, note, unit_cost_at_time, created_at, created_by").eq("part_id", partId).order("created_at", { ascending: false }).limit(100)
    : supabase.from("stock_movements_for_bench").select("id, qty_delta, reason, ticket_id, note, created_at, created_by").eq("part_id", partId).order("created_at", { ascending: false }).limit(100);

  const [ledgerRes, { data: orders }, { data: waiting }, { data: watches }, { data: recentTickets }] = await Promise.all([
    ledgerQuery,
    supabase.from("part_orders").select("id, qty, ordered_at, expected_at, note").eq("part_id", partId).is("received_at", null).order("ordered_at"),
    supabase.from("ticket_parts").select("qty, tickets!inner(id, ticket_number, customer_name, stage)").eq("part_id", partId).is("stock_movement_id", null).neq("tickets.stage", "closed"),
    supabase.from("watches").select("id, model").eq("workspace_id", workspaceId).eq("is_active", true).order("model"),
    supabase.from("tickets").select("id, ticket_number, customer_name").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(60),
  ]);
  if (ledgerRes.error) throw ledgerRes.error;
  const ledger = (ledgerRes.data ?? []) as { id: string | null; qty_delta: number | null; reason: string | null; ticket_id: string | null; note: string | null; unit_cost_at_time?: number | null; created_at: string | null; created_by: string | null }[];

  const ticketIds = ledger.map((l) => l.ticket_id).filter((id): id is string => !!id);
  const actorIds = ledger.map((l) => l.created_by).filter((id): id is string => !!id);
  const [{ data: tickets }, { data: people }] = await Promise.all([
    ticketIds.length ? supabase.from("tickets").select("id, ticket_number, customer_name").in("id", ticketIds) : Promise.resolve({ data: [] as { id: string; ticket_number: string; customer_name: string | null }[] }),
    actorIds.length ? supabase.from("profiles").select("id, display_name").in("id", actorIds) : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
  ]);
  const ticketBy = new Map((tickets ?? []).map((t) => [t.id, t]));
  const personBy = new Map((people ?? []).map((p) => [p.id, p.display_name]));

  return {
    ...row,
    workspace_id: workspaceId,
    ledger: ledger.flatMap((l) =>
      l.id && l.created_at && l.qty_delta != null && l.reason
        ? [{
            id: l.id,
            qty_delta: l.qty_delta,
            reason: l.reason,
            ticket: l.ticket_id ? (ticketBy.get(l.ticket_id) ?? null) : null,
            note: l.note,
            unit_cost_at_time: seeCost ? (l.unit_cost_at_time ?? null) : null,
            actor: l.created_by ? (personBy.get(l.created_by) ?? null) : null,
            created_at: l.created_at,
          }]
        : [],
    ),
    open_orders: orders ?? [],
    tickets: recentTickets ?? [],
    waiting: (waiting ?? []).map((w) => ({ id: w.tickets.id, ticket_number: w.tickets.ticket_number, customer_name: w.tickets.customer_name, stage: w.tickets.stage, qty: w.qty })),
    watches: watches ?? [],
  };
}

/* ---------------------------------------------------------------- watches */

export type WatchRow = {
  id: string;
  model: string;
  reference: string | null;
  warranty_months: number | null;
  notes: string | null;
  is_active: boolean;
  brands: { id: string; name: string; is_primary: boolean }[];
  parts: { id: string; name: string; sku: string; component: string }[];
  open_tickets: number;
};

/** The workspace's watches as the caller may see them (RLS narrows brand roles to their brands). */
export async function listWatches(workspaceId: string): Promise<WatchRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watches")
    .select("id, model, reference, warranty_months, notes, is_active, watch_brands(is_primary, brands(id, name)), watch_parts(parts_for_bench(id, name, sku, component))")
    .eq("workspace_id", workspaceId)
    .order("model");
  if (error) throw error;
  const ids = (data ?? []).map((w) => w.id);
  const { data: open } = ids.length ? await supabase.from("tickets").select("watch_id").in("watch_id", ids).neq("stage", "closed") : { data: [] };
  const openBy = new Map<string, number>();
  for (const t of open ?? []) openBy.set(t.watch_id, (openBy.get(t.watch_id) ?? 0) + 1);
  return (data ?? []).map((w) => ({
    id: w.id,
    model: w.model,
    reference: w.reference,
    warranty_months: w.warranty_months,
    notes: w.notes,
    is_active: w.is_active,
    brands: w.watch_brands.flatMap((wb) => (wb.brands ? [{ id: wb.brands.id, name: wb.brands.name, is_primary: wb.is_primary }] : [])).sort((a, b) => Number(b.is_primary) - Number(a.is_primary)),
    parts: w.watch_parts
      .flatMap((wp) => (wp.parts_for_bench?.id && wp.parts_for_bench.name && wp.parts_for_bench.sku && wp.parts_for_bench.component ? [{ id: wp.parts_for_bench.id, name: wp.parts_for_bench.name, sku: wp.parts_for_bench.sku, component: wp.parts_for_bench.component }] : []))
      .sort((a, b) => a.name.localeCompare(b.name)),
    open_tickets: openBy.get(w.id) ?? 0,
  }));
}

export type WatchDetail = WatchRow & {
  workspace_id: string;
  /** Every active part in the workspace, for the fit editor (owners/admins). */
  all_parts: { id: string; name: string; sku: string; component: string }[];
  /** Brands in the workspace, for the brand editor. */
  all_brands: { id: string; name: string }[];
  recent_tickets: { id: string; ticket_number: string; customer_name: string | null; stage: string }[];
};

export async function getWatchDetail(watchId: string): Promise<WatchDetail | null> {
  const supabase = await createClient();
  const { data: probe } = await supabase.from("watches").select("id, workspace_id").eq("id", watchId).maybeSingle();
  if (!probe) return null;
  const row = (await listWatches(probe.workspace_id)).find((w) => w.id === watchId);
  if (!row) return null;
  const [{ data: parts }, { data: brands }, { data: tickets }] = await Promise.all([
    supabase.from("parts_for_bench").select("id, name, sku, component").eq("workspace_id", probe.workspace_id).eq("is_active", true).order("name"),
    supabase.from("brands").select("id, name").eq("workspace_id", probe.workspace_id).eq("is_active", true).order("name"),
    supabase.from("tickets").select("id, ticket_number, customer_name, stage").eq("watch_id", watchId).order("updated_at", { ascending: false }).limit(10),
  ]);
  return {
    ...row,
    workspace_id: probe.workspace_id,
    all_parts: (parts ?? []).flatMap((p) => (p.id && p.name && p.sku && p.component ? [{ id: p.id, name: p.name, sku: p.sku, component: p.component }] : [])),
    all_brands: brands ?? [],
    recent_tickets: tickets ?? [],
  };
}
