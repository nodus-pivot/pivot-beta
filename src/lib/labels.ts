import type { Grant, MemberRole } from "@/features/pipeline";

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  brand_rep: "Brand rep",
  watchmaker: "Watchmaker",
};

const ROLE_RANK: MemberRole[] = ["owner", "admin", "brand_rep", "watchmaker"];

/** The person's highest role, for the top-bar chip. Round 2 adds the scope names. */
export function grantsLabel(grants: Grant[]): string {
  const top = ROLE_RANK.find((r) => grants.some((g) => g.role === r));
  return top ? ROLE_LABELS[top] : "No access";
}

/** "today", "1d", "12d" — the sidebar's compact age. */
export function relativeAge(iso: string, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  return `${days}d`;
}
