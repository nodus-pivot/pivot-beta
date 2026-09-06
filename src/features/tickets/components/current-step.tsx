import { STAGE_DEFINITIONS, canActOn, isLiveStage, type Role } from "@/features/pipeline";
import { asCategories, asChecks, asConditions, type TicketDetail } from "../detail";
import { getPartsForWatch, getPartsStock } from "../queries";
import { InRepairForm } from "./in-repair-form";
import { ReceivedForm } from "./received-form";
import { RequestPartForm } from "./request-part-form";
import { TestingForm } from "./testing-form";

/** Picks the current stage's form. Stages without a form yet show a placeholder. */
export async function CurrentStep({ t, role }: { t: TicketDetail; role: Role }) {
  if (!isLiveStage(t.stage)) return null;
  const canEdit = canActOn(role, t.stage);

  switch (t.stage) {
    case "received": {
      const catalogParts = await getPartsForWatch(t.watch_id);
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
          parts={t.parts.filter((x) => x.source === "brand").map((x) => ({ id: x.id, part_id: x.part_id, name: x.name, component: x.component, sent_at: x.sent_at }))}
        />
      );
    }
    case "request_part": {
      const brandParts = t.parts.filter((x) => x.source === "brand");
      const stock = await getPartsStock(brandParts.map((x) => x.part_id).filter((id): id is string => !!id));
      return (
        <RequestPartForm
          ticketId={t.id}
          canEdit={canEdit}
          brandName={t.brand.name}
          watchmakerName="The watchmaker"
          parts={brandParts.map((x) => ({
            id: x.id,
            name: x.name,
            sku: x.sku,
            sent_at: x.sent_at,
            tracking_number: x.tracking_number,
            stock: x.part_id ? stock[x.part_id] : undefined,
            available: x.part_id ? (t.stock[x.part_id] ?? 0) >= x.qty : null,
            order: x.part_id ? t.orders[x.part_id] : undefined,
            opsHref: x.part_id ? `/ops/parts/${x.part_id}` : undefined,
          }))}
          requestedAt={t.parts_requested_at}
          snoozedUntil={t.parts_reminder_snoozed_until}
          shipTo={null}
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
    case "testing": {
      const c = asChecks(t.testing_checks);
      return <TestingForm ticketId={t.id} canEdit={canEdit} complete={c.timekeeping && c.water_resistance && c.visual} notes={t.testing_notes} />;
    }
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
