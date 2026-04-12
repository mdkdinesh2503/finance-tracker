import { redirect } from "next/navigation";

import { IncomeAnalyticsView } from "@/components/feature-specific/analytics/income-analytics-view";
import { getSessionUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/server";
import { incomeAnalyticsSnapshot } from "@/lib/services/income-analytics";

export const revalidate = 60;

export default async function IncomeAnalyticsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  const data = await incomeAnalyticsSnapshot(db, userId);

  return <IncomeAnalyticsView data={data} />;
}
