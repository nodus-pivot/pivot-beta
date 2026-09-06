import type { Grant, MemberRole } from "@/features/pipeline";

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  brand_rep: "Brand rep",
  watchmaker: "Watchmaker",
};

const ROLE_RANK: MemberRole[] = ["owner", "admin", "brand_rep", "watchmaker"];

export type ScopeNames = { workspaces: { id: string; name: string }[]; brands: { id: string; name: string }[] };

/**
 * The chip in the top bar: "Owner", "Admin · Nodus", "Watchmaker · Nodus, Sangin".
 * Several roles read "Admin · Nodus + Brand rep · Sangin".
 */
export function grantsLabel(grants: Grant[], names?: ScopeNames): string {
  if (grants.length === 0) return "No access";
  if (grants.some((g) => g.role === "owner")) return "Owner";
  const parts: string[] = [];
  for (const role of ROLE_RANK) {
    const held = grants.filter((g) => g.role === role);
    if (held.length === 0) continue;
    const scopes = held
      .map((g) => (g.workspace_id ? names?.workspaces.find((w) => w.id === g.workspace_id)?.name : names?.brands.find((b) => b.id === g.brand_id)?.name))
      .filter((n): n is string => !!n);
    parts.push(scopes.length ? `${ROLE_LABELS[role]} · ${scopes.join(", ")}` : ROLE_LABELS[role]);
  }
  return parts.join(" + ");
}

/** "today", "1d", "12d" — the sidebar's compact age. */
export function relativeAge(iso: string, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  return `${days}d`;
}
