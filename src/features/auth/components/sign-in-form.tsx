"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "../actions";

const field =
  "h-10 w-full rounded-lg border border-border-strong bg-transparent px-3 text-[15px] text-text placeholder:text-text-3 transition-colors focus:border-accent focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-invalid:border-red";
const label = "block text-[13px] font-medium text-text-2";

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  const invalid = Boolean(state.error);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={label}>Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          aria-invalid={invalid || undefined}
          className={field}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={label}>Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={invalid || undefined}
          className={field}
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg border border-[#5a2f28] bg-red-bg px-3 py-2 text-[13.5px] text-red">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex h-10 w-full items-center justify-center rounded-lg border border-accent text-[14.5px] text-accent-text transition-colors hover:bg-accent-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
