import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] outline-none backdrop-blur-md transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    />
  );
}
