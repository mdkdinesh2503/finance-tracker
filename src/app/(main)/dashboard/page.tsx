import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/common/skeleton/dashboard-skeleton";
import { DashboardInner } from "@/components/feature-specific/dashboard/views/dashboard-inner";

export const revalidate = 60;

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-6rem)] max-h-[calc(100dvh-6rem)] flex-col overflow-hidden">
          <DashboardSkeleton />
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
