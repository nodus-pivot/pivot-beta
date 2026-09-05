import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getCurrentUser } from "@/features/auth/queries";
import { AFTER_SIGN_IN_PATH } from "@/features/auth/redirect";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await getCurrentUser()) redirect(AFTER_SIGN_IN_PATH);

  return (
    <>
      <h1 className="text-[22px]">Sign in</h1>
      <p className="mt-1.5 text-[14.5px] text-text-2">Team access only. Ask an admin if you need an account.</p>
      <div className="mt-6">
        <SignInForm />
      </div>
      <p className="mt-6 border-t border-border pt-5 text-[13px] text-text-3">
        Checking on a repair?{" "}
        <Link href="/status" className="text-accent-text hover:underline">
          Look up your ticket
        </Link>
      </p>
    </>
  );
}
