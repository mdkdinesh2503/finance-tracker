import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton() {
  return (
    <div className="shrink-0 space-y-0.5">
      <Skeleton className="h-2.5 w-24 rounded-full" />
      <Skeleton className="h-8 w-52 max-w-[85%] sm:w-64" />
      <Skeleton className="h-3.5 w-full max-w-md" />
    </div>
  );
}
