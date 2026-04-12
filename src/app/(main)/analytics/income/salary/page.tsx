import { IncomeAnalyticsView } from "@/components/feature-specific/analytics/income-analytics-view";
import { getSessionUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/server";
import { incomeAnalyticsSnapshot } from "@/lib/services/income-analytics";
import { redirect } from "next/navigation";

export const revalidate = 60;

export default async function SalaryIncomeAnalyticsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  const data = await incomeAnalyticsSnapshot(db, userId, new Date(), "salary");

  return <IncomeAnalyticsView data={data} />;
}
