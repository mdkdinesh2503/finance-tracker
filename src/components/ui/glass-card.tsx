import type { HTMLAttributes } from "react";

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  /** Signature portfolio card: accent bar, inner panel, hover lift. */
  variant?: "simple" | "signature";
  /** No scale/lift; shadow-only hover (e.g. dense lists). */
  noLift?: boolean;
  /** Classes on inner panel (signature only). */
  panelClassName?: string;
  /** Omit top accent bar and use tighter panel inset (full-width content). */
  hideAccent?: boolean;
};

export function GlassCard({
  className = "",
  variant = "simple",
  noLift = false,
  panelClassName = "",
  hideAccent = false,
  children,
  ...props
}: GlassCardProps) {
  if (variant === "signature") {
    return (
      <div
        className={`glass-card-outer group ${hideAccent ? "glass-card--no-accent" : ""} ${noLift ? "glass-card-no-lift" : ""} ${className}`}
        {...props}
      >
        <div className="glass-card-blob" aria-hidden />
        {!hideAccent ? <div className="glass-card-accent" aria-hidden /> : null}
        <div className={`glass-card-panel ${panelClassName}`}>{children}</div>
      </div>
    );
  }

  return (
    <div className={`glass-card-simple ${className}`} {...props}>
      {children}
    </div>
  );
}
