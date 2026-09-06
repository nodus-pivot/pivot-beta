import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";
import { TicketSidebar } from "@/features/tickets/components/ticket-sidebar";
import { listOpenTickets, listRecentlyClosed } from "@/features/tickets/queries";
import { getWorkspaceContext } from "@/features/workspaces/queries";

export default async function ServiceCenterLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  const { current } = await getWorkspaceContext();
  const [tickets, closed] = current ? await Promise.all([listOpenTickets(current.id), listRecentlyClosed(current.id)]) : [[], []];
  return (
    <>
      <TicketSidebar tickets={tickets} closed={closed} role={user.profile.role} />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </>
  );
}
