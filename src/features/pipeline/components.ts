/** The 12 watch components (matches the `component` enum) and their labels. */
export const COMPONENTS = [
  "bezel_insert", "bracelet", "case", "caseback", "clasp", "crown_tube",
  "crystal", "dial", "gaskets", "hands", "lume", "movement",
] as const;
export type Component = (typeof COMPONENTS)[number];

export const COMPONENT_LABELS: Record<Component, string> = {
  bezel_insert: "Bezel/Insert",
  bracelet: "Bracelet",
  case: "Case",
  caseback: "Caseback",
  clasp: "Clasp",
  crown_tube: "Crown/Tube",
  crystal: "Crystal",
  dial: "Dial",
  gaskets: "Gaskets",
  hands: "Hands",
  lume: "Lume",
  movement: "Movement",
};

export function componentLabel(c: string): string {
  return (COMPONENT_LABELS as Record<string, string>)[c] ?? c;
}

export const ACTION_LABELS = { repair: "Repair", replace: "Replace", regulate: "Regulate" } as const;

/**
 * The 1c diagnosis grid: one row per catalog component (COMPONENTS), any
 * number of conditions ticked per row, plus a Repair / Replace decision.
 */
export const INTAKE_CONDITIONS = ["Lightly worn", "Scratches", "Discolored", "Cracked"] as const;
