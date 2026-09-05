import { notFound } from "next/navigation";
import { STAGE_DEFINITIONS, isLiveStage } from "@/features/pipeline";
import { createClient } from "@/lib/supabase/server";

/** Placeholder until the ticket detail frame (step 5). */
export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("tickets")
    .select("ticket_number, customer_name, stage, watches(model)")
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();
  const stage = isLiveStage(t.stage) ? STAGE_DEFINITIONS[t.stage].name : t.stage;
  return (
    <div className="px-16 py-11">
      <p className="font-mono text-[13px] text-text-3">{t.ticket_number}</p>
      <h1 className="mt-1 text-[34px] tracking-[-0.025em]">{t.customer_name}</h1>
      <p className="mt-1 text-[14.5px] text-text-2">
        {t.watches?.model} · {stage}
      </p>
      <p className="mt-8 text-[14.5px] text-text-3">The ticket detail page is the next screen to be built.</p>
    </div>
  );
}
