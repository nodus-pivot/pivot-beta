import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";
import { CurrentStep } from "@/features/tickets/components/current-step";
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
      <CurrentStep t={t} role={user.profile.role} />
    </TicketFrame>
  );
}
