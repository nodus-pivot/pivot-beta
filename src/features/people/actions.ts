"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canManageGrant, canManagePerson, isAnyAdmin } from "@/features/auth/permissions";
import { getCurrentUser } from "@/features/auth/queries";
import type { Grant } from "@/features/pipeline";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PeopleResult =
  | { ok: true; temporaryPassword?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** 16 url-safe characters, above the 12-character minimum. Shown once, never stored by us. */
function temporaryPassword(): string {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

const grantSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("owner") }),
  z.object({ role: z.literal("admin"), workspace_id: z.uuid() }),
  z.object({ role: z.enum(["brand_rep", "watchmaker"]), brand_id: z.uuid() }),
]);

function toGrant(g: z.infer<typeof grantSchema>): Grant {
  if (g.role === "owner") return { role: "owner", workspace_id: null, brand_id: null };
  if (g.role === "admin") return { role: "admin", workspace_id: g.workspace_id, brand_id: null };
  return { role: g.role, workspace_id: null, brand_id: g.brand_id };
}

function grantFromForm(fd: FormData, prefix = "") {
  const role = String(fd.get(`${prefix}role`) ?? "");
  return { role, workspace_id: String(fd.get(`${prefix}workspace_id`) ?? ""), brand_id: String(fd.get(`${prefix}brand_id`) ?? "") };
}

async function context() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "You're signed out." };
  if (user.viewingAs) return { ok: false as const, error: "Exit the preview to manage people." };
  if (!isAnyAdmin(user.realGrants)) return { ok: false as const, error: "Only owners and admins manage people." };
  const supabase = await createClient();
  const { data: brands } = await supabase.from("brands").select("id, workspace_id");
  const brandWorkspace = (id: string) => brands?.find((b) => b.id === id)?.workspace_id;
  return { ok: true as const, user, supabase, brandWorkspace };
}

async function personGrants(supabase: Awaited<ReturnType<typeof createClient>>, personId: string): Promise<Grant[]> {
  const { data } = await supabase.from("memberships").select("role, workspace_id, brand_id").eq("user_id", personId);
  return (data ?? []).map((m) => ({ role: m.role, workspace_id: m.workspace_id, brand_id: m.brand_id }));
}

/* ---------------------------------------------------------------- create */

const personInput = z.object({
  display_name: z.string().trim().min(1, "Enter their name.").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  grants: z.array(grantSchema).min(1, "Give them at least one role.").max(20),
});

/** Rows come in as g0_role, g0_brand_id, g1_role, … in order. */
function grantsFromForm(fd: FormData) {
  const out = [];
  for (let i = 0; fd.has(`g${i}_role`); i++) out.push(grantFromForm(fd, `g${i}_`));
  return out;
}

/**
 * Add a person: auth account (service role), profile row (service role: no
 * insert policy by design), first grant (as the caller, so RLS checks the
 * right). Returns the temporary password to hand over directly.
 */
