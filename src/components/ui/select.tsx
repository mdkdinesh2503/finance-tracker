import type { SelectHTMLAttributes } from "react";

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-xl border border-(--border) bg-(--surface)/50 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    />
  );
}
