import type { SupabaseClient } from "@supabase/supabase-js";
import { EMAIL_TEMPLATES } from "@/features/pipeline";
import type { Database } from "@/lib/supabase/database.types";
import { nextTicketNumber, ticketNumberPrefix } from "./numbering";
import type { CreateTicketInput } from "./schema";

type Db = SupabaseClient<Database>;

export type CreateTicketContext = {
  workspaceId: string;
  ticketPrefix: string;
  actorId: string;
};

export class CreateTicketError extends Error {
  constructor(
    message: string,
    readonly field?: keyof CreateTicketInput,
  ) {
    super(message);
  }
}

/**
 * Creates a ticket and moves it from Intake to Received. Runs as the signed-in
 * user, so RLS decides whether the insert is allowed. Separate from the
 * server action so it can be exercised from a script.
 */
export async function createTicket(db: Db, ctx: CreateTicketContext, input: CreateTicketInput): Promise<{ id: string; ticket_number: string }> {
  // The watch must belong to the chosen brand (and, through the brand, the workspace).
  const { data: fit } = await db
    .from("watch_brands")
    .select("watch_id, brands!inner(workspace_id)")
    .eq("watch_id", input.watch_id)
    .eq("brand_id", input.brand_id)
    .maybeSingle();
  if (!fit || fit.brands.workspace_id !== ctx.workspaceId) {
    throw new CreateTicketError("That watch isn't sold under the chosen brand.", "watch_id");
  }

  // Two people creating tickets at once can pick the same number; the unique
  // constraint catches it and we try once more.
  for (let attempt = 0; attempt < 2; attempt++) {
    const head = ticketNumberPrefix(ctx.ticketPrefix);
    const { data: existing } = await db
      .from("tickets")
      .select("ticket_number")
      .eq("workspace_id", ctx.workspaceId)
      .like("ticket_number", `${head}%`);
    const ticket_number = nextTicketNumber(ctx.ticketPrefix, (existing ?? []).map((t) => t.ticket_number));

    const { data: ticket, error } = await db
      .from("tickets")
      .insert({
        ticket_number,
        workspace_id: ctx.workspaceId,
        brand_id: input.brand_id,
        watch_id: input.watch_id,
        created_by: ctx.actorId,
        customer_name: input.customer_name,
        customer_email: input.customer_email,
        customer_phone: input.customer_phone,
        watch_serial: input.watch_serial,
        issue_description: input.issue_description,
        return_address: input.return_address,
        requires_payment: input.requires_payment,
        priority: input.priority,
      })
      .select("id, ticket_number")
      .single();

    if (error?.code === "23505" && attempt === 0) continue; // unique_violation on ticket_number
    if (error || !ticket) throw new CreateTicketError(error?.message ?? "Could not create the ticket.");

    await db.from("ticket_events").insert({ ticket_id: ticket.id, type: "created", actor_id: ctx.actorId, to_stage: "intake" });

    const { error: stageError } = await db.rpc("set_stage", { p_ticket: ticket.id, p_to: "received" });
    if (stageError) throw new CreateTicketError(stageError.message);

    // Emails are logged, not sent, in the beta.
    const tmpl = EMAIL_TEMPLATES.received;
    await db.from("ticket_events").insert({
      ticket_id: ticket.id,
      type: input.send_email ? "email_logged" : "email_skipped",
      actor_id: ctx.actorId,
      body: input.send_email ? `Would have emailed "${tmpl.name}"` : `Skipped email "${tmpl.name}"`,
      payload: { template: tmpl.key },
    });

    return ticket;
  }
  throw new CreateTicketError("Could not assign a ticket number. Try again.");
}
