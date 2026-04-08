import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  headerGradient: string;
  icon: ReactNode;
  children: ReactNode;
};

export function SettingsSection({
  eyebrow,
  title,
  description,
  headerGradient,
  icon,
  children,
}: Props) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-[var(--shadow-card)] backdrop-blur-md">
      <div
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent`}
        aria-hidden
      />
      <div
        className={`flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-start sm:gap-5 sm:px-6 ${headerGradient}`}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-black/30 text-white shadow-inner">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            {eyebrow}
          </p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
            {description}
          </p>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
