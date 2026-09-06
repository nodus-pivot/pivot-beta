import { redirect } from "next/navigation";
import { AppNav } from "@/components/layout/app-nav";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";
import { getVisibleBrands, getWorkspaceContext } from "@/features/workspaces/queries";
import { grantsLabel } from "@/lib/labels";

/** Every module page: top nav over a full-height content area. */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  const [ws, brands] = await Promise.all([getWorkspaceContext(), getVisibleBrands()]);
  return (
    <div className="flex h-screen flex-col bg-bg text-text">
      <AppNav user={user} ws={ws} brands={brands} />
      {user.viewingAs && (
        <p className="flex-none border-b border-amber-border bg-amber-bg px-5 py-1.5 text-center text-[13px] text-amber">
          Previewing as {grantsLabel(user.grants, { workspaces: ws.workspaces, brands })}. Everything you see and do is with that role&rsquo;s permissions.
        </p>
      )}
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  );
}
