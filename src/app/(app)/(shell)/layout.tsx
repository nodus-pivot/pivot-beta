import { redirect } from "next/navigation";
import { AppNav } from "@/components/layout/app-nav";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";
import { getWorkspaceContext } from "@/features/workspaces/queries";

/** Every module page: top nav over a full-height content area. */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  const ws = await getWorkspaceContext();
  return (
    <div className="flex h-screen flex-col bg-bg text-text">
      <AppNav user={user} ws={ws} />
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  );
}
