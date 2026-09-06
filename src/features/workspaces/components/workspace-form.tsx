"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Field, fieldClass, hintClass, labelClass } from "@/features/ops/components/action-dialog";
import { primaryBtn } from "@/features/tickets/components/confirm-advance-dialog";
import { updateWorkspace, type WsResult } from "../actions";
import type { Address, Workspace } from "../queries";

/** Operating details, edited in place with one Save. */
export function WorkspaceForm({ ws, canEdit }: { ws: Workspace; canEdit: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<WsResult | null, FormData>(async (prev, fd) => {
    const r = await updateWorkspace(prev, fd);
    if (r.ok) router.refresh();
    return r;
  }, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const a = (ws.bench_address ?? {}) as Address;
  const dis = !canEdit;

  return (
    <form action={action} noValidate className="flex flex-col gap-8">
      <input type="hidden" name="workspace_id" value={ws.id} />

      <section className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <Field id="ws_name" label="Workspace name" error={errors.name}>
          <input id="ws_name" name="name" defaultValue={ws.name} disabled={dis} required className={fieldClass} aria-invalid={!!errors.name || undefined} />
        </Field>
        <Field id="ws_prefix" label="Ticket prefix" hint="new tickets only" error={errors.ticket_prefix}>
          <input id="ws_prefix" name="ticket_prefix" defaultValue={ws.ticket_prefix} disabled={dis} required maxLength={6} className={`${fieldClass} font-mono uppercase`} aria-invalid={!!errors.ticket_prefix || undefined} />
        </Field>
      </section>

      <section>
        <h2 className="text-[16px]">
          Customer emails<span className={hintClass}>who the customer hears from · sending itself comes later</span>
        </h2>
        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <Field id="ws_from_email" label="Send from" error={errors.send_from_email}>
            <input id="ws_from_email" name="send_from_email" type="email" defaultValue={ws.send_from_email ?? ""} disabled={dis} className={fieldClass} aria-invalid={!!errors.send_from_email || undefined} />
          </Field>
          <Field id="ws_from_name" label="Display name" error={errors.send_from_name}>
            <input id="ws_from_name" name="send_from_name" defaultValue={ws.send_from_name ?? ""} disabled={dis} className={fieldClass} />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-[16px]">
          Bench address<span className={hintClass}>where parts and watches are shipped to · shown on Request Part</span>
        </h2>
        <div className="mt-3 flex flex-col gap-4">
          <Field id="bench_name" label="Name" hint="the watchmaker or the shop">
            <input id="bench_name" name="bench_name" defaultValue={a.name ?? ""} disabled={dis} className={fieldClass} />
          </Field>
          <Field id="bench_line1" label="Street">
            <input id="bench_line1" name="bench_line1" defaultValue={a.line1 ?? ""} disabled={dis} className={fieldClass} />
          </Field>
          <Field id="bench_line2" label="Apt, suite" hint="optional">
            <input id="bench_line2" name="bench_line2" defaultValue={a.line2 ?? ""} disabled={dis} className={fieldClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
            <Field id="bench_city" label="City">
              <input id="bench_city" name="bench_city" defaultValue={a.city ?? ""} disabled={dis} className={fieldClass} />
            </Field>
            <Field id="bench_state" label="State">
              <input id="bench_state" name="bench_state" defaultValue={a.state ?? ""} disabled={dis} className={fieldClass} />
            </Field>
            <Field id="bench_zip" label="ZIP">
              <input id="bench_zip" name="bench_postal_code" defaultValue={a.postal_code ?? ""} disabled={dis} className={fieldClass} />
            </Field>
          </div>
          <Field id="bench_country" label="Country">
            <input id="bench_country" name="bench_country" defaultValue={a.country ?? "United States"} disabled={dis} className={fieldClass} />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-[16px]">Pipeline</h2>
        <label className="mt-3 flex items-start gap-2.5 text-[14.5px]">
          <input type="checkbox" name="send_return_label_enabled" defaultChecked={ws.send_return_label_enabled} disabled={dis} className="mt-1 h-4 w-4 accent-[var(--pivot-accent)]" />
          <span>
            <span className="block">Send Return Label step</span>
            <span className={`block ${labelClass} font-normal text-text-3`}>Adds a stage between Intake and Received where the brand rep emails the customer a prepaid label. Needs ShipStation, which isn&rsquo;t wired yet.</span>
          </span>
        </label>
      </section>

      {state && !state.ok && <p className="text-[13px] text-red">{state.error}</p>}
      {canEdit && (
        <div className="flex items-center gap-4 border-t border-border pt-5">
          <button type="submit" disabled={pending} className={primaryBtn}>{pending ? "Saving…" : "Save changes"}</button>
          {state?.ok && <span className="text-[13px] text-text-3">Saved</span>}
        </div>
      )}
    </form>
  );
}
