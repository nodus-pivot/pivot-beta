import Link from "next/link";
import { PivotMark } from "@/components/brand/pivot-mark";

/**
 * Centered 440px card on the canvas background. Shared by sign-in and, later,
 * the customer status lookup (design screens 2b and 2d).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-canvas px-6 py-14 text-text">
      <Link href="/" className="flex items-center gap-2.5 text-[19px] font-medium" aria-label="Pivot home">
        <PivotMark size={26} />
        Pivot
      </Link>
      <main className="mt-10 w-full max-w-[440px] rounded-[14px] border border-border bg-surface p-8 shadow-[0_0_0_1px_var(--pivot-border-strong),0_16px_40px_rgba(0,0,0,.55)]">
        {children}
      </main>
    </div>
  );
}
