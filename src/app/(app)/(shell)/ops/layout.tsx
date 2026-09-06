import { redirect } from "next/navigation";
import { canOpenOpsPage, type OpsPage } from "@/features/auth/permissions";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";
import { getVisibleBrands, getWorkspaceContext } from "@/features/workspaces/queries";
import { OpsTabs } from "./tabs";

const PAGES: { page: OpsPage; href: string; label: string; body: string }[] = [
  { page: "supply", href: "/ops/supply", label: "Supply", body: "Parts, stock, reorders" },
  { page: "watches", href: "/ops/watches", label: "Watches", body: "Models and what fits them" },
  { page: "users", href: "/ops/users", label: "Users", body: "People and their access" },
  { page: "workspace", href: "/ops/workspace", label: "Workspace", body: "Operating details and brands" },
];

/** Ops: everything operations, one workspace at a time. Tabs show only what the person may open. */
export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  const [{ current }, brands] = await Promise.all([getWorkspaceContext(), getVisibleBrands()]);
  if (!current) redirect("/home");
  const brandWorkspace = (id: string) => brands.find((b) => b.id === id)?.workspace_id;
  const tabs = PAGES.filter((p) => canOpenOpsPage(user.grants, p.page, current.id, brandWorkspace));
  if (tabs.length === 0) redirect("/home");

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-[220px] flex-none border-r border-border bg-surface px-3 py-5">
        <p className="px-3 pb-3 text-[11.5px] font-medium uppercase tracking-[0.06em] text-text-3">Ops · {current.name}</p>
        <OpsTabs tabs={tabs.map(({ href, label, body }) => ({ href, label, body }))} />
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
