"use server";

import { revalidatePath } from "next/cache";
import {
  createCategoryParent,
  createCategorySub,
  deleteCategoryIfUnused,
  updateCategory,
} from "@/lib/services/transactions";
import { db } from "@/lib/db/server";
import type { TransactionType } from "@/lib/db/schema";
import { getSessionUserId } from "@/lib/auth/session";

function revalidateCategoryPaths() {
  revalidatePath("/settings");
  revalidatePath("/transactions/new");
  revalidatePath("/transactions");
  revalidatePath("/analytics");
  revalidatePath("/dashboard");
}

export async function createCategoryParentAction(
  name: string,
  type: TransactionType
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const result = await createCategoryParent(db, userId, name, type);
  if (result.ok) revalidateCategoryPaths();
  return result;
}

export async function createCategorySubAction(parentId: string, name: string) {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const result = await createCategorySub(db, userId, parentId, name);
  if (result.ok) revalidateCategoryPaths();
  return result;
}

export async function updateCategoryAction(
  categoryId: string,
  name: string,
  type?: TransactionType
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const result = await updateCategory(db, userId, categoryId, { name, type });
  if (result.ok) revalidateCategoryPaths();
  return result;
}

export async function deleteCategoryAction(categoryId: string) {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const result = await deleteCategoryIfUnused(db, userId, categoryId);
  if (result.ok) revalidateCategoryPaths();
  return result;
}
