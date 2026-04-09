import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/feature-specific/dashboard/dashboard-skeleton";
import { DashboardInner } from "./dashboard-inner";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-9rem)] max-h-[calc(100dvh-9rem)] flex-col overflow-hidden">
          <DashboardSkeleton />
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
