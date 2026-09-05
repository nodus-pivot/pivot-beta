"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { WORKSPACE_COOKIE } from "./queries";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function switchWorkspace(formData: FormData): Promise<void> {
  const id = z.uuid().parse(formData.get("workspace_id"));
  (await cookies()).set(WORKSPACE_COOKIE, id, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}
