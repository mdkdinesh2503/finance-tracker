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

      <div className="overflow-hidden rounded-2xl border border-white/15 bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] shadow-(--shadow-lift)">
        <div className="border-b border-white/10 bg-black/20 px-5 py-4 sm:px-6">
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

        <div className="space-y-3 p-4 sm:p-6">
          <div className="hidden gap-4 border-b border-white/10 pb-2 text-xs font-semibold text-zinc-500 sm:grid sm:grid-cols-[1fr_1fr_auto]">
            <span>Category</span>
            <span>This / last</span>
            <span className="justify-self-end">Δ</span>
          </div>
          {payload.rows.map((r) => (
            <div
              key={r.categoryId}
              className="flex flex-col gap-2 border-b border-white/6 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{r.category}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {formatCurrency(r.thisMonth)} · {formatCurrency(r.lastMonth)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <p className="text-sm font-semibold tabular-nums text-white">
                  {formatDeltaCurrency(r.delta)}
                </p>
                <p className="text-xs font-semibold tabular-nums text-zinc-500">
                  {r.lastMonth > 0 ? `${((r.delta / r.lastMonth) * 100).toFixed(1)}%` : "n/a"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

