import type { Metadata } from "next";
import { listOpenTickets } from "@/features/tickets/queries";
import { getWorkspaceContext } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "Service Center" };

/** Placeholder for the dashboard (design 2f–2h). Shows the count until then. */
export default async function ServiceCenterPage() {
  const { current } = await getWorkspaceContext();
  const open = current ? (await listOpenTickets(current.id)).length : 0;
  return (
    <div className="px-16 py-11">
      <h1 className="text-[28px]">
        {`${current?.name ?? "Pivot"} — ${open} open ticket${open === 1 ? "" : "s"}`}
      </h1>
      <p className="mt-2 text-[14.5px] text-text-2">Pick a ticket on the left. The Overview and Incoming dashboard comes later.</p>
    </div>
  );
}
