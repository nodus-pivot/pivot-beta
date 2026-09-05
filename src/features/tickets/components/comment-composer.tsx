"use client";

import { useActionState, useEffect, useRef } from "react";
import { addComment } from "../actions";

export function CommentComposer({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState(addComment, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!pending && !state.error) form.current?.reset();
  }, [pending, state]);
  return (
    <form ref={form} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <textarea
        name="body"
        rows={2}
        placeholder="Add an internal comment"
        required
        className="w-full rounded-lg border border-border-strong bg-transparent px-3 py-2 text-[14.5px] text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center rounded-lg border border-border-strong px-3.5 text-[13.5px] text-text-2 hover:border-accent-text hover:text-accent-text disabled:opacity-50"
        >
          {pending ? "Posting…" : "Comment"}
        </button>
        {state.error && <span className="text-[13px] text-red">{state.error}</span>}
      </div>
    </form>
  );
}
