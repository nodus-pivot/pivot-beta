import { STAGE_DEFINITIONS, canActOn, isLiveStage, type Role } from "@/features/pipeline";
import { asConditions, type TicketDetail } from "../detail";
import { ReceivedForm } from "./received-form";

/** Picks the current stage's form. Stages without a form yet show a placeholder. */
export function CurrentStep({ t, role }: { t: TicketDetail; role: Role }) {
  if (!isLiveStage(t.stage)) return null;
  const canEdit = canActOn(role, t.stage);

  switch (t.stage) {
    case "received":
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
          pendingParts={t.parts.filter((x) => x.source === "brand").map((x) => ({ name: x.name, sent_at: x.sent_at }))}
        />
      );
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
