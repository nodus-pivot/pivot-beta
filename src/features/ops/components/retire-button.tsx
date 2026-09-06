"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setPartActive } from "../actions";

/** Retire hides a part from pickers without losing its history; Restore brings it back. */
export function RetireButton({ partId, active }: { partId: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await setPartActive({ partId, active: !active }); router.refresh(); })}
      className="inline-flex h-9 items-center rounded-lg border border-border-strong px-3 text-[13.5px] text-text-2 hover:border-accent-text hover:text-accent-text disabled:opacity-50"
    >
      {active ? "Retire" : "Restore"}
    </button>
  );
}
