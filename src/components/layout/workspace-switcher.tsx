"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { switchWorkspace } from "@/features/workspaces/actions";
import type { Workspace } from "@/features/workspaces/queries";

/** Where to land after switching: the root of the section you're in, so a ticket or part from the old workspace isn't left open. */
function sectionRoot(pathname: string): string {
  if (pathname.startsWith("/ops")) return "/ops/supply";
  if (pathname.startsWith("/service-center")) return "/service-center";
  return pathname;
}

export function WorkspaceSwitcher({ workspaces, currentId }: { workspaces: Workspace[]; currentId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(currentId);
  const [pending, start] = useTransition();
  if (workspaces.length < 2) return null;

  function change(id: string) {
    setValue(id);
    start(async () => {
      const r = await switchWorkspace({ workspaceId: id });
      if (!r.ok) {
        setValue(currentId);
        return;
      }
      router.push(sectionRoot(pathname));
      router.refresh();
    });
  }

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => change(e.target.value)}
      aria-label="Workspace"
      className="h-8 rounded-lg border border-border-strong bg-transparent px-2 text-[13px] text-text-2 focus:border-accent focus:outline-none disabled:opacity-60"
    >
      {workspaces.map((w) => (
        <option key={w.id} value={w.id} className="bg-surface text-text">
          {w.name}
        </option>
      ))}
    </select>
  );
}
