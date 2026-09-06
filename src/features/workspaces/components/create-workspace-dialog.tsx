"use client";

import { useRouter } from "next/navigation";
import { ActionDialog, Field, fieldClass } from "@/features/ops/components/action-dialog";
import { createWorkspace, type WsResult } from "../actions";

/** Owners only: a new operating company, with its first brand. Switches to it on success. */
export function CreateWorkspaceDialog() {
  const router = useRouter();
  async function action(prev: WsResult | null, fd: FormData): Promise<WsResult> {
    const r = await createWorkspace(prev, fd);
    if (r.ok) router.push("/ops/workspace");
    return r;
  }
  return (
    <ActionDialog title="New workspace" description="A separate operation with its own inventory, bench, ticket numbers and team. Nodus is one; a distributor servicing several brands is another." trigger="+ New workspace" submitLabel="Create workspace" action={action} width={480}>
      {(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field id="nw_name" label="Name" error={errors.name}>
              <input id="nw_name" name="name" required autoFocus className={fieldClass} aria-invalid={!!errors.name || undefined} />
            </Field>
            <Field id="nw_prefix" label="Ticket prefix" error={errors.ticket_prefix}>
              <input id="nw_prefix" name="ticket_prefix" required maxLength={6} placeholder="NW" className={`${fieldClass} font-mono uppercase`} aria-invalid={!!errors.ticket_prefix || undefined} />
            </Field>
          </div>
          <Field id="nw_brand" label="First brand" hint="you can add more afterwards" error={errors.first_brand}>
            <input id="nw_brand" name="first_brand" required className={fieldClass} aria-invalid={!!errors.first_brand || undefined} />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}
