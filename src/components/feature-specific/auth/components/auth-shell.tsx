import { GlassCard } from "@/components/ui/glass-card";
import { Wallet } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-page-orbs relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 hero-grid-bg" aria-hidden />

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div
              className="absolute -inset-3 rounded-[1.35rem] bg-[conic-gradient(from_180deg_at_50%_50%,#22d3ee_0deg,#a78bfa_120deg,#34d399_240deg,#22d3ee_360deg)] opacity-80 blur-md"
              aria-hidden
            />
            <div className="relative flex h-18 w-18 items-center justify-center rounded-2xl border border-white/20 bg-linear-to-br from-white/15 to-white/4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_24px_48px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <Wallet
                className="h-[1.85rem] w-[1.85rem] text-ink drop-shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                strokeWidth={1.35}
                aria-hidden
              />
            </div>
          </div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-ink-muted">
            Expense
          </p>
        </div>

        <GlassCard
          variant="signature"
          noLift
          className="w-full shadow-[0_32px_64px_-24px_rgba(0,0,0,0.75)]"
          panelClassName="px-5 py-7 sm:px-8 sm:py-8"
          hideAccent
        >
          {children}
        </GlassCard>
      </div>
    </div>
  );
}

