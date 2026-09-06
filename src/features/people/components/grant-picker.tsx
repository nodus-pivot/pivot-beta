"use client";

import { useState } from "react";
import { fieldClass, labelClass } from "@/features/ops/components/action-dialog";
import type { MemberRole } from "@/features/pipeline";
import { ROLE_LABELS } from "@/lib/labels";

export type GrantOptions = {
  /** Roles the caller may grant. */
  roles: MemberRole[];
  workspaces: { id: string; name: string }[];
  brands: { id: string; name: string; workspace_id: string }[];
};

const select = `${fieldClass} appearance-none pr-9 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%238A9DB0' stroke-width='1.5'/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_12px_center] bg-no-repeat`;

const ROLE_HELP: Record<MemberRole, string> = {
  owner: "Everything, in every workspace. Creates workspaces and grants any role.",
  admin: "Runs one workspace: Ops, settings, and the brand-level people in it.",
  brand_rep: "Intake and parts for one brand; Watches and Supply read-only.",
  watchmaker: "The bench stages for one brand; Supply read-only, no cost.",
};

/** Role + where it applies. Field names: {prefix}role, {prefix}workspace_id, {prefix}brand_id. */
export function GrantPicker({ options, prefix = "", error }: { options: GrantOptions; prefix?: string; error?: string }) {
  const [role, setRole] = useState<MemberRole>(options.roles.includes("watchmaker") ? "watchmaker" : options.roles[0]);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Role</span>
          <select name={`${prefix}role`} value={role} onChange={(e) => setRole(e.target.value as MemberRole)} className={select}>
            {options.roles.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </label>
        {role === "admin" && (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Workspace</span>
            <select name={`${prefix}workspace_id`} defaultValue={options.workspaces[0]?.id ?? ""} className={select}>
              {options.workspaces.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>
        )}
        {(role === "brand_rep" || role === "watchmaker") && (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Brand</span>
            <select name={`${prefix}brand_id`} defaultValue={options.brands[0]?.id ?? ""} className={select}>
              {options.brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name} · {options.workspaces.find((w) => w.id === b.workspace_id)?.name ?? ""}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="text-[13px] text-text-3">{ROLE_HELP[role]}</p>
      {error && <p className="text-[13px] text-red">{error}</p>}
    </div>
  );
}
