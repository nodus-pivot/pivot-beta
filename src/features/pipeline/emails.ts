import type { Stage } from "./types";

export type EmailTemplateKey = "received" | "repair_done" | "repair_complete" | "shipped";

export type EmailTemplate = { key: EmailTemplateKey; name: string };

/** The four customer emails, keyed by the stage the ticket is entering. */
export const EMAIL_TEMPLATES: Record<EmailTemplateKey, EmailTemplate> = {
  received: { key: "received", name: "Request received" },
  repair_done: { key: "repair_done", name: "Testing the repair" },
  repair_complete: { key: "repair_complete", name: "Repair complete" },
  shipped: { key: "shipped", name: "On its way back" },
};

const ON_ENTER: Partial<Record<Stage, EmailTemplateKey>> = {
  received: "received",
  testing: "repair_done",
  shipped_back: "repair_complete",
  closed: "shipped",
};

/** The email that goes out when a ticket moves forward into `to`, if any. */
export function emailOnEnter(to: Stage): EmailTemplate | null {
  const key = ON_ENTER[to];
  return key ? EMAIL_TEMPLATES[key] : null;
}
