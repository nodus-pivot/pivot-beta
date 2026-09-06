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

/** Replace variants that decide the price (design 1e). */
export const VARIANTS: Partial<Record<Component, readonly string[]>> = {
  movement: ["NH", "Miyota", "LJP"],
  bezel_insert: ["Steel-Alu", "Ceramic", "Glass"],
};

export const ACTION_LABELS = { repair: "Repair", replace: "Replace", regulate: "Regulate" } as const;

/** The 1c condition-on-arrival grid: rows × columns, any number ticked per row. */
export const INTAKE_COMPONENTS = ["Case", "Caseback", "Bezel", "Bracelet", "Clasp", "Crystal", "Crown/Stem", "Dial", "Handset"] as const;
export const INTAKE_CONDITIONS = ["Lightly worn", "Scratches", "Discolored", "Cracked"] as const;