export async function createPerson(_prev: PeopleResult | null, fd: FormData): Promise<PeopleResult> {
  const parsed = personInput.safeParse({ display_name: fd.get("display_name") ?? "", email: fd.get("email") ?? "", grants: grantsFromForm(fd) });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0];
      if (typeof k === "string" && !fieldErrors[k]) fieldErrors[k] = k === "grants" ? "Pick a role and where it applies on every row." : i.message;
    }
    return { ok: false, error: "Fix the highlighted fields.", fieldErrors };
  }
  const ctx = await context();
  if (!ctx.ok) return ctx;
  // Dedupe identical rows, then check every one against the caller's right to grant it.
  const seen = new Set<string>();
  const grants = parsed.data.grants.map(toGrant).filter((g) => {
    const key = `${g.role}|${g.workspace_id ?? ""}|${g.brand_id ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const refused = grants.find((g) => !canManageGrant(ctx.user.realGrants, g, ctx.brandWorkspace));
  if (refused) return { ok: false, error: "You can't grant one of those roles.", fieldErrors: { grants: "One row is outside your workspaces." } };

  const admin = createAdminClient();
  const password = temporaryPassword();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password,
    email_confirm: true,
    user_metadata: { display_name: parsed.data.display_name },
  });
  if (error || !created.user) {
    const exists = /already|registered|exists/i.test(error?.message ?? "");
    return { ok: false, error: exists ? "Someone already has that email." : (error?.message ?? "Could not create the account."), fieldErrors: exists ? { email: "Already in use." } : undefined };
  }
  const { error: e2 } = await admin.from("profiles").insert({ id: created.user.id, email: parsed.data.email, display_name: parsed.data.display_name });
  if (e2) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: e2.message };
  }
  const { error: e3 } = await ctx.supabase.from("memberships").insert(grants.map((g) => ({ user_id: created.user.id, ...g, created_by: ctx.user.id })));
  if (e3) return { ok: false, error: `Account created, but the grants failed: ${e3.message}` };
  revalidatePath("/ops/users");
  return { ok: true, temporaryPassword: password };
}

/* ---------------------------------------------------------------- grants */

const grantInput = z.object({ personId: z.uuid(), grant: grantSchema });

export async function addGrant(_prev: PeopleResult | null, fd: FormData): Promise<PeopleResult> {
  const parsed = grantInput.safeParse({ personId: fd.get("person_id"), grant: grantFromForm(fd) });
  if (!parsed.success) return { ok: false, error: "Pick a role and where it applies.", fieldErrors: { grant: "Pick a role and where it applies." } };
  const ctx = await context();
  if (!ctx.ok) return ctx;
  const grant = toGrant(parsed.data.grant);
  if (!canManageGrant(ctx.user.realGrants, grant, ctx.brandWorkspace)) return { ok: false, error: "You can't grant that role." };
  const { error } = await ctx.supabase.from("memberships").insert({ user_id: parsed.data.personId, ...grant, created_by: ctx.user.id });
  if (error) return { ok: false, error: error.code === "23505" ? "They already hold that." : error.message };
  revalidatePath("/ops/users");
  return { ok: true };
}

export async function removeGrant(raw: { membershipId: string }): Promise<PeopleResult> {
  const id = z.uuid().safeParse(raw.membershipId);
  if (!id.success) return { ok: false, error: "Reload and try again." };
  const ctx = await context();
  if (!ctx.ok) return ctx;
  // RLS refuses grants the caller may not manage and the caller's own rows; we just report.
  const { data, error } = await ctx.supabase.from("memberships").delete().eq("id", id.data).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "You can't remove that grant." };
  revalidatePath("/ops/users");
  return { ok: true };
}

/* ---------------------------------------------------------------- active / password */

export async function setPersonActive(raw: { personId: string; active: boolean }): Promise<PeopleResult> {
  const id = z.uuid().safeParse(raw.personId);
  if (!id.success) return { ok: false, error: "Reload and try again." };
  const ctx = await context();
  if (!ctx.ok) return ctx;
  const grants = await personGrants(ctx.supabase, id.data);
  if (!canManagePerson(ctx.user.realGrants, ctx.user.id, id.data, grants, ctx.brandWorkspace)) return { ok: false, error: "You can't change that person." };
  const { data: prof } = await ctx.supabase.from("profiles").select("display_name").eq("id", id.data).maybeSingle();
  if (!prof) return { ok: false, error: "Person not found." };
  const { error } = await ctx.supabase.rpc("admin_update_profile", { p_user: id.data, p_display_name: prof.display_name, p_is_active: !!raw.active });
  if (error) return { ok: false, error: error.message };
  // Deactivating also shuts the door at Auth: a banned account can't refresh its session.
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(id.data, { ban_duration: raw.active ? "none" : "876000h" });
  revalidatePath("/ops/users");
  return { ok: true };
}

export async function resetPassword(raw: { personId: string }): Promise<PeopleResult> {
  const id = z.uuid().safeParse(raw.personId);
  if (!id.success) return { ok: false, error: "Reload and try again." };
  const ctx = await context();
  if (!ctx.ok) return ctx;
  const grants = await personGrants(ctx.supabase, id.data);
  if (!canManagePerson(ctx.user.realGrants, ctx.user.id, id.data, grants, ctx.brandWorkspace)) return { ok: false, error: "You can't change that person." };
  const password = temporaryPassword();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id.data, { password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, temporaryPassword: password };
}

const renameInput = z.object({ personId: z.uuid(), display_name: z.string().trim().min(1, "Enter a name.").max(120) });

export async function renamePerson(_prev: PeopleResult | null, fd: FormData): Promise<PeopleResult> {
  const parsed = renameInput.safeParse({ personId: fd.get("person_id"), display_name: fd.get("display_name") ?? "" });
  if (!parsed.success) return { ok: false, error: "Enter a name.", fieldErrors: { display_name: "Enter a name." } };
  const ctx = await context();
  if (!ctx.ok) return ctx;
  const grants = await personGrants(ctx.supabase, parsed.data.personId);
  if (!canManagePerson(ctx.user.realGrants, ctx.user.id, parsed.data.personId, grants, ctx.brandWorkspace)) return { ok: false, error: "You can't change that person." };
  const { data: prof } = await ctx.supabase.from("profiles").select("is_active").eq("id", parsed.data.personId).maybeSingle();
  if (!prof) return { ok: false, error: "Person not found." };
  const { error } = await ctx.supabase.rpc("admin_update_profile", { p_user: parsed.data.personId, p_display_name: parsed.data.display_name, p_is_active: prof.is_active });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ops/users");
  return { ok: true };
}
