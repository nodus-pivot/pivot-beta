"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/queries";
import { MIN_PASSWORD_LENGTH } from "@/features/auth/schema";
import { createClient } from "@/lib/supabase/server";

export type AccountResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const nameInput = z.object({ display_name: z.string().trim().min(1, "Enter your name.").max(120) });

/** Your own display name. The profiles policy allows exactly this column for self. */
export async function updateDisplayName(_prev: AccountResult | null, fd: FormData): Promise<AccountResult> {
  const parsed = nameInput.safeParse({ display_name: fd.get("display_name") ?? "" });
  if (!parsed.success) return { ok: false, error: "Enter your name.", fieldErrors: { display_name: "Enter your name." } };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You're signed out." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ display_name: parsed.data.display_name }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

const passwordInput = z
  .object({
    password: z.string().min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters.`).max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The two passwords don't match." });

/** Your own password. Replaces the temporary one an owner handed you. */
export async function changePassword(_prev: AccountResult | null, fd: FormData): Promise<AccountResult> {
  const parsed = passwordInput.safeParse({ password: fd.get("password") ?? "", confirm: fd.get("confirm") ?? "" });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0];
      if (typeof k === "string" && !fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { ok: false, error: "Fix the highlighted fields.", fieldErrors };
  }
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You're signed out." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: /same/i.test(error.message) ? "That's already your password." : error.message };
  return { ok: true };
}
