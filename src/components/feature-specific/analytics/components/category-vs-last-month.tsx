"use client";

import type { CategoryVsLastMonthPayload } from "@/lib/services/transactions";
import { formatCurrency, formatDeltaCurrency } from "@/lib/utilities/format";

function pctSentence(change: number, pct: number | null, lastMonthTotal: number): string {
  if (lastMonthTotal <= 0) {
    return "No spending in the prior month to compare against.";
  }
  if (pct == null) return "";
  const rounded = pct.toFixed(1);
  if (change < 0) {
    return `Spending decreased vs last month (${rounded}%).`;
  }
  if (change > 0) {
    return `Spending increased vs last month (+${rounded}%).`;
  }
  return "Spending was unchanged vs last month.";
}

function StatCard({
  eyebrow,
  value,
  sub,
  accent,
}: {
  eyebrow: string;
  value: string;
  sub: string;
  accent: "slate" | "violet" | "emerald" | "rose";
}) {
  const accents = {
    slate: "from-white/[0.07] to-[var(--surface)] border-white/15",
    violet: "from-primary/20 via-primary/5 to-[var(--surface)] border-primary/25",
    emerald:
      "from-emerald-500/15 via-emerald-500/5 to-[var(--surface)] border-emerald-500/20",
    rose: "from-rose-500/15 via-rose-500/5 to-[var(--surface)] border-rose-500/25",
  };
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-linear-to-br p-6 shadow-(--shadow-card) ${accents[accent]}`}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30 blur-2xl"
        style={{
          background:
            accent === "violet"
              ? "var(--primary)"
              : accent === "emerald"
                ? "#34d399"
                : accent === "rose"
                  ? "#fb7185"
                  : "rgba(255,255,255,0.15)",
        }}
        aria-hidden
      />
      <p className="relative text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {eyebrow}
      </p>
      <p className="relative mt-3 text-3xl font-bold tabular-nums tracking-tight text-white sm:text-4xl">
        {value}
      </p>
      <p className="relative mt-3 text-sm leading-snug text-zinc-500">{sub}</p>
    </div>
  );
}

export function CategoryVsLastMonth({ payload }: { payload: CategoryVsLastMonthPayload }) {
  const change = payload.change;
  const pct = payload.pctVsLastMonth;
  const sentence = pctSentence(change, pct, payload.lastMonthTotal);
  const maxAbs =
    payload.rows.length === 0
      ? 0
      : payload.rows.reduce((m, r) => Math.max(m, Math.max(r.thisMonth, r.lastMonth)), 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          eyebrow={`This month · ${payload.thisMonthLabel}`}
          value={formatCurrency(payload.thisMonthTotal)}
          sub="Total expense for the current calendar month"
          accent="violet"
        />
        <StatCard
          eyebrow={`Last month · ${payload.lastMonthLabel}`}
          value={formatCurrency(payload.lastMonthTotal)}
          sub="Total expense for the previous calendar month"
          accent="slate"
        />
        <StatCard
          eyebrow="Change"
          value={formatDeltaCurrency(payload.change)}
          sub={sentence}
          accent={payload.change >= 0 ? "rose" : "emerald"}
        />
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-linear-to-b from-white/4 to-white/1 shadow-(--shadow-lift)">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_circle_at_10%_0%,rgba(99,102,241,0.16),transparent_55%),radial-gradient(560px_circle_at_90%_10%,rgba(56,189,248,0.12),transparent_60%)]"
          aria-hidden
        />

        <div className="relative border-b border-white/10 bg-black/15 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Breakdown
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white sm:text-xl">
                Categories vs last month
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Sorted by max(this month, last month). Percent is vs last month total.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-semibold text-zinc-400">
              <span className="inline-flex h-2 w-2 rounded-full bg-primary/80" />
              This month
              <span className="mx-1 h-3 w-px bg-white/10" aria-hidden />
              <span className="inline-flex h-2 w-2 rounded-full bg-white/35" />
              Last month
            </div>
          </div>
        </div>

        <div className="relative p-3 sm:p-4">
          <div className="hidden gap-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 sm:grid sm:grid-cols-[1.2fr_1fr_auto]">
            <span>Category</span>
            <span>Scale</span>
            <span className="justify-self-end">Δ</span>
          </div>

          <div className="space-y-2">
            {payload.rows.map((r) => {
              const thisPct = maxAbs > 0 ? (r.thisMonth / maxAbs) * 100 : 0;
              const lastPct = maxAbs > 0 ? (r.lastMonth / maxAbs) * 100 : 0;
              const up = r.delta >= 0;
              const pctDelta = r.lastMonth > 0 ? (r.delta / r.lastMonth) * 100 : null;

              return (
                <div
                  key={r.categoryId}
                  className="group rounded-xl border border-white/8 bg-white/2 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,background-color,transform,box-shadow] duration-200 hover:border-primary/20 hover:bg-white/3 hover:shadow-[0_18px_60px_-34px_rgba(37,99,235,0.45)] motion-safe:hover:-translate-y-px"
                >
                  <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {r.category}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {formatCurrency(r.thisMonth)}{" "}
                        <span className="text-white/20">·</span>{" "}
                        {formatCurrency(r.lastMonth)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="h-2 w-full overflow-hidden rounded-full border border-white/10 bg-black/20">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-primary/70 via-sky-400/60 to-indigo-400/50"
                          style={{ width: `${Math.min(100, Math.max(0, thisPct))}%` }}
                        />
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full border border-white/10 bg-black/20">
                        <div
                          className="h-full rounded-full bg-white/25"
                          style={{ width: `${Math.min(100, Math.max(0, lastPct))}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                      <p
                        className={`text-sm font-semibold tabular-nums ${
                          up ? "text-rose-200" : "text-emerald-200"
                        }`}
                      >
                        {formatDeltaCurrency(r.delta)}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold tabular-nums text-zinc-500">
                        {pctDelta == null ? "n/a" : `${up ? "+" : ""}${pctDelta.toFixed(1)}%`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

