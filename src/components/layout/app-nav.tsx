import Link from "next/link";
import { PivotMark } from "@/components/brand/pivot-mark";
import type { CurrentUser } from "@/features/auth/queries";
import { canOpenOps, canUseViewAs } from "@/features/auth/permissions";
import type { BrandOption, WorkspaceContext } from "@/features/workspaces/queries";
import { grantsLabel } from "@/lib/labels";
import { ViewAsControl } from "./view-as-control";
import { NavLinks } from "./nav-links";
import { WorkspaceSwitcher } from "./workspace-switcher";

/**
 * Top bar shared by every signed-in module: Service Center · Ops (owners)
 * · Report · Settings, workspace switcher, then user + role linking back to
 * the module picker (where Sign out lives).
 */
export function AppNav({ user, ws, brands }: { user: CurrentUser; ws: WorkspaceContext; brands: BrandOption[] }) {
  const initial = (user.profile.display_name.trim()[0] ?? "?").toUpperCase();
  return (
    <header className="flex h-14 flex-none items-center gap-6 border-b border-border bg-bg px-5">
      <Link href="/home" className="flex items-center gap-2 text-[17px] font-medium" aria-label="Pivot modules">
        <PivotMark size={22} />
        Pivot
      </Link>
      <NavLinks isAdmin={canOpenOps(user.grants)} />
      <div className="ml-auto flex items-center gap-4">
        {ws.current && <WorkspaceSwitcher workspaces={ws.workspaces} currentId={ws.current.id} />}
        {canUseViewAs(user.realGrants) && <ViewAsControl active={user.viewingAs} workspaces={ws.workspaces} brands={brands} />}
        <Link href="/home" className="flex items-center gap-2.5 text-[13.5px] text-text-2 hover:text-text">
          <span>
            {user.profile.display_name} · {grantsLabel(user.grants, { workspaces: ws.workspaces, brands })}
          </span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-800 text-[12px] font-medium text-accent-text">
            {initial}
          </span>
        </Link>
      </div>
    </header>
  );
}
