import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isBenchOnly } from "@/features/auth/permissions";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";
import { STAGE_DEFINITIONS, isAdminOf, type Stage } from "@/features/pipeline";
import { Dashboard } from "@/features/tickets/components/dashboard";
import { listDashboardTickets } from "@/features/tickets/queries";
import { addressLines, getVisibleBrands, getWorkspaceContext, type Address } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "Service Center" };

type Search = { searchParams: Promise<{ view?: string }> };

/** Service Center landing: the dashboard (design 2f/2g). Incoming (2h) waits on the Squarespace sync. */
export default async function ServiceCenterPage({ searchParams }: Search) {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  const [{ current }, brands, { view: rawView }] = await Promise.all([getWorkspaceContext(), getVisibleBrands(), searchParams]);
  if (!current) redirect("/home");
  const view = rawView === "closed" ? "closed" : "open";
  const tickets = await listDashboardTickets(current.id, view);

  const admin = isAdminOf(user.grants, current.id);
  const bench = isBenchOnly(user.grants);
  const rep = !admin && !bench;
  const ownStages: Stage[] = admin
    ? []
    : (Object.values(STAGE_DEFINITIONS).filter((d) => d.owners.some((o) => (bench ? o === "watchmaker" : o === "brand_rep"))).map((d) => d.id) as Stage[]);
  const heading = admin ? current.name : bench ? "My bench" : `Welcome back, ${user.profile.display_name.split(" ")[0]}`;
  const benchAddr = (current.bench_address ?? null) as Address | null;
  const benchAddress = benchAddr && addressLines(benchAddr).length ? { name: benchAddr.name ?? "The bench", lines: addressLines(benchAddr) } : null;

  return (
    <Suspense>
      <Dashboard
        workspaceName={current.name}
        view={view}
        tickets={tickets}
        brands={brands.filter((b) => b.workspace_id === current.id).map((b) => ({ id: b.id, name: b.name }))}
        ownStages={ownStages}
        heading={heading}
        benchAddress={benchAddress}
        showShipTo={rep}
      />
    </Suspense>
  );
}
