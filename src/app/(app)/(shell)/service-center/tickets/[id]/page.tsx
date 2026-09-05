import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";
import { STAGE_DEFINITIONS, isLiveStage } from "@/features/pipeline";
import { TicketFrame } from "@/features/tickets/components/ticket-frame";
import { getTicketDetail } from "@/features/tickets/queries";
import { getWorkspaceContext } from "@/features/workspaces/queries";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const t = await getTicketDetail(id);
  return { title: t ? `${t.ticket_number} · ${t.customer_name ?? ""}` : "Ticket" };
}

export default async function TicketPage({ params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  const t = await getTicketDetail(id);
  if (!t) notFound();
  const { workspaces } = await getWorkspaceContext();
  const ws = workspaces.find((w) => w.id === t.workspace_id);
  const settings = { sendReturnLabelEnabled: ws?.send_return_label_enabled ?? false };

  return (
    <TicketFrame t={t} role={user.profile.role} settings={settings}>
      <CurrentStepPlaceholder stage={t.stage} />
    </TicketFrame>
  );
}

/** Stand-in until each stage's form is built (steps 6–11). */
function CurrentStepPlaceholder({ stage }: { stage: string }) {
  const name = isLiveStage(stage) ? STAGE_DEFINITIONS[stage].name : stage;
  return (
    <div>
      <h2 className="text-[22px]">{name}</h2>
      <p className="mt-2 rounded-lg border border-dashed border-border px-4 py-6 text-center text-[14px] text-text-3">
        The {name} form is the next screen to be built. The action below already checks this stage&rsquo;s requirements.
      </p>
    </div>
  );
}
