"use client";

import { useState } from "react";

/** Shown once. Nothing stores it; the person changes it from Account. */
export function TemporaryPassword({ email, password }: { email: string; password: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${email}\n${password}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="rounded-lg border border-amber-border bg-amber-bg px-4 py-3">
      <p className="text-[13px] font-medium text-amber">Temporary password · shown once</p>
      <p className="mt-1 font-mono text-[18px] tracking-wide text-text">{password}</p>
      <p className="mt-1 text-[13px] text-amber">
        Pass it to {email} directly, not by email. It isn&rsquo;t stored anywhere; they change it from Account after signing in.
      </p>
      <button type="button" onClick={copy} className="mt-2 text-[13px] text-accent-text hover:underline">
        {copied ? "Copied" : "Copy email and password"}
      </button>
    </div>
  );
}
