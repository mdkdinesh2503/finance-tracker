import { getSessionUserId } from "@/lib/auth/session";
import { AnalyticsView } from "@/components/feature-specific/analytics/views/analytics-view";
import { redirect } from "next/navigation";

export default async function AnalyticsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  return <AnalyticsView />;
}
