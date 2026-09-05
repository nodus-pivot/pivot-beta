import Link from "next/link";
import { PivotMark } from "@/components/brand/pivot-mark";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <PivotMark size={32} />
      <h1 className="text-[22px]">This page isn&rsquo;t built yet.</h1>
      <p className="max-w-[40ch] text-[14.5px] text-text-2">Pivot is being rebuilt one screen at a time. This one is on the list.</p>
      <Link href="/" className="text-[14px] text-accent-text hover:underline">Back to the home page</Link>
    </main>
  );
}
