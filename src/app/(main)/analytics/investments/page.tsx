import { redirect } from "next/navigation";

import { InvestmentAnalyticsView } from "@/components/feature-specific/analytics/investment-analytics-view";
import { getSessionUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/server";
import { investmentAnalyticsSnapshot } from "@/lib/services/investment-analytics";

export default async function InvestmentAnalyticsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  const data = await investmentAnalyticsSnapshot(db, userId);

  return <InvestmentAnalyticsView data={data} />;
}
