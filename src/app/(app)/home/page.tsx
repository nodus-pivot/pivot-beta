import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PivotMark } from "@/components/brand/pivot-mark";
import { signOut } from "@/features/auth/actions";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";

export const metadata: Metadata = { title: "Home" };

/**
 * Temporary landing spot after sign-in so the auth loop can be exercised end
 * to end. Replaced by the module picker (design screen 2e).
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-6 text-text">
      <PivotMark size={40} />
      <div className="text-center">
        <h1 className="text-[22px]">Signed in as {user.profile.display_name}</h1>
        <p className="mt-1 text-[14.5px] text-text-2">
          {user.email} · <span className="font-mono text-[13px]">{user.profile.role}</span>
        </p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-lg border border-border-strong px-4 text-[14px] text-text-2 transition-colors hover:border-accent-text hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
