"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { GrantPicker, type GrantOptions } from "./grant-picker";

/** Several grants at once, one picker per row. Fields are prefixed g0_, g1_, … in order. */
export function GrantRows({ options, error }: { options: GrantOptions; error?: string }) {
  const [rows, setRows] = useState<number[]>([0]);
  const [next, setNext] = useState(1);
  return (
    <div className="flex flex-col gap-3">
      <span className="block text-[13.5px] font-medium text-text-2">
        Access<span className="ml-2 text-[13px] font-normal text-text-3">one row per role · a person can hold several</span>
      </span>
      {rows.map((id, i) => (
        <div key={id} className="flex items-start gap-3 rounded-lg border border-border bg-bg/40 p-3">
          <div className="min-w-0 flex-1">
            <GrantPicker options={options} prefix={`g${i}_`} />
          </div>
          {rows.length > 1 && (
            <button type="button" onClick={() => setRows((r) => r.filter((x) => x !== id))} aria-label="Remove this role" className="mt-1 text-text-3 hover:text-red">
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      <div>
        <button type="button" onClick={() => { setRows((r) => [...r, next]); setNext((n) => n + 1); }} className="text-[13.5px] text-accent-text hover:underline">
          + Add another role
        </button>
      </div>
      {error && <p className="text-[13px] text-red">{error}</p>}
    </div>
  );
}
