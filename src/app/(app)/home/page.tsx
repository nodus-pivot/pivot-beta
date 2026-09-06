import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PivotMark } from "@/components/brand/pivot-mark";
import { clearViewAs, signOut } from "@/features/auth/actions";
import { getCurrentUser } from "@/features/auth/queries";
import { canOpenOps } from "@/features/auth/permissions";
import { SIGN_IN_PATH } from "@/features/auth/redirect";

export const metadata: Metadata = { title: "Modules" };

const MODULES = [
  { href: "/service-center", title: "Service Center", body: "Claims & repairs" },
  { href: "/ops", title: "Ops", body: "Watches, parts & stock", adminOnly: true },
  { title: "Production", body: "Supply chain — coming soon" },
  { title: "Event Logistics", body: "Coming soon" },
  { title: "Loaners", body: "Press & demo units — coming soon" },
] as const;

/** Design screen 2e: pick a module after signing in. */
export default async function ModulePickerPage() {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  const isAdmin = canOpenOps(user.grants);

  return (
    <div className="flex min-h-screen flex-col items-center bg-canvas px-6 py-14 text-text">
      <div className="flex items-center gap-2.5 text-[19px] font-medium">
        <PivotMark size={26} />
        Pivot
      </div>
      <p className="mt-2 text-[13.5px] text-text-3">Signed in as {user.email}</p>

      <ul className="mt-8 w-full max-w-[560px] divide-y divide-border rounded-[14px] border border-border bg-surface shadow-[0_0_0_1px_var(--pivot-border-strong),0_16px_40px_rgba(0,0,0,.55)]">
        {MODULES.filter((m) => !("adminOnly" in m) || isAdmin).map((m) => {
          const inner = (
            <>
              <span className="block text-[16px] font-medium">{m.title}</span>
              <span className="block text-[13.5px] text-text-3">{m.body}</span>
            </>
          );
          return (
            <li key={m.title}>
              {"href" in m ? (
                <Link href={m.href} className="block px-6 py-4 transition-colors hover:bg-[color-mix(in_srgb,var(--pivot-text)_6%,transparent)]">
                  {inner}
                </Link>
              ) : (
                <div className="px-6 py-4 opacity-50" aria-disabled>
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {user.viewingAs && (
        <form action={clearViewAs} className="mt-6">
          <button type="submit" className="rounded-lg border border-amber-border bg-amber-bg px-3 py-1.5 text-[13.5px] text-amber">
            Previewing as another role · Exit preview
          </button>
        </form>
      )}

      <form action={signOut} className="mt-6">
        <button type="submit" className="text-[13.5px] text-text-3 hover:text-text">
          Sign out
        </button>
      </form>
    </div>
  );
}
