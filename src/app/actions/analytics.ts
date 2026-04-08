"use server";

import { categoryVsLastMonthSnapshot, monthlyTrend } from "@/features/transactions/services";
import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";

export async function fetchCategoryVsLastMonthAction() {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const data = await categoryVsLastMonthSnapshot(getDb(), userId);
  return { ok: true as const, data };
}

/** All-time monthly trend (income, expense, investment per month). */
export async function fetchMonthlyTrendAction() {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const db = getDb();
  const trend = await monthlyTrend(db, userId, "ALL_TIME", {
    fromDate: null,
    toDate: null,
    categoryContains: "",
    locationId: null,
  });
  return { ok: true as const, trend };
}
