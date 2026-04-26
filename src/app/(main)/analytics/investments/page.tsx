import { redirect } from "next/navigation";

import { InvestmentAnalyticsView } from "@/components/feature-specific/analytics/views/investment-analytics-view";
import { getSessionUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/core/server";
import { investmentAnalyticsSnapshot } from "@/lib/services/analytics/investment-analytics";

export const revalidate = 60;

export default async function InvestmentAnalyticsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  const data = await investmentAnalyticsSnapshot(db, userId);

  return <InvestmentAnalyticsView data={data} />;
}
