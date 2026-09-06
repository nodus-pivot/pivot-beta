"use client";

import { createContext, useContext, useState } from "react";
import type { MoveResult } from "../actions";
import type { SummaryRow } from "../detail";

/**
 * A stage form can take over the frame's primary action: for example the
 * Received form turns "Continue → In repair" into "Request parts → Request
 * Part" once parts are picked. One button, whose destination follows the form.
 */
export type StageActionOverride = {
  label: string;
  nextName: string;
  /** Extra rows for the confirm dialog, after the stage summary. */
  summaryExtra: SummaryRow[];
  run: () => Promise<MoveResult>;
};

type Ctx = { override: StageActionOverride | null; setOverride: (o: StageActionOverride | null) => void };

const StageActionContext = createContext<Ctx>({ override: null, setOverride: () => {} });

export function StageActionProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = useState<StageActionOverride | null>(null);
  return <StageActionContext.Provider value={{ override, setOverride }}>{children}</StageActionContext.Provider>;
}

export function useStageAction(): Ctx {
  return useContext(StageActionContext);
}
