import { loadDashboard } from "@/lib/services/transactions";
import { db } from "@/lib/db/server";
import { getSessionUserId } from "@/lib/auth/session";
import { DashboardPanel } from "./dashboard-panel";

export async function DashboardInner() {
  const userId = await getSessionUserId();
  if (!userId) {
    return null;
  }
  const payload = await loadDashboard(db, userId);
  return (
    <div className="flex h-[calc(100dvh-6rem)] max-h-[calc(100dvh-6rem)] flex-col overflow-hidden">
      <DashboardPanel data={payload} />
    </div>
  );
}
