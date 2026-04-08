import { loadDashboard } from "@/features/transactions/services";
import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { getLoansByContact } from "@/lib/queries/transactions";

export async function DashboardInner() {
  const userId = await getSessionUserId();
  if (!userId) {
    return null;
  }
  const [data, loanRows] = await Promise.all([
    loadDashboard(getDb(), userId),
    getLoansByContact(userId),
  ]);

  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const loansSummary = loanRows.reduce(
    (acc, r) => {
      acc.youOwe += num(r.youOwe);
      acc.theyOweYou += num(r.theyOweYou);
      return acc;
    },
    { youOwe: 0, theyOweYou: 0 },
  );
  const payload = { ...data, loansSummary };
  return (
    <div className="flex h-[calc(100dvh-9rem)] max-h-[calc(100dvh-9rem)] flex-col overflow-hidden">
      <DashboardPanel data={payload} />
    </div>
  );
}
