"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/queries";
import { canActOn } from "@/features/pipeline";
import { getWorkspaceContext } from "@/features/workspaces/queries";
import { createClient } from "@/lib/supabase/server";
import { CreateTicketError, createTicket } from "./create";
import { createTicketSchema, intakeFormToInput } from "./schema";

export type IntakeState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  /** Raw submitted values so the form keeps them after an error. */
  values?: Record<string, string>;
};

function rawValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string") out[k] = v;
  });
  return out;
}

export async function createTicketAction(_prev: IntakeState, fd: FormData): Promise<IntakeState> {
  const values = rawValues(fd);
  const user = await getCurrentUser();
  if (!user) return { error: "You're signed out. Sign in and try again.", values };
  if (!canActOn(user.profile.role, "intake")) return { error: "Only owners and brand reps create tickets.", values };

  const parsed = createTicketSchema.safeParse(intakeFormToInput(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Fix the highlighted fields.", fieldErrors, values };
  }

  const { current } = await getWorkspaceContext();
  if (!current) return { error: "No workspace selected.", values };

  let created: { id: string };
  try {
    const supabase = await createClient();
    created = await createTicket(
      supabase,
      { workspaceId: current.id, ticketPrefix: current.ticket_prefix, actorId: user.id },
      parsed.data,
    );
  } catch (e) {
    if (e instanceof CreateTicketError) {
      return { error: e.message, fieldErrors: e.field ? { [e.field]: e.message } : undefined, values };
    }
    throw e;
  }

  revalidatePath("/service-center", "layout");
  redirect(`/service-center/tickets/${created.id}`);
}
