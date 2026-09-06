import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";
import { canCreateAnyTicket } from "@/features/auth/permissions";
import { IntakeForm } from "@/features/tickets/components/intake-form";
import { getIntakeCatalog } from "@/features/tickets/queries";
import { getWorkspaceContext } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "New ticket" };

/** Blank Intake (design 1a): the first pipeline step, as a page. */
export default async function NewTicketPage() {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  const { current } = await getWorkspaceContext();
  if (!current) redirect("/service-center");
  if (!canCreateAnyTicket(user.grants, current.id)) redirect("/service-center");
  const catalog = await getIntakeCatalog(current.id);

  return (
    <div className="px-16 py-11">
      <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-accent-text">Step 1 · Intake</p>
      <h1 className="mt-2 text-[28px]">New ticket</h1>
      <p className="mt-2 max-w-[60ch] text-[14.5px] text-text-2">
        Enter the customer and the watch, then create the ticket. It lands in Received &amp; Diagnostics for the watchmaker.
      </p>
      <div className="mt-10">
        <IntakeForm brands={catalog.brands} watches={catalog.watches} />
      </div>
    </div>
  );
}
