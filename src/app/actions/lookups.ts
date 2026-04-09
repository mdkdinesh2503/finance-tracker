"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/server";
import { locations } from "@/lib/db/schema";
import {
  deleteLocationIfUnused,
  updateLocationForUser,
} from "@/lib/services/transactions";
import { getSessionUserId } from "@/lib/auth/session";

/** Add a location name for the signed-in user (unique per user). */
export async function addLocationLookupAction(name: string) {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false as const, error: "Name required" };
  }
  const existing = await db
    .select()
    .from(locations)
    .where(and(eq(locations.userId, userId), eq(locations.name, trimmed)))
    .limit(1);
  if (existing.length > 0) {
    return {
      ok: true as const,
      alreadyExists: true as const,
      id: existing[0].id,
    };
  }
  const [row] = await db
    .insert(locations)
    .values({ userId, name: trimmed })
    .returning({ id: locations.id });
  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/transactions/new");
  return {
    ok: true as const,
    alreadyExists: false as const,
    id: row?.id ?? "",
  };
}

export async function updateLocationLookupAction(
  locationId: string,
  name: string
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const result = await updateLocationForUser(
    db,
    userId,
    locationId,
    name
  );
  if (result.ok) {
    revalidatePath("/settings");
    revalidatePath("/transactions");
    revalidatePath("/transactions/new");
    revalidatePath("/analytics");
  }
  return result;
}

export async function deleteLocationLookupAction(locationId: string) {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const result = await deleteLocationIfUnused(db, userId, locationId);
  if (result.ok) {
    revalidatePath("/settings");
    revalidatePath("/transactions");
    revalidatePath("/transactions/new");
    revalidatePath("/analytics");
  }
  return result;
}
