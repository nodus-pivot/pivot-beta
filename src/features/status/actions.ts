"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { returnAddressSchema } from "@/features/tickets/schema";
import type { CustomerStatus } from "./types";

export type LookupState = { status?: CustomerStatus; error?: string; ticket?: string; email?: string };

const lookupInput = z.object({
  ticket: z.string().trim().min(1, "Enter your ticket number.").max(20),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter the email you used.")),
});

/**
 * Public. Ticket number + the email on file unlocks a customer-safe view.
 * Same message for "no such ticket" and "wrong email" so the form never
 * confirms which one exists.
 */
export async function lookupStatus(_prev: LookupState, fd: FormData): Promise<LookupState> {
  const parsed = lookupInput.safeParse({ ticket: fd.get("ticket") ?? "", email: fd.get("email") ?? "" });
  const echo = { ticket: String(fd.get("ticket") ?? ""), email: String(fd.get("email") ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details and try again.", ...echo };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("customer_ticket_status", { p_ticket_number: parsed.data.ticket, p_email: parsed.data.email });
  if (error) return { error: "Something went wrong on our side. Try again in a minute.", ...echo };
  if (!data) return { error: "We couldn't find a repair with that ticket number and email.", ...echo };
  return { status: data as unknown as CustomerStatus, ticket: parsed.data.ticket, email: parsed.data.email };
}

export type AddressUpdateState = { ok?: boolean; error?: string };

const addressUpdateInput = z.object({
  ticket: z.string().trim().min(1).max(20),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  address: returnAddressSchema.refine((a) => a.line1 || a.city || a.postal_code, { message: "Enter the new address." }),
});

/** Public. Records the customer's requested return address for staff to apply. */
export async function requestAddressUpdate(_prev: AddressUpdateState, fd: FormData): Promise<AddressUpdateState> {
  const parsed = addressUpdateInput.safeParse({
    ticket: fd.get("ticket") ?? "",
    email: fd.get("email") ?? "",
    address: {
      line1: fd.get("line1") ?? "",
      line2: fd.get("line2") ?? "",
      city: fd.get("city") ?? "",
      state: fd.get("state") ?? "",
      postal_code: fd.get("postal_code") ?? "",
      country: fd.get("country") ?? "",
    },
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter the new address." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("customer_request_address_update", {
    p_ticket_number: parsed.data.ticket,
    p_email: parsed.data.email,
    p_address: parsed.data.address,
  });
  if (error || !data) return { error: "We couldn't save that. If the repair is already closed, reply to your last email instead." };
  return { ok: true };
}
