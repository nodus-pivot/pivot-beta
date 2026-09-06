"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canAdministerWorkspace } from "@/features/auth/permissions";
import { getCurrentUser } from "@/features/auth/queries";
import { isOwner } from "@/features/pipeline";
import { createClient } from "@/lib/supabase/server";
import { WORKSPACE_COOKIE, type Address } from "./queries";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Remember the workspace the person is working in. Called directly from the switcher. */
export async function switchWorkspace(raw: { workspaceId: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = z.uuid().safeParse(raw.workspaceId);
  if (!parsed.success) return { ok: false, error: "Unknown workspace." };
  (await cookies()).set(WORKSPACE_COOKIE, parsed.data, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ---------------------------------------------------------------- workspace settings */

export type WsResult = { ok: true; id?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fieldErrors(issues: z.ZodError["issues"]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path[0];
    if (typeof k === "string" && !out[k]) out[k] = i.message;
  }
  return out;
}

const optional = z.string().trim().max(200).transform((v) => v || null);

const addressInput = z.object({
  name: optional,
  line1: optional,
  line2: optional,
  city: optional,
  state: optional,
  postal_code: optional,
  country: optional,
});

function addressFromForm(fd: FormData, prefix: string): z.input<typeof addressInput> {
  const s = (k: string) => String(fd.get(`${prefix}${k}`) ?? "");
  return { name: s("name"), line1: s("line1"), line2: s("line2"), city: s("city"), state: s("state"), postal_code: s("postal_code"), country: s("country") };
}

const workspaceInput = z.object({
  workspaceId: z.uuid(),
  name: z.string().trim().min(1, "Enter a name.").max(120),
  ticket_prefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,6}$/, "1–6 letters or digits."),
  send_from_email: z.string().trim().toLowerCase().transform((v) => v || null).pipe(z.email("Enter a valid email address.").nullable()),
  send_from_name: optional,
  send_return_label_enabled: z.boolean(),
  bench_address: addressInput,
});

async function adminContext(workspaceId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "You're signed out." };
  if (user.viewingAs) return { ok: false as const, error: "Exit the preview to change settings." };
  if (!canAdministerWorkspace(user.grants, workspaceId)) return { ok: false as const, error: "Only owners and admins change workspace settings." };
  return { ok: true as const, user, supabase: await createClient() };
}

/** Operating details. The prefix affects new tickets only. */
export async function updateWorkspace(_prev: WsResult | null, fd: FormData): Promise<WsResult> {
  const parsed = workspaceInput.safeParse({
    workspaceId: fd.get("workspace_id"),
    name: fd.get("name") ?? "",
    ticket_prefix: fd.get("ticket_prefix") ?? "",
    send_from_email: fd.get("send_from_email") ?? "",
    send_from_name: fd.get("send_from_name") ?? "",
    send_return_label_enabled: fd.get("send_return_label_enabled") === "on",
    bench_address: addressFromForm(fd, "bench_"),
  });
  if (!parsed.success) return { ok: false, error: "Fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const input = parsed.data;
  const ctx = await adminContext(input.workspaceId);
  if (!ctx.ok) return ctx;
  const address: Address | null = Object.values(input.bench_address).some(Boolean) ? input.bench_address : null;
  const { error } = await ctx.supabase
    .from("workspaces")
    .update({ name: input.name, ticket_prefix: input.ticket_prefix, send_from_email: input.send_from_email, send_from_name: input.send_from_name, send_return_label_enabled: input.send_return_label_enabled, bench_address: address })
    .eq("id", input.workspaceId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "workspace";
}

const newWorkspaceInput = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120),
  ticket_prefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,6}$/, "1–6 letters or digits."),
  first_brand: z.string().trim().min(1, "Every workspace needs at least one brand.").max(120),
});

/** Owners only. Creates the workspace and its first brand, then switches to it. */
export async function createWorkspace(_prev: WsResult | null, fd: FormData): Promise<WsResult> {
  const parsed = newWorkspaceInput.safeParse({ name: fd.get("name") ?? "", ticket_prefix: fd.get("ticket_prefix") ?? "", first_brand: fd.get("first_brand") ?? "" });
  if (!parsed.success) return { ok: false, error: "Fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You're signed out." };
  if (user.viewingAs || !isOwner(user.realGrants)) return { ok: false, error: "Only owners create workspaces." };
  const supabase = await createClient();
  const base = slugify(parsed.data.name);
  let slug = base;
  for (let n = 2; n < 20; n++) {
    const { data } = await supabase.from("workspaces").select("id").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${n}`;
  }
  const { data: ws, error } = await supabase.from("workspaces").insert({ name: parsed.data.name, slug, ticket_prefix: parsed.data.ticket_prefix }).select("id").single();
  if (error) return { ok: false, error: error.message };
  const { error: e2 } = await supabase.from("brands").insert({ workspace_id: ws.id, name: parsed.data.first_brand, slug: slugify(parsed.data.first_brand) });
  if (e2) return { ok: false, error: `Workspace created, but the brand failed: ${e2.message}` };
  (await cookies()).set(WORKSPACE_COOKIE, ws.id, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { ok: true, id: ws.id };
}

/* ---------------------------------------------------------------- brands */

const brandInput = z.object({ workspaceId: z.uuid(), name: z.string().trim().min(1, "Enter a name.").max(120) });

export async function createBrand(_prev: WsResult | null, fd: FormData): Promise<WsResult> {
  const parsed = brandInput.safeParse({ workspaceId: fd.get("workspace_id"), name: fd.get("name") ?? "" });
  if (!parsed.success) return { ok: false, error: "Fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const ctx = await adminContext(parsed.data.workspaceId);
  if (!ctx.ok) return ctx;
  const base = slugify(parsed.data.name);
  let slug = base;
  for (let n = 2; n < 20; n++) {
    const { data } = await ctx.supabase.from("brands").select("id").eq("workspace_id", parsed.data.workspaceId).eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${n}`;
  }
  const { error } = await ctx.supabase.from("brands").insert({ workspace_id: parsed.data.workspaceId, name: parsed.data.name, slug });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

const brandEditInput = z.object({ brandId: z.uuid(), name: z.string().trim().min(1, "Enter a name.").max(120) });

export async function renameBrand(_prev: WsResult | null, fd: FormData): Promise<WsResult> {
  const parsed = brandEditInput.safeParse({ brandId: fd.get("brand_id"), name: fd.get("name") ?? "" });
  if (!parsed.success) return { ok: false, error: "Enter a name.", fieldErrors: { name: "Enter a name." } };
  const supabase = await createClient();
  const { data: brand } = await supabase.from("brands").select("workspace_id").eq("id", parsed.data.brandId).maybeSingle();
  if (!brand) return { ok: false, error: "Brand not found." };
  const ctx = await adminContext(brand.workspace_id);
  if (!ctx.ok) return ctx;
  const { error } = await ctx.supabase.from("brands").update({ name: parsed.data.name }).eq("id", parsed.data.brandId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setBrandActive(raw: { brandId: string; active: boolean }): Promise<WsResult> {
  const id = z.uuid().safeParse(raw.brandId);
  if (!id.success) return { ok: false, error: "Reload and try again." };
  const supabase = await createClient();
  const { data: brand } = await supabase.from("brands").select("workspace_id").eq("id", id.data).maybeSingle();
  if (!brand) return { ok: false, error: "Brand not found." };
  const ctx = await adminContext(brand.workspace_id);
  if (!ctx.ok) return ctx;
  const { error } = await ctx.supabase.from("brands").update({ is_active: !!raw.active }).eq("id", id.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
