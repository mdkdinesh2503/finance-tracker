import { PageHeaderSkeleton } from "@/components/common/page-header-skeleton";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";

function SectionLabelSkeleton() {
  return (
    <div className="mb-2 flex shrink-0 items-center gap-2">
      <Skeleton className="h-2.5 w-28 rounded-full" />
      <span className="h-px flex-1 bg-linear-to-r from-primary/30 via-[var(--border)] to-transparent" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <PageHeaderSkeleton />

      <section className="shrink-0">
        <SectionLabelSkeleton />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <GlassCard key={i} className="space-y-1.5 p-3">
              <Skeleton className="h-2.5 w-14 rounded-full" />
              <Skeleton className="h-7 w-24" />
            </GlassCard>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <GlassCard key={i} className="space-y-1.5 p-3">
              <Skeleton className="h-2.5 w-40 rounded-full" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-2.5 w-full max-w-sm" />
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-x-hidden lg:grid-cols-2">
        <GlassCard
          variant="signature"
          hideAccent
          noLift
          className="flex min-h-0 flex-col"
          panelClassName="flex min-h-0 flex-1 flex-col !p-3"
        >
          <div className="mb-2 flex flex-col items-stretch gap-2 min-[400px]:flex-row min-[400px]:items-start min-[400px]:justify-between min-[400px]:gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-2.5 w-36" />
              </div>
            </div>
            <Skeleton className="h-[3.25rem] w-full max-w-sm shrink-0 self-end rounded-lg min-[400px]:w-[12.5rem] min-[400px]:max-w-[42%] min-[400px]:self-auto" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <Skeleton className="h-full min-h-[200px] w-full flex-1 rounded-lg" />
          </div>
        </GlassCard>

        <GlassCard
          variant="signature"
          hideAccent
          noLift
          className="flex min-h-0 flex-col"
          panelClassName="flex min-h-0 flex-1 flex-col !p-3"
        >
          <div className="mb-2 flex flex-col items-stretch gap-2 min-[400px]:flex-row min-[400px]:items-start min-[400px]:justify-between min-[400px]:gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-2.5 w-32" />
              </div>
            </div>
            <Skeleton className="h-[3.25rem] w-full max-w-sm shrink-0 self-end rounded-lg min-[400px]:w-[12.5rem] min-[400px]:max-w-[42%] min-[400px]:self-auto" />
          </div>
          <ul className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain rounded-lg bg-[var(--glass-simple-bg)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <li
                key={i}
                className="flex gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2"
              >
                <Skeleton className="w-1 shrink-0 self-stretch rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-3.5 w-[45%] max-w-[200px]" />
                    <Skeleton className="h-3.5 w-16 shrink-0" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-2.5 w-28" />
                    <Skeleton className="h-2.5 w-12" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </GlassCard>
      </section>
    </div>
  );
}
