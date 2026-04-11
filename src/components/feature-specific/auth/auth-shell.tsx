import { GlassCard } from "@/components/ui/glass-card";
import { Wallet } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050508] px-4 py-10 sm:px-6">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-0 h-[min(80vh,640px)] w-[min(100vw,720px)] -translate-x-1/2 -translate-y-1/4 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.18),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-1/3 left-0 h-[320px] w-[320px] -translate-x-1/3 rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08),transparent_55%)] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,transparent_30%,rgba(0,0,0,0.4)_100%)]" />
      </div>

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
                className="h-[1.85rem] w-[1.85rem] text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]"
                strokeWidth={1.35}
                aria-hidden
              />
            </div>
          </div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/45">
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

        <p className="mt-8 text-center text-[11px] leading-relaxed text-white/35">
          Secured with Argon2 · JWT session · httpOnly cookie
        </p>
      </div>
    </div>
  );
}
