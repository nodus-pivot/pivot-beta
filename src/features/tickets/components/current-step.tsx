import { STAGE_DEFINITIONS, canActOn, isLiveStage, type Role } from "@/features/pipeline";
import { asConditions, type TicketDetail } from "../detail";
import { getPartsForWatch, getPartsStock } from "../queries";
import { ReceivedForm } from "./received-form";
import { RequestPartForm } from "./request-part-form";

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
          notes={t.intake_notes}
          brandName={t.brand.name}
          catalogParts={catalogParts.map((c) => ({ id: c.id, name: c.name, sku: c.sku }))}
          pendingParts={t.parts.filter((x) => x.source === "brand").map((x) => ({ id: x.id, part_id: x.part_id, name: x.name, sent_at: x.sent_at }))}
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
          }))}
          requestedAt={t.parts_requested_at}
          snoozedUntil={t.parts_reminder_snoozed_until}
          shipTo={null}
        />
      );
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
