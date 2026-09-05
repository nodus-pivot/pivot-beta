import type { Metadata } from "next";

export const metadata: Metadata = { title: "New ticket" };

/** Placeholder until Intake (design 1a, step 4). */
export default function NewTicketPage() {
  return (
    <div className="px-16 py-11">
      <h1 className="text-[28px]">New ticket</h1>
      <p className="mt-2 text-[14.5px] text-text-3">The Intake form is the next screen to be built.</p>
    </div>
  );
}
