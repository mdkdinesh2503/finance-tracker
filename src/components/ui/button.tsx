import type { ButtonHTMLAttributes } from "react";

export function Button({
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "secondary";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)] disabled:opacity-50";

  const styles = {
    primary:
      "border border-primary/40 bg-primary text-white shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/25",
    secondary:
      "border border-[var(--border)] bg-[var(--glass-simple-bg)] text-[var(--ink)] backdrop-blur-md hover:border-primary/30 hover:bg-[var(--surface)]",
    ghost:
      "border border-transparent bg-transparent text-[var(--ink-muted)] hover:border-[var(--border)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--ink)]",
    danger:
      "border border-rose-500/35 bg-rose-600 text-white hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-900/25",
  };

  return (
    <button
      type={type}
      className={`${base} ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
