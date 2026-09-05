import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transition } from "@/features/pipeline";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

/**
 * Writes a transition the pipeline module already approved: the stage
 * change through set_stage() (which also logs the stage event), then the
 * email decision as its own event. Emails are logged, not sent, in the beta.
 */
export async function applyTransition(db: Db, ticketId: string, actorId: string, tr: Transition, sendEmail: boolean): Promise<void> {
  const { error } = await db.rpc("set_stage", { p_ticket: ticketId, p_to: tr.to, p_kind: tr.kind });
  if (error) throw new Error(error.message);

  if (tr.email) {
    await db.from("ticket_events").insert({
      ticket_id: ticketId,
      type: sendEmail ? "email_logged" : "email_skipped",
      actor_id: actorId,
      body: sendEmail ? `Would have emailed "${tr.email.name}"` : `Skipped email "${tr.email.name}"`,
      payload: { template: tr.email.key },
    });
  }
  if (tr.to === "request_part") {
    await db.from("tickets").update({ parts_requested_at: new Date().toISOString() }).eq("id", ticketId);
  }
}
