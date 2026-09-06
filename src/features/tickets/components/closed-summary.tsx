import { FilePdf } from "@phosphor-icons/react/dist/ssr";
import { ACTION_LABELS, componentLabel } from "@/features/pipeline";
import { formatDate, formatMinutes } from "@/lib/format";
import { asCategories, asChecks, asConditions, type TicketDetail } from "../detail";

/** Closed (design 1h): the whole ticket at a glance, read-only. Reopen lives in the action block. */
export function ClosedSummary({ t }: { t: TicketDetail }) {
  const conds = asConditions(t.intake_components);
  const cats = asCategories(t.repair_categories);
  const checks = asChecks(t.testing_checks);
  const out = t.shipments.find((s) => s.direction === "outbound");
  const created = t.events.find((e) => e.type === "created");
  const closedBy = [...t.events].reverse().find((e) => e.type === "stage_changed" && e.to_stage === "closed");

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Claim submitted", value: `${formatDate(created?.created_at ?? t.created_at)}${created?.actor ? ` · ${created.actor.display_name}` : ""}` },
    { label: "Watch on the bench", value: t.watch_received_at ? formatDate(t.watch_received_at) : "—" },
    {
      label: "Condition on arrival",
      value: conds.length ? conds.map((c) => `${componentLabel(c.component)} · ${c.conditions.join(", ")}`).join("; ") : "Nothing noted",
    },
    { label: "Original issue", value: t.issue_description || "—" },
    {
      label: "Work performed",
      value: cats.length ? (
        <ul className="flex flex-col gap-0.5">
          {cats.map((c) => (
            <li key={c.component}>
              {c.action ? ACTION_LABELS[c.action] : "—"} — {componentLabel(c.component)}
              {c.variant ? ` (${c.variant})` : ""}
            </li>
          ))}
        </ul>
      ) : "—",
    },
    {
      label: "Parts used",
      value: t.parts.length ? (
        <ul className="flex flex-col gap-0.5">
          {t.parts.map((p) => (
            <li key={p.id}>
              {p.name}
              {p.sku && <span className="ml-2 font-mono text-[13px] text-text-3">{p.sku}</span>}
            </li>
          ))}
        </ul>
      ) : "None",
    },
    ...(t.solution_notes ? [{ label: "Solution notes", value: t.solution_notes }] : []),
    { label: "Bench time", value: formatMinutes(t.time_spent_minutes) },
    { label: "Coverage", value: t.coverage === "paid" ? "Paid repair" : t.coverage === "warranty" ? "Warranty" : "—" },
    {
      label: "Testing",
      value: checks.timekeeping && checks.water_resistance && checks.visual ? "Passed · timekeeping, water resistance, visual inspection" : "Not fully recorded",
    },
    {
      label: "Sent home",
      value: t.in_person_handoff
        ? "Handed off in person"
        : out
          ? `${(out.carrier_code ?? "").toUpperCase()} ${out.tracking_number ?? ""}`.trim() +
            (out.shipped_at ? ` · shipped ${formatDate(out.shipped_at)}` : "") +
            (out.delivered_at ? ` · delivered ${formatDate(out.delivered_at)}` : " · delivery not yet confirmed")
          : "—",
    },
    { label: "Closed", value: `${formatDate(t.closed_at)}${closedBy?.actor ? ` · ${closedBy.actor.display_name}` : ""}` },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[22px]">Closed</h2>
          <p className="mt-1 text-[14.5px] text-text-2">Everything recorded on this repair, in one place.</p>
        </div>
        <button type="button" disabled title="Coming soon" className="inline-flex h-9 flex-none items-center gap-1.5 rounded-lg border border-border-strong px-3 text-[13.5px] text-text-3 opacity-60">
          <FilePdf size={15} /> Export PDF
        </button>
      </div>

      <dl className="grid grid-cols-[180px_1fr] gap-x-6 gap-y-3 text-[14.5px]">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-text-3">{r.label}</dt>
            <dd className="text-text-2">{r.value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <span className="block text-[13.5px] font-medium text-text-2">
          Photos<span className="ml-2 text-[13px] font-normal text-text-3">coming soon</span>
        </span>
        <div className="mt-2 grid grid-cols-6 gap-3" aria-disabled>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-square rounded-lg border border-dashed border-border opacity-40" />
          ))}
        </div>
      </div>
    </div>
  );
}
