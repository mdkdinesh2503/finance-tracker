import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-(--border) bg-(--surface)/50 px-3 py-2.5 text-sm text-ink outline-none backdrop-blur-md transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    />
  );
}
