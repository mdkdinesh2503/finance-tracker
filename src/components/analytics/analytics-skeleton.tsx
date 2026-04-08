import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors `CategoryVsLastMonth`: three stat cards + comparison panel shell. */
export function CategoryVsLastMonthSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.07] to-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
          >
            <Skeleton className="h-2.5 w-24 rounded-full" />
            <Skeleton className="mt-4 h-10 w-36 sm:h-12" />
            <Skeleton className="mt-3 h-3 w-full max-w-[14rem]" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/15 bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] shadow-[var(--shadow-lift)]">
        <div className="border-b border-white/10 bg-black/20 px-5 py-4 sm:px-6">
          <Skeleton className="h-2.5 w-28 rounded-full" />
          <Skeleton className="mt-2 h-7 w-48 max-w-[80%] sm:h-8" />
          <Skeleton className="mt-2 h-3 w-full max-w-lg" />
        </div>
        <div className="space-y-3 p-4 sm:p-6">
          <div className="hidden gap-4 border-b border-white/10 pb-2 sm:grid sm:grid-cols-[1fr_1fr_auto]">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16 justify-self-end" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 border-b border-white/[0.06] py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <Skeleton className="h-4 w-full max-w-[200px]" />
              <div className="flex flex-1 justify-between gap-4 sm:justify-end">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-14" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Matches `MonthlyTrendChart` height (320) + axis/legend affordances. */
export function MonthlyTrendChartSkeleton() {
  return (
    <div className="h-80 w-full space-y-3 px-1 pt-2">
      <div className="flex justify-end gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-16 rounded-full" />
        ))}
      </div>
      <div className="relative h-[calc(100%-2rem)] min-h-[240px]">
        <Skeleton className="absolute bottom-6 left-8 right-2 top-2 rounded-lg opacity-60" />
        <Skeleton className="absolute bottom-0 left-0 h-4 w-full max-w-[calc(100%-2rem)]" />
        <Skeleton className="absolute bottom-6 left-0 top-2 w-6" />
      </div>
    </div>
  );
}
