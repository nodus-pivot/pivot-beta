"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { X } from "@phosphor-icons/react";
import { ActionDialog, Field, fieldClass } from "@/features/ops/components/action-dialog";
import type { Grant } from "@/features/pipeline";
import { ROLE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { addGrant, removeGrant, renamePerson, resetPassword, setPersonActive } from "../actions";
import type { Person } from "../queries";
import { GrantPicker, type GrantOptions } from "./grant-picker";
import { TemporaryPassword } from "./temporary-password";

type Props = {
  people: Person[];
  selfId: string;
  options: GrantOptions;
  /** Which people the caller may change (name, active, password). */
  manageable: Set<string>;
  /** Which grants the caller may remove. */
  removable: Set<string>;
  /** Whether the caller may add grants at all. */
  canGrant: boolean;
};

function scopeName(g: Grant, options: GrantOptions): string | null {
  if (g.workspace_id) return options.workspaces.find((w) => w.id === g.workspace_id)?.name ?? null;
  if (g.brand_id) return options.brands.find((b) => b.id === g.brand_id)?.name ?? null;
  return null;
}

export function PeopleTable(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reveal, setReveal] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string; temporaryPassword?: string }>, email?: string) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
      else if (r.temporaryPassword && email) setReveal({ email, password: r.temporaryPassword });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {reveal && (
        <div className="flex items-start gap-3">
          <div className="flex-1"><TemporaryPassword email={reveal.email} password={reveal.password} /></div>
          <button type="button" onClick={() => setReveal(null)} className="mt-3 text-text-3 hover:text-text" aria-label="Dismiss"><X size={16} /></button>
        </div>
      )}
      {error && <p className="text-[13px] text-red">{error}</p>}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[820px] border-separate border-spacing-0 text-[14px]">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-[0.06em] text-text-3">
              <th className="bg-surface px-4 py-2.5 font-medium">Person</th>
              <th className="bg-surface px-3 py-2.5 font-medium">Access</th>
              <th className="bg-surface px-3 py-2.5 font-medium">Since</th>
              <th className="bg-surface px-3 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {p.people.map((person) => {
              const self = person.id === p.selfId;
              const canManage = p.manageable.has(person.id);
              return (
                <tr key={person.id} className={person.is_active ? "" : "opacity-60"}>
                  <td className="border-t border-border px-4 py-3 align-top">
                    <span className="font-medium">{person.display_name}</span>
                    {self && <span className="ml-2 rounded-full bg-surface-2 px-1.5 text-[11px] text-text-3">you</span>}
                    {!person.is_active && <span className="ml-2 rounded-full bg-amber-bg px-1.5 text-[11px] text-amber">deactivated</span>}
                    <span className="block text-[12.5px] text-text-3">{person.email}</span>
                  </td>
                  <td className="border-t border-border px-3 py-3 align-top">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {person.grants.length === 0 && <span className="text-[13px] text-text-3">No access</span>}
                      {person.grants.map((g) => {
                        const scope = scopeName(g, p.options);
                        return (
                          <span key={g.id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12.5px] ${g.role === "owner" ? "border-accent text-accent-text" : "border-border-strong text-text-2"}`}>
                            {ROLE_LABELS[g.role]}{scope ? ` · ${scope}` : ""}
                            {p.removable.has(g.id) && (
                              <button type="button" disabled={pending} onClick={() => run(() => removeGrant({ membershipId: g.id }))} aria-label={`Remove ${ROLE_LABELS[g.role]}${scope ? ` for ${scope}` : ""}`} className="ml-0.5 text-text-3 hover:text-red disabled:opacity-50">
                                <X size={11} />
                              </button>
                            )}
                          </span>
                        );
                      })}
                      {p.canGrant && !self && person.is_active && (
                        <ActionDialog title={`Add access for ${person.display_name}`} trigger="+ Add" triggerStyle="link" submitLabel="Add grant" action={addGrant} hidden={{ person_id: person.id }}>
                          {(errors) => <GrantPicker options={p.options} error={errors.grant} />}
                        </ActionDialog>
                      )}
                    </span>
                  </td>
                  <td className="border-t border-border px-3 py-3 align-top text-[13.5px] text-text-3">{formatDate(person.created_at)}</td>
                  <td className="border-t border-border px-3 py-3 text-right align-top">
                    {canManage && (
                      <span className="inline-flex flex-wrap items-center justify-end gap-3 text-[13px]">
                        <ActionDialog title="Rename" trigger="Rename" triggerStyle="link" submitLabel="Save" action={renamePerson} hidden={{ person_id: person.id }} width={400}>
                          {(errors) => (
                            <Field id={`rn_${person.id}`} label="Name" error={errors.display_name}>
                              <input id={`rn_${person.id}`} name="display_name" defaultValue={person.display_name} required autoFocus className={fieldClass} />
                            </Field>
                          )}
                        </ActionDialog>
                        {person.is_active && (
                          <button type="button" disabled={pending} onClick={() => run(() => resetPassword({ personId: person.id }), person.email)} className="text-accent-text hover:underline disabled:opacity-50">
                            Reset password
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => setPersonActive({ personId: person.id, active: !person.is_active }))}
                          className={`hover:underline disabled:opacity-50 ${person.is_active ? "text-text-3 hover:text-red" : "text-accent-text"}`}
                        >
                          {person.is_active ? "Deactivate" : "Reactivate"}
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
