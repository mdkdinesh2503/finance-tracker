"use client";

import type { CategoryVsLastMonthPayload } from "@/features/transactions/services";
import { formatCurrency, formatDeltaCurrency } from "@/lib/utils/format";

function pctSentence(
  change: number,
  pct: number | null,
  lastMonthTotal: number
): string {
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
    violet:
      "from-primary/20 via-primary/5 to-[var(--surface)] border-primary/25",
    emerald:
      "from-emerald-500/15 via-emerald-500/5 to-[var(--surface)] border-emerald-500/20",
    rose: "from-rose-500/15 via-rose-500/5 to-[var(--surface)] border-rose-500/25",
  };
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 shadow-[var(--shadow-card)] ${accents[accent]}`}
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
      <p className="relative mt-2 text-sm text-zinc-400">{sub}</p>
    </div>
  );
}

export function CategoryVsLastMonth({
  payload,
}: {
  payload: CategoryVsLastMonthPayload;
}) {
  const {
    thisMonthLabel,
    lastMonthLabel,
    thisMonthTotal,
    lastMonthTotal,
    change,
    pctVsLastMonth,
    rows,
  } = payload;

  const narrative = pctSentence(change, pctVsLastMonth, lastMonthTotal);
  const changeAccent: "emerald" | "rose" | "slate" =
    change < 0 ? "emerald" : change > 0 ? "rose" : "slate";

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          accent="violet"
          eyebrow="This month"
          value={formatCurrency(thisMonthTotal)}
          sub={thisMonthLabel}
        />
        <StatCard
          accent="slate"
          eyebrow="Previous month"
          value={formatCurrency(lastMonthTotal)}
          sub="Prior calendar month"
        />
        <StatCard
          accent={changeAccent === "slate" ? "slate" : changeAccent}
          eyebrow="Change"
          value={formatDeltaCurrency(change)}
          sub={narrative}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/15 bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] shadow-[var(--shadow-lift)]">
        <div className="border-b border-white/10 bg-black/20 px-5 py-4 sm:px-6">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary">
            Comparison
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
            Category vs last month
          </h2>
          <p className="mt-1 max-w-xl text-xs text-zinc-500 sm:text-sm">
            Categories with spend in{" "}
            <span className="text-zinc-400">{thisMonthLabel}</span> or{" "}
            <span className="text-zinc-400">{lastMonthLabel}</span>, ordered by
            the higher of the two amounts.
          </p>
        </div>

        <div className="max-h-[min(70vh,720px)] overflow-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-white/10 bg-(--dropdown-panel-bg) backdrop-blur-sm">
              <tr className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                <th className="px-5 py-3.5 sm:px-6">Subcategory</th>
                <th className="px-3 py-3.5 text-right sm:px-4">This month</th>
                <th className="px-3 py-3.5 text-right sm:px-4">Last month</th>
                <th className="px-5 py-3.5 text-right sm:px-6">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-zinc-500 sm:px-6"
                  >
                    No expense transactions in either month yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.categoryId}
                    className="transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3 font-medium text-zinc-200 sm:px-6">
                      {r.category}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-zinc-300 sm:px-4">
                      {formatCurrency(r.thisMonth)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-zinc-300 sm:px-4">
                      {formatCurrency(r.lastMonth)}
                    </td>
                    <td
                      className={`px-5 py-3 text-right text-sm font-medium tabular-nums sm:px-6 ${
                        r.delta > 0
                          ? "text-amber-300"
                          : r.delta < 0
                            ? "text-emerald-300"
                            : "text-zinc-500"
                      }`}
                    >
                      {formatDeltaCurrency(r.delta)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
