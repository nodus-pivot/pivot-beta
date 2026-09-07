import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/features/auth/actions";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";
import { DisplayNameForm, PasswordForm } from "@/features/account/components/account-forms";
import { getVisibleBrands, getWorkspaceContext } from "@/features/workspaces/queries";
import { grantsLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Account" };

/** Your own account: name and password. Access is granted by owners and admins under Ops › Users. */
export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  const [{ workspaces }, brands] = await Promise.all([getWorkspaceContext(), getVisibleBrands()]);

  return (
    <div className="mx-auto w-full max-w-[720px] px-10 py-9">
      <h1 className="text-[28px]">Account</h1>
      <p className="mt-1 text-[14.5px] text-text-2">
        Signed in as {user.email} · {grantsLabel(user.realGrants, { workspaces, brands })}
      </p>
      <p className="mt-1 text-[13px] text-text-3">
        Your access is set by an owner or admin under <Link href="/ops/users" className="text-accent-text hover:underline">Ops › Users</Link>. Email changes aren&rsquo;t self-serve yet; ask an owner.
      </p>

      <section className="mt-9">
        <h2 className="text-[16px]">Name</h2>
        <div className="mt-3"><DisplayNameForm name={user.profile.display_name} /></div>
      </section>

      <section className="mt-10">
        <h2 className="text-[16px]">Password</h2>
        <p className="mt-1 text-[13.5px] text-text-3">If you were handed a temporary password, replace it here.</p>
        <div className="mt-3"><PasswordForm /></div>
      </section>

      <section className="mt-10 border-t border-border pt-5">
        <form action={signOut}>
          <button type="submit" className="text-[13.5px] text-text-3 hover:text-text">Sign out</button>
        </form>
      </section>
    </div>
  );
}
