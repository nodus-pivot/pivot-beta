import { redirect } from "next/navigation";

/** Ops lands on Supply; the layout has already checked the person may open it. */
export default function OpsPage() {
  redirect("/ops/supply");
}
