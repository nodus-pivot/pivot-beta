import { z } from "zod";

const optionalText = z.string().trim().max(500).optional().transform((v) => (v ? v : null));

export const returnAddressSchema = z.object({
  line1: optionalText,
  line2: optionalText,
  city: optionalText,
  state: optionalText,
  postal_code: optionalText,
  country: optionalText,
});
export type ReturnAddress = z.infer<typeof returnAddressSchema>;

/** The blank Intake form (design 1a). Field names match the form inputs. */
export const createTicketSchema = z.object({
  customer_name: z.string().trim().min(1, "Enter the customer's name.").max(200),
  customer_email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  customer_phone: optionalText,
  brand_id: z.uuid("Choose a brand."),
  watch_id: z.uuid("Choose a watch."),
  watch_serial: optionalText,
  issue_description: z.string().trim().min(1, "Describe the issue.").max(5000),
  return_address: returnAddressSchema,
  requires_payment: z.boolean(),
  priority: z.boolean(),
  send_email: z.boolean(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

/** Reads the intake form's FormData into the shape the schema expects. */
export function intakeFormToInput(fd: FormData): unknown {
  const s = (k: string) => (fd.get(k) ?? "") as string;
  return {
    customer_name: s("customer_name"),
    customer_email: s("customer_email"),
    customer_phone: s("customer_phone"),
    brand_id: s("brand_id"),
    watch_id: s("watch_id"),
    watch_serial: s("watch_serial"),
    issue_description: s("issue_description"),
    return_address: {
      line1: s("address_line1"),
      line2: s("address_line2"),
      city: s("address_city"),
      state: s("address_state"),
      postal_code: s("address_postal_code"),
      country: s("address_country"),
    },
    requires_payment: fd.get("requires_payment") === "on",
    priority: fd.get("priority") === "on",
    send_email: fd.get("send_email") === "on",
  };
}
