"use server";

import {
  categoryVsLastMonthSnapshot,
  monthlyTrend,
} from "@/lib/services/transactions";
import { db } from "@/lib/db/server";
import { getSessionUserId } from "@/lib/auth/session";

export async function fetchCategoryVsLastMonthAction() {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const data = await categoryVsLastMonthSnapshot(db, userId);
  return { ok: true as const, data };
}

/** All-time monthly trend (income, expense, investment per month). */
export async function fetchMonthlyTrendAction() {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const trend = await monthlyTrend(db, userId, "ALL_TIME", {
    fromDate: null,
    toDate: null,
    categoryContains: "",
    locationId: null,
  });
  return { ok: true as const, trend };
}
