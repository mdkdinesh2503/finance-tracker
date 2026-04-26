import { Skeleton } from "@/components/ui/skeleton";

export function TransactionsListSkeleton() {
  return (
    <div className="divide-y divide-white/10">
      <section className="px-4 py-5 sm:px-5">
        <div className="flex gap-3 sm:gap-4">
          <Skeleton className="mt-1 h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-2.5 w-52 max-w-full rounded-full" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-9 w-44 shrink-0 rounded-full sm:w-52" />
        </div>

        <div className="mt-5 space-y-3 pl-0 sm:pl-11">
          <div className="overflow-hidden rounded-2xl border border-white/12 bg-[color-mix(in_srgb,var(--surface)_88%,transparent)]">
            <div className="flex gap-3 p-4 sm:gap-4">
              <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3.5 w-56 max-w-full" />
              </div>
              <Skeleton className="h-9 w-28 shrink-0 self-center rounded-full" />
            </div>
            <div className="border-t border-white/10 bg-black/20 px-2 py-3">
              <div className="mb-2 hidden gap-2 border-b border-white/10 pb-2 sm:grid sm:grid-cols-7">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-full" />
                ))}
              </div>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex gap-2 rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  >
                    <Skeleton className="h-4 w-20 shrink-0" />
                    <Skeleton className="h-4 w-14 shrink-0" />
                    <Skeleton className="h-4 w-16 shrink-0" />
                    <Skeleton className="h-4 min-w-0 flex-1" />
                    <Skeleton className="h-4 w-24 shrink-0" />
                    <Skeleton className="h-4 w-16 shrink-0" />
                    <Skeleton className="h-4 w-28 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
