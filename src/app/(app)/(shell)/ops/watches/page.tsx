import type { Metadata } from "next";

export const metadata: Metadata = { title: "Watches" };

/** Placeholder until this Ops page is built. The layout has already checked access. */
export default function WatchesPage() {
  return (
    <div className="px-10 py-9">
      <h1 className="text-[28px]">Watches</h1>
      <p className="mt-2 text-[14.5px] text-text-3">Not built yet.</p>
    </div>
  );
}
