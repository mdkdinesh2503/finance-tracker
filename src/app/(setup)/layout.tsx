import { GlassCard } from "@/components/ui/glass-card";

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050508] px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-0 h-[min(80vh,640px)] w-[min(100vw,720px)] -translate-x-1/2 -translate-y-1/4 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.16),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.10),transparent_60%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,transparent_30%,rgba(0,0,0,0.45)_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[560px]">
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
