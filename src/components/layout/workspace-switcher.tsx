"use client";

import { useRef } from "react";
import { switchWorkspace } from "@/features/workspaces/actions";
import type { Workspace } from "@/features/workspaces/queries";

export function WorkspaceSwitcher({ workspaces, currentId }: { workspaces: Workspace[]; currentId: string }) {
  const form = useRef<HTMLFormElement>(null);
  if (workspaces.length < 2) return null;
  return (
    <form ref={form} action={switchWorkspace}>
      <select
        name="workspace_id"
        defaultValue={currentId}
        onChange={() => form.current?.requestSubmit()}
        aria-label="Workspace"
        className="h-8 rounded-lg border border-border-strong bg-transparent px-2 text-[13px] text-text-2 focus:border-accent focus:outline-none"
      >
        {workspaces.map((w) => (
          <option key={w.id} value={w.id} className="bg-surface text-text">
            {w.name}
          </option>
        ))}
      </select>
    </form>
  );
}
