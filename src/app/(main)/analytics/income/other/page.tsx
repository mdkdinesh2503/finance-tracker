import { IncomeAnalyticsView } from "@/components/feature-specific/analytics/views/income-analytics-view";
import { getSessionUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/core/server";
import { incomeAnalyticsSnapshot } from "@/lib/services/analytics/income-analytics";
import { redirect } from "next/navigation";

export const revalidate = 60;

export default async function OtherIncomeAnalyticsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  const data = await incomeAnalyticsSnapshot(db, userId, new Date(), "other");

  return <IncomeAnalyticsView data={data} />;
}
