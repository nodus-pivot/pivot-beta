import {
  STAGE_DEFINITIONS,
  canActOn,
  emailOnEnter,
  isLiveStage,
  missingFor,
  nextStage,
  previousStage,
  isAdminOf,
  stagesFor,
  type Grant,
  type Stage,
} from "@/features/pipeline";
import { ROLE_LABELS } from "@/lib/labels";
import { stageSummaryRows, toPipelineTicket, type TicketDetail } from "../detail";
import { ActionBlock } from "./action-block";
import { EarlierSteps } from "./earlier-steps";
import { MetaStrip } from "./meta-strip";
import { PipelineRow } from "./pipeline-row";
import { TicketHeader } from "./ticket-header";
import { Timeline } from "./timeline";

type Props = {
  t: TicketDetail;
  grants: Grant[];
  settings: { sendReturnLabelEnabled: boolean };
  /** The current stage's form. */
  children: React.ReactNode;
};

/**
 * The shared ticket page (design 1a–1h): header, pipeline row, meta strip,
 * collapsed earlier steps, the current step (children), action block,
 * timeline. Every stage page renders inside this.
 */
export function TicketFrame({ t, grants, settings, children }: Props) {
  if (!isLiveStage(t.stage)) return <LegacyStage t={t} />;
  const stage: Stage = t.stage;
  const pt = toPipelineTicket(t);
  const stages = stagesFor(pt, settings);
  const idx = stages.indexOf(stage);
  const earlier = stages.slice(0, idx).filter((s) => s !== "intake");
  const next = nextStage(pt, settings);
  const prev = previousStage(pt, settings);
  const def = STAGE_DEFINITIONS[stage];
  const email = next ? emailOnEnter(next) : null;
  const ownerLabel = def.owners.map((r) => ROLE_LABELS[r]).join(" / ") || "Owner";
  const actionLabel = def.actionLabel;
  const scope = { workspaceId: t.workspace_id, brandId: t.brand_id };
  const admin = isAdminOf(grants, t.workspace_id);

  return (
    <article className="mx-auto max-w-[860px] px-16 py-11">
      <TicketHeader t={t} />
      <div className="mt-6">
        <PipelineRow stages={stages} current={stage} />
      </div>
      <div className="mt-5">
        <MetaStrip t={t} />
      </div>

      <div className="mt-8">
        <EarlierSteps t={t} stages={earlier} />
      </div>

      <section className="mt-10">{children}</section>

      <div className="mt-10">
        <ActionBlock
          ticketId={t.id}
          currentName={def.name}
          nextName={next ? STAGE_DEFINITIONS[next].name : null}
          previousName={prev ? STAGE_DEFINITIONS[prev].name : null}
          actionLabel={actionLabel}
          missing={missingFor(pt, { isAdmin: admin })}
          canAct={canActOn(grants, stage, scope)}
          ownerLabel={ownerLabel}
          isClosed={stage === "closed"}
          canReopen={admin}
          email={email ? { name: email.name, to: t.customer_email } : null}
          summary={stageSummaryRows(stage, t)}
          canOverridePayment={admin}
        />
      </div>

      <div className="mt-12">
        <Timeline ticketId={t.id} events={t.events} />
      </div>
    </article>
  );
}

function LegacyStage({ t }: { t: TicketDetail }) {
  return (
    <article className="mx-auto max-w-[860px] px-16 py-11">
      <TicketHeader t={t} />
      <p className="mt-8 rounded-lg border border-amber-border bg-amber-bg px-4 py-3 text-[14px] text-amber">
        This ticket is on the legacy stage “{t.stage}”, which the pipeline no longer uses. An owner can move it to a live stage from Settings once that exists.
      </p>
    </article>
  );
}
