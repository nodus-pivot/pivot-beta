import type { Metadata } from "next";
import Link from "next/link";
import { PivotMark } from "@/components/brand/pivot-mark";
import { StatusLookup, TeamSignInLink } from "@/features/status/components/status-lookup";

export const metadata: Metadata = { title: "Check a repair" };

/** Design 2b/2c: public lookup by ticket number + email, result in place. */
export default function StatusPage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-canvas px-6 py-14 text-text">
      <Link href="/" className="flex items-center gap-2.5 text-[19px] font-medium" aria-label="Pivot home">
        <PivotMark size={26} />
        Pivot
      </Link>
      <main className="mt-10 w-full max-w-[520px] rounded-[14px] border border-border bg-surface p-8 shadow-[0_0_0_1px_var(--pivot-border-strong),0_16px_40px_rgba(0,0,0,.55)]">
        <h1 className="text-[22px]">Check a repair</h1>
        <p className="mt-1.5 mb-6 text-[14.5px] text-text-2">Enter the ticket number from your confirmation and the email you used.</p>
        <StatusLookup />
      </main>
      <p className="mt-6 flex gap-4 text-[13px] text-text-3">
        <a href="https://noduswatches.com" className="hover:text-text">noduswatches.com</a>
        <TeamSignInLink />
      </p>
    </div>
  );
}
