import type { ReactNode } from "react";
import Link from "next/link";

import { InvestMonthlyContributionChart } from "@/components/feature-specific/analytics/charts/invest-monthly-contribution-chart";
import { GlassCard } from "@/components/ui/glass-card";
import type {
  InvestmentAnalyticsSnapshot,
  InvestmentLeafBreakdownRow,
} from "@/lib/types/investment-analytics";
import { formatInr, formatYearMonthLabel } from "@/lib/utilities/format";

type Props = {
  data: InvestmentAnalyticsSnapshot;
};

function pctVsPrevious(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-white/10 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      className={`border-b border-white/4 px-3 py-2.5 text-sm text-ink transition-colors duration-150 first:rounded-l-lg last:rounded-r-lg ${className}`}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}

function DeltaChip({ pct }: { pct: number | null }) {
  if (pct == null) {
    return (
      <span className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
        n/a vs last month
      </span>
    );
  }
  const up = pct >= 0;
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums ${
        up
          ? "border-sky-500/35 bg-sky-500/12 text-sky-200"
          : "border-amber-500/30 bg-amber-500/10 text-amber-200"
      }`}
    >
      {up ? "↑" : "↓"} {up ? "+" : ""}
      {pct.toFixed(1)}% vs prior month
    </span>
  );
}

type SplitRow = {
  key: string;
  label: string;
  amount: number;
  pct: number;
  barClass: string;
  dotClass: string;
  amountClass: string;
};

function MonthComposition({
  financial,
  cash,
  total,
  monthLabel,
  leafRows,
}: {
  financial: number;
  cash: number;
  total: number;
  monthLabel: string;
  leafRows: InvestmentLeafBreakdownRow[];
}) {
  if (total <= 0) {
    return (
      <div className="flex flex-1 flex-col justify-center rounded-2xl border border-dashed border-white/10 bg-white/2 py-12 text-center">
        <p className="text-sm font-medium text-zinc-400">
          No investment total this period
        </p>
        <p className="mt-1 text-xs text-zinc-600">{monthLabel}</p>
      </div>
    );
  }

  const leafSorted = [...leafRows].sort((a, b) => b.total - a.total);
  const maxLeafTotal = leafSorted.reduce((m, r) => Math.max(m, r.total), 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <div className="min-w-0 space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-linear-to-b from-white/5 to-white/2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(700px_circle_at_20%_0%,rgba(56,189,248,0.14),transparent_55%),radial-gradient(560px_circle_at_90%_10%,rgba(99,102,241,0.12),transparent_60%)] before:opacity-100">

            <div className="relative p-3">
              {leafSorted.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">No subcategories.</p>
              ) : (
                <ul className="space-y-2.5" role="list">
                  {leafSorted.map((r, i) => {
                    const pct = r.shareOfPeriod;
                    const barPct =
                      maxLeafTotal > 0
                        ? Math.max(3, (r.total / maxLeafTotal) * 100)
                        : 0;
                    return (
                      <li
                        key={`${r.parentName}-${r.leafName}-${i}`}
                        className="group relative overflow-hidden rounded-xl border border-white/8 bg-[#070c16]/60 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,background-color,transform,box-shadow] duration-200 hover:border-sky-500/25 hover:bg-[#070c16]/75 hover:shadow-[0_16px_50px_-26px_rgba(56,189,248,0.35)] motion-safe:hover:-translate-y-px"
                      >
                        <div
                          className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-linear-to-b from-sky-400/80 via-cyan-300/50 to-indigo-400/60 opacity-70 transition-opacity duration-200 group-hover:opacity-100"
                          aria-hidden
                        />
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg border border-white/10 bg-linear-to-br from-white/8 to-white/2 px-1.5 text-[11px] font-semibold tabular-nums text-zinc-200">
                                {i + 1}
                              </span>
                              <p className="truncate text-sm font-semibold text-ink">
                                {r.leafName}
                              </p>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="inline-flex max-w-full items-center truncate rounded-full border border-white/10 bg-white/4 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-400">
                                {r.parentName}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums text-ink">
                              {formatInr(r.total)}
                            </p>
                            <span className="mt-1 inline-flex rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-sky-100/90">
                              {pctCell(pct)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#050914] ring-1 ring-white/6">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-sky-600/95 via-cyan-400/75 to-indigo-400/65 motion-safe:transition-[width] motion-safe:duration-500"
                            style={{ width: `${barPct}%` }}
                            aria-hidden
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}

function pctCell(p: number) {
  return `${p.toFixed(1)}%`;
}

export function InvestmentAnalyticsView({ data }: Props) {
  const {
    allTimeTotal,
    thisMonth,
    lastMonth,
    byLeafThisMonth,
    byLeafAllTime,
    monthlyTotals,
    runRate,
  } = data;

  const monthDelta = pctVsPrevious(thisMonth.total, lastMonth.total);

  const chartData = [...monthlyTotals]
    .sort((a, b) => a.ym.localeCompare(b.ym))
    .map((r) => ({ month: r.ym, invested: r.total }));

  const rhythmHasData =
    chartData.length > 0 && chartData.some((d) => d.invested > 0);

  const peakInvestMonth = monthlyTotals.reduce<{
    ym: string;
    total: number;
  } | null>((best, r) => {
    if (!best || r.total > best.total) return { ym: r.ym, total: r.total };
    return best;
  }, null);

  const compositionHasData = thisMonth.total > 0;

  const allTimeLeafRows = [...byLeafAllTime].sort((a, b) => b.total - a.total);

  return (
    <div className="invest-scope space-y-10 pb-16">
      <header className="relative z-1 space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">
              Insights · Capital
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              <span className="bg-linear-to-r from-ink via-sky-100 to-indigo-200 bg-clip-text text-transparent">
                Investment trajectory
              </span>
            </h1>
            <p className="max-w-3xl text-sm leading-snug text-ink-muted">
              <strong className="text-ink">INVESTMENT</strong> totals for{" "}
              <strong className="text-ink">Financial &amp; Obligations</strong>{" "}
              and <strong className="text-ink">Cash Savings</strong>—money you
              recorded, not live quotes;{" "}
              <Link
                href="/analytics/income/salary"
                prefetch={false}
                className="text-primary underline-offset-2 hover:underline"
              >
                Income
              </Link>
              {" · "}
              <Link
                href="/analytics"
                prefetch={false}
                className="text-primary underline-offset-2 hover:underline"
              >
                Analytics
              </Link>
              .
            </p>
          </div>
          <DeltaChip pct={monthDelta} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <GlassCard
            variant="signature"
            className="invest-hero-stat flex h-full min-h-0 flex-col overflow-hidden sm:col-span-2 xl:col-span-1"
            panelClassName="!flex !min-h-0 !flex-1 !flex-col !p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              All-time recorded
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-sky-100 tabular-nums sm:text-3xl">
              {formatInr(allTimeTotal)}
            </p>
            <p className="mt-auto pt-3 text-[11px] leading-snug text-zinc-500">
              Sum of all INVESTMENT entries.
            </p>
          </GlassCard>

          <GlassCard
            variant="signature"
            className="invest-hero-stat flex h-full min-h-0 flex-col"
            panelClassName="!flex !min-h-0 !flex-1 !flex-col !p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              This month · {thisMonth.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-cyan-100 tabular-nums">
              {formatInr(thisMonth.total)}
            </p>
            <p className="mt-auto pt-3 text-[11px] text-zinc-500">
              Prev: {formatInr(lastMonth.total)}
            </p>
          </GlassCard>

          <GlassCard
            variant="signature"
            className="invest-hero-stat flex h-full min-h-0 flex-col sm:col-span-2 xl:col-span-1"
            panelClassName="!flex !min-h-0 !flex-1 !flex-col !p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Recent pace
            </p>
            {runRate.averageMonthlyLastCompleted != null ? (
              <>
                <p className="mt-2 text-xl font-semibold text-indigo-100 tabular-nums">
                  ~{formatInr(runRate.averageMonthlyLastCompleted)}
                  <span className="text-sm font-normal text-zinc-500">
                    {" "}
                    /mo
                  </span>
                </p>
                <p className="mt-auto pt-3 text-[11px] text-zinc-500">
                  ~{formatInr(runRate.impliedAnnualFromRecentPace ?? 0)} / yr ·{" "}
                  {runRate.monthsAveraged} mo avg
                </p>
              </>
            ) : (
              <p className="mt-auto pt-3 text-[11px] text-zinc-500">
                Need more month data.
              </p>
            )}
          </GlassCard>
        </div>
      </header>

      {/* Viz band — match dashboard: equal columns, shared chart card chrome */}
      <section className="relative z-1 grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
        <GlassCard
          variant="signature"
          hideAccent
          noLift
          className="flex min-h-0 flex-col"
          panelClassName="flex min-h-0 flex-1 flex-col !p-3"
        >
          <div className="mb-2 shrink-0">
            <div className="flex flex-col items-stretch gap-2 min-[400px]:flex-row min-[400px]:items-start min-[400px]:justify-between min-[400px]:gap-3">
              <div className="flex min-h-0 min-w-0 flex-1 items-start gap-2">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-linear-to-br from-blue-500/15 to-blue-600/5 text-blue-300"
                  aria-hidden
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-pretty text-sm font-semibold tracking-tight text-ink">
                    Contribution rhythm
                  </h2>
                  <p className="mt-0.5 text-pretty text-[11px] leading-snug text-ink-muted">
                    Last 12 calendar months · INR invested
                  </p>
                </div>
              </div>
              {rhythmHasData && peakInvestMonth ? (
                <div
                  className="grid w-full max-w-sm shrink-0 grid-rows-[auto_auto] gap-2 self-end rounded-lg border border-blue-500/25 bg-blue-500/8 px-3 py-2 min-[400px]:w-50 min-[400px]:max-w-[42%] min-[400px]:self-auto"
                  role="group"
                  aria-label="Peak investment month in window"
                >
                  <p className="border-b border-blue-500/20 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-blue-200/90">
                    Peak month
                  </p>
                  <div className="flex items-end justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold tabular-nums leading-none text-ink">
                      {formatInr(peakInvestMonth.total)}
                    </span>
                    <span className="shrink-0 text-right text-[10px] leading-snug text-ink-muted">
                      {formatYearMonthLabel(peakInvestMonth.ym)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="h-full min-h-[200px] w-full flex-1">
              <InvestMonthlyContributionChart data={chartData} />
            </div>
          </div>
        </GlassCard>

        <GlassCard
          variant="signature"
          hideAccent
          noLift
          className="flex min-h-0 flex-col"
          panelClassName="flex min-h-0 flex-1 flex-col !p-3"
        >
          <div className="mb-2 shrink-0">
            <div className="flex flex-col items-stretch gap-2 min-[400px]:flex-row min-[400px]:items-start min-[400px]:justify-between min-[400px]:gap-3">
              <div className="flex min-h-0 min-w-0 flex-1 items-start gap-2">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-linear-to-br from-blue-500/15 to-blue-600/5 text-blue-300"
                  aria-hidden
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 10.5V6a7.5 7.5 0 00-7.5 7.5h4.5z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-pretty text-sm font-semibold tracking-tight text-ink">
                    This month · composition
                  </h2>
                  <p className="mt-0.5 text-pretty text-[11px] leading-snug text-ink-muted">
                    Ring = share; rows = amounts and %.
                  </p>
                </div>
              </div>
              {compositionHasData ? (
                <div
                  className="grid w-full max-w-sm shrink-0 grid-rows-[auto_auto] gap-2 self-end rounded-lg border border-blue-500/25 bg-blue-500/8 px-3 py-2 min-[400px]:w-50 min-[400px]:max-w-[42%] min-[400px]:self-auto"
                  role="group"
                  aria-label="This month investment total"
                >
                  <p className="border-b border-blue-500/20 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-blue-200/90">
                    Period total
                  </p>
                  <div className="flex items-end justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold tabular-nums leading-none text-ink">
                      {formatInr(thisMonth.total)}
                    </span>
                    <span className="shrink-0 text-right text-[10px] leading-snug text-ink-muted">
                      {thisMonth.label}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-full min-h-[200px] w-full flex-1 flex-col rounded-2xl border border-(--border) bg-(--glass-simple-bg) p-3 pb-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <MonthComposition
                financial={thisMonth.financialObligationsTotal}
                cash={thisMonth.cashSavingsTotal}
                total={thisMonth.total}
                monthLabel={thisMonth.label}
                leafRows={byLeafThisMonth}
              />
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="relative z-1 space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            All-time · subcategories
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Total till now · share is out of {formatInr(allTimeTotal)}
          </p>
        </div>
        <GlassCard
          variant="signature"
          hideAccent
          noLift
          panelClassName="!p-0 !overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="bg-white/3">
                  <Th>Parent</Th>
                  <Th>Subcategory</Th>
                  <Th>Amount</Th>
                  <Th>Share</Th>
                </tr>
              </thead>
              <tbody className="[&_tr:hover]:bg-white/4">
                {allTimeLeafRows.length === 0 ? (
                  <tr>
                    <Td className="text-zinc-500" colSpan={4}>
                      No investments yet.
                    </Td>
                  </tr>
                ) : (
                  allTimeLeafRows.map((r, i) => (
                    <tr key={`${r.parentName}-${r.leafName}-${i}`}>
                      <Td className="text-zinc-400">{r.parentName}</Td>
                      <Td className="font-medium">{r.leafName}</Td>
                      <Td className="tabular-nums">{formatInr(r.total)}</Td>
                      <Td className="text-zinc-400 tabular-nums">
                        {pctCell(r.shareOfAllTime)}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
