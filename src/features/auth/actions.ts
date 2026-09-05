"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInSchema } from "./schema";
import { AFTER_SIGN_IN_PATH, SIGN_IN_PATH } from "./redirect";

/** `email` echoes the submitted value so the field survives a failed attempt. */
export type SignInState = { error?: string; email?: string };

const WRONG_CREDENTIALS = "Wrong email or password.";
const DEACTIVATED = "This account has been deactivated.";

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? WRONG_CREDENTIALS, email };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    // Every auth failure gets the same message so the form never confirms
    // whether an email exists.
    return { error: WRONG_CREDENTIALS, email };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: DEACTIVATED, email };
  }

  redirect(AFTER_SIGN_IN_PATH);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(SIGN_IN_PATH);
}
