import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Grant } from "@/features/pipeline";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type CurrentUser = {
  id: string;
  email: string;
  profile: Profile;
  /** Every membership the person holds. Permissions are the union. */
  grants: Grant[];
};

/**
 * The signed-in user with their profile, or null when signed out or when the
 * auth account has no profile row / is deactivated. Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !profile.is_active) return null;

  const { data: memberships } = await supabase.from("memberships").select("role, workspace_id, brand_id").eq("user_id", user.id);
  const grants: Grant[] = (memberships ?? []).map((m) => ({ role: m.role, workspace_id: m.workspace_id, brand_id: m.brand_id }));

  return { id: user.id, email: user.email ?? profile.email, profile, grants };
});
