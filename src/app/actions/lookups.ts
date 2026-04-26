"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/server";
import {
  deleteCompanyIfUnused,
  deleteLocationIfUnused,
  updateCompanyForUser,
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
  const [existing] = await db`
    select id from locations
    where user_id = ${userId} and name = ${trimmed}
    limit 1
  `;
  if (existing) {
    return {
      ok: true as const,
      alreadyExists: true as const,
      id: (existing as { id: string }).id,
    };
  }
  const [row] = await db`
    insert into locations ${db({ user_id: userId, name: trimmed })}
    returning id
  `;
  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/transactions/new");
  return {
    ok: true as const,
    alreadyExists: false as const,
    id: row ? (row as { id: string }).id : "",
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

/** Salary employer name for the signed-in user (unique per user). */
export async function addCompanyLookupAction(name: string) {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false as const, error: "Name required" };
  }
  const [existing] = await db`
    select id from companies
    where user_id = ${userId} and name = ${trimmed}
    limit 1
  `;
  if (existing) {
    return {
      ok: true as const,
      alreadyExists: true as const,
      id: (existing as { id: string }).id,
    };
  }
  const [row] = await db`
    insert into companies ${db({ user_id: userId, name: trimmed })}
    returning id
  `;
  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/transactions/new");
  revalidatePath("/analytics");
  revalidatePath("/analytics/income");
  revalidatePath("/analytics/income/salary");
  revalidatePath("/analytics/income/other");
  return {
    ok: true as const,
    alreadyExists: false as const,
    id: row ? (row as { id: string }).id : "",
  };
}

export async function updateCompanyLookupAction(companyId: string, name: string) {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const result = await updateCompanyForUser(db, userId, companyId, name);
  if (result.ok) {
    revalidatePath("/settings");
    revalidatePath("/transactions");
    revalidatePath("/transactions/new");
    revalidatePath("/analytics");
    revalidatePath("/analytics/income");
  revalidatePath("/analytics/income/salary");
  revalidatePath("/analytics/income/other");
  }
  return result;
}

export async function deleteCompanyLookupAction(companyId: string) {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const result = await deleteCompanyIfUnused(db, userId, companyId);
  if (result.ok) {
    revalidatePath("/settings");
    revalidatePath("/transactions");
    revalidatePath("/transactions/new");
    revalidatePath("/analytics");
    revalidatePath("/analytics/income");
  revalidatePath("/analytics/income/salary");
  revalidatePath("/analytics/income/other");
  }
  return result;
}
