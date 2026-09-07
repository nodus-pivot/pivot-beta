import { STAGE_DEFINITIONS, canActOn, isLiveStage, type Grant } from "@/features/pipeline";
import { asCategories, asChecks, asConditions, type TicketDetail } from "../detail";
import type { ReturnAddress } from "../schema";
import { getPartsForWatch } from "../queries";
import { createClient } from "@/lib/supabase/server";
import { ClosedSummary } from "./closed-summary";
import { InRepairForm } from "./in-repair-form";
import { IntakeStageForm } from "./intake-stage-form";
import { ReceivedForm } from "./received-form";
import { WaitingForParts } from "./waiting-for-parts";
import { ReturnHomeForm } from "./return-home-form";
import { TestingForm } from "./testing-form";

/** Picks the current stage's form. Stages without a form yet show a placeholder. */
export async function CurrentStep({ t, grants }: { t: TicketDetail; grants: Grant[] }) {
  if (!isLiveStage(t.stage)) return null;
  const canEdit = canActOn(grants, t.stage, { workspaceId: t.workspace_id, brandId: t.brand_id });

  switch (t.stage) {
    case "intake": {
      const supabase = await createClient();
      const { data: fits } = await supabase.from("watch_brands").select("watches(id, model, reference)").eq("brand_id", t.brand_id);
      const watches = (fits ?? []).flatMap((f) => (f.watches && f.watches.id ? [{ id: f.watches.id, model: f.watches.model, reference: f.watches.reference }] : [])).sort((a, b) => a.model.localeCompare(b.model));
      return (
        <IntakeStageForm
          ticketId={t.id}
          canEdit={canEdit}
          brandName={t.brand.name}
          watches={watches}
          origin={t.customer_watch_description ? "website" : "staff"}
          values={{
            customer_name: t.customer_name ?? "",
            customer_email: t.customer_email ?? "",
            customer_phone: t.customer_phone ?? "",
            watch_id: t.watch_id,
            watch_serial: t.watch_serial ?? "",
            issue_description: t.issue_description ?? "",
            return_address: (t.return_address as ReturnAddress | null) ?? null,
            requires_payment: t.requires_payment,
            priority: t.priority,
          }}
        />
      );
    }
    case "received": {
      const catalogParts = await getPartsForWatch(t.watch_id);
      const supabase = await createClient();
      const ids = catalogParts.map((c) => c.id);
      const [{ data: levels }, { data: open }] = ids.length
        ? await Promise.all([
            supabase.from("parts_stock").select("part_id, stock_qty").in("part_id", ids),
            supabase.from("part_orders").select("part_id, ordered_at, expected_at").in("part_id", ids).is("received_at", null).order("ordered_at"),
          ])
        : [{ data: [] }, { data: [] }];
      const availability: Record<string, { inStock: boolean; order: { ordered_at: string; expected_at: string | null } | null }> = {};
      for (const id of ids) availability[id] = { inStock: false, order: null };
      for (const l of levels ?? []) if (l.part_id) availability[l.part_id] = { inStock: (l.stock_qty ?? 0) > 0, order: null };
      for (const o of open ?? []) if (availability[o.part_id] && !availability[o.part_id].order) availability[o.part_id].order = { ordered_at: o.ordered_at, expected_at: o.expected_at };
      return (
        <ReceivedForm
          ticketId={t.id}
          canEdit={canEdit}
          watchModel={t.watch.model}
          issue={t.issue_description}
          receivedAt={t.watch_received_at}
          conditions={asConditions(t.intake_components)}
          categories={asCategories(t.repair_categories)}
          notes={t.intake_notes}
          brandName={t.brand.name}
          catalogParts={catalogParts}
          availability={availability}
          parts={t.parts.filter((x) => x.source === "brand").map((x) => ({ id: x.id, part_id: x.part_id, name: x.name, component: x.component, sent_at: x.sent_at }))}
        />
      );
    }
    case "request_part": {
      const brandParts = t.parts.filter((x) => x.source === "brand");
      return (
        <WaitingForParts
          brandName={t.brand.name}
          parts={brandParts.map((x) => ({
            id: x.id,
            name: x.name,
            sku: x.sku,
            available: x.part_id ? (t.stock[x.part_id] ?? 0) >= x.qty : null,
            order: x.part_id ? (t.orders[x.part_id] ?? null) : null,
            opsHref: x.part_id ? `/ops/parts/${x.part_id}` : null,
          }))}
        />
      );
    }
    case "in_repair": {
      const catalogParts = await getPartsForWatch(t.watch_id);
      return (
        <InRepairForm
          ticketId={t.id}
          canEdit={canEdit}
          categories={asCategories(t.repair_categories)}
          parts={t.parts.map((x) => ({ id: x.id, part_id: x.part_id, name: x.name, sku: x.sku, component: x.component, sent_at: x.sent_at, consumed: !!x.stock_movement_id }))}
          catalogParts={catalogParts}
          solutionNotes={t.solution_notes}
          timeSpentMinutes={t.time_spent_minutes}
          coverage={t.coverage as "warranty" | "paid" | null}
          repairComplete={t.repair_complete}
          requiresPayment={t.requires_payment}
        />
      );
    }
    case "testing":
      return <TestingForm ticketId={t.id} canEdit={canEdit} checks={asChecks(t.testing_checks)} notes={t.testing_notes} />;
    case "shipped_back": {
      const out = t.shipments.find((x) => x.direction === "outbound" && x.source === "manual");
      return (
        <ReturnHomeForm
          ticketId={t.id}
          canEdit={canEdit}
          customerName={t.customer_name}
          customerEmail={t.customer_email}
          customerPhone={t.customer_phone}
          address={(t.return_address as ReturnAddress | null) ?? null}
          pendingAddress={(t.pending_return_address as ReturnAddress | null) ?? null}
          requiresPayment={t.requires_payment}
          paymentStatus={t.payment_status as "none" | "invoiced" | "paid"}
          signatureRequired={t.signature_required}
          inPersonHandoff={t.in_person_handoff}
          tracking={out ? { carrier: out.carrier_code, number: out.tracking_number } : null}
        />
      );
    }
    case "closed":
      return <ClosedSummary t={t} />;
    default: {
      const name = STAGE_DEFINITIONS[t.stage].name;
      return (
        <div>
          <h2 className="text-[22px]">{name}</h2>
          <p className="mt-2 rounded-lg border border-dashed border-border px-4 py-6 text-center text-[14px] text-text-3">
            The {name} form is the next screen to be built. The action below already checks this stage&rsquo;s requirements.
          </p>
        </div>
      );
    }
  }
}
