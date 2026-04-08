import type { LabelHTMLAttributes } from "react";

export function Label({
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-primary ${className}`}
      {...props}
    />
  );
}
