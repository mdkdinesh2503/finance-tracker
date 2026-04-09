export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[color-mix(in_srgb,white_10%,transparent)] ring-1 ring-inset ring-white/6 ${className}`}
      aria-hidden
    />
  );
}
