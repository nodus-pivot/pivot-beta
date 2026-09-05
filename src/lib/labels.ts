import type { Role } from "@/features/pipeline";

export const ROLE_LABELS: Record<Role, string> = {
  workspace_admin: "Owner",
  watchmaker: "Watchmaker",
  brand_rep: "Brand rep",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

/** "today", "1d", "12d" — the sidebar's compact age. */
export function relativeAge(iso: string, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  return `${days}d`;
}
