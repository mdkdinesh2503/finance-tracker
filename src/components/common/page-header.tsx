import type { ReactNode } from "react";

type PageHeaderProps = {
  /** Small uppercase label above the title (e.g. Overview, Records). */
  eyebrow: string;
  title: string;
  /** Muted line below the title. */
  subtitle?: ReactNode;
  /** Use `div` when nested (e.g. inside a card). Default `header` for page tops. */
  as?: "header" | "div";
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  as: Tag = "header",
  className = "",
}: PageHeaderProps) {
  return (
    <Tag className={`shrink-0 space-y-0.5 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        {eyebrow}
      </p>
      <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-[var(--ink)]">
        {title}
      </h1>
      {subtitle != null && subtitle !== false ? (
        <p className="text-xs text-[var(--ink-muted)]">{subtitle}</p>
      ) : null}
    </Tag>
  );
}
