import { redirect } from "next/navigation";

import { LendingAnalyticsView } from "@/components/feature-specific/analytics/views/lending-analytics-view";
import { getSessionUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/core/server";
import { lendingAnalyticsSnapshot } from "@/lib/services/analytics/lending-analytics";

export const revalidate = 60;

export default async function LendingAnalyticsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  const data = await lendingAnalyticsSnapshot(db, userId);

  return <LendingAnalyticsView data={data} />;
}
