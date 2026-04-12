import type { ReactNode } from "react";
import Link from "next/link";

import { InvestMonthlyContributionChart } from "@/components/feature-specific/analytics/invest-monthly-contribution-chart";
import { GlassCard } from "@/components/ui/glass-card";
import type { InvestmentAnalyticsSnapshot } from "@/lib/types/investment-analytics";
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
      className={`border-b border-white/[0.04] px-3 py-2.5 text-sm text-ink transition-colors duration-150 first:rounded-l-lg last:rounded-r-lg ${className}`}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}

function DeltaChip({ pct }: { pct: number | null }) {
  if (pct == null) {
    return (
      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-500">
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
}: {
  financial: number;
  cash: number;
  total: number;
  monthLabel: string;
}) {
  if (total <= 0) {
    return (
      <div className="flex flex-1 flex-col justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
        <p className="text-sm font-medium text-zinc-400">
          No investment total this period
        </p>
        <p className="mt-1 text-xs text-zinc-600">{monthLabel}</p>
      </div>
    );
  }

  const other = Math.max(0, total - financial - cash);
  const pFin = (financial / total) * 100;
  const pCash = (cash / total) * 100;
  const pOther = (other / total) * 100;

  const conic = `conic-gradient(from -90deg, rgb(2,132,199) 0% ${pFin}%, rgb(20,184,166) ${pFin}% ${pFin + pCash}%, rgb(139,92,246) ${pFin + pCash}% 100%)`;

  const rows: SplitRow[] = [
    {
      key: "fin",
      label: "Financial & obligations",
      amount: financial,
      pct: pFin,
      barClass: "bg-linear-to-r from-sky-600 to-sky-400",
      dotClass: "bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.45)]",
      amountClass: "text-sky-100",
    },
    {
      key: "cash",
      label: "Cash savings",
      amount: cash,
      pct: pCash,
      barClass: "bg-linear-to-r from-teal-600 to-emerald-400",
      dotClass: "bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.35)]",
      amountClass: "text-teal-100",
    },
  ];
  if (other > 0) {
    rows.push({
      key: "other",
      label: "Other parent groups",
      amount: other,
      pct: pOther,
      barClass: "bg-linear-to-r from-violet-600 to-indigo-400",
      dotClass: "bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.35)]",
      amountClass: "text-violet-100",
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8 lg:flex-row lg:items-center lg:gap-10">
      <p className="sr-only">
        This month total {formatInr(total)}. Financial and obligations{" "}
        {formatInr(financial)}, {pFin.toFixed(1)} percent. Cash savings{" "}
        {formatInr(cash)}, {pCash.toFixed(1)} percent.
        {other > 0
          ? ` Other groups ${formatInr(other)}, ${pOther.toFixed(1)} percent.`
          : ""}
      </p>
      <div className="flex justify-center lg:shrink-0">
        <div
          className="relative rounded-full p-[10px] shadow-[0_0_48px_-12px_rgba(59,130,246,0.55)] ring-1 ring-white/10 motion-safe:transition-transform motion-safe:duration-500 motion-safe:hover:scale-[1.02]"
          style={{ background: conic }}
          aria-hidden
        >
          <div
            className="flex h-[9.5rem] w-[9.5rem] flex-col items-center justify-center rounded-full border border-white/10 bg-[var(--glass-inner-bg)] px-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            style={{ backdropFilter: "blur(12px)" }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              This month
            </span>
            <span className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-ink sm:text-2xl">
              {formatInr(total)}
            </span>
            <span className="mt-2 text-[10px] text-zinc-500">{monthLabel}</span>
          </div>
        </div>
      </div>

      <ul
        className="min-w-0 flex-1 space-y-3"
        aria-label="Composition by pillar"
      >
        {rows.map((r) => (
          <li
            key={r.key}
            className="group rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5 transition-[border-color,background-color] duration-200 hover:border-primary/25 hover:bg-white/[0.05]"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${r.dotClass}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-ink">
                    {r.label}
                  </span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${r.amountClass}`}
                  >
                    {formatInr(r.amount)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0a1020] ring-1 ring-white/5">
                    <div
                      className={`h-full rounded-full ${r.barClass} motion-safe:transition-all motion-safe:duration-700`}
                      style={{ width: `${Math.max(r.pct, 0.5)}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-zinc-400">
                    {r.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
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
    byParentThisMonth,
    byLeafThisMonth,
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

  const monthByMonthRows = [...monthlyTotals].sort((a, b) =>
    b.ym.localeCompare(a.ym),
  );
  const maxMonthByMonthTotal = monthByMonthRows.reduce(
    (m, r) => Math.max(m, r.total),
    0,
  );

  return (
    <div className="invest-scope space-y-10 pb-16">
      <header className="relative z-[1] space-y-8">
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
      <section className="relative z-[1] grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
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
              />
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="relative z-1 space-y-3">
        <h2 className="text-lg font-semibold text-ink">
          This month · subcategories
        </h2>
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
                {byLeafThisMonth.length === 0 ? (
                  <tr>
                    <Td className="text-zinc-500" colSpan={4}>
                      No investments this month.
                    </Td>
                  </tr>
                ) : (
                  byLeafThisMonth.map((r, i) => (
                    <tr key={`${r.parentName}-${r.leafName}-${i}`}>
                      <Td className="text-zinc-400">{r.parentName}</Td>
                      <Td className="font-medium">{r.leafName}</Td>
                      <Td className="tabular-nums">{formatInr(r.total)}</Td>
                      <Td className="text-zinc-400 tabular-nums">
                        {pctCell(r.shareOfPeriod)}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>

      {/* Month-by-month list */}
      <section className="relative z-1 space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Month-by-month
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Newest first · same window as the chart above
          </p>
        </div>
        <GlassCard variant="signature" hideAccent noLift panelClassName="!p-3">
          <div className="rounded-2xl">
            {monthByMonthRows.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-muted">
                No investment transactions in range.
              </p>
            ) : (
              <>
                <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                    Month
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                    Invested
                  </span>
                </div>
                <ul className="flex flex-col gap-1.5" role="list">
                  {monthByMonthRows.map((r) => {
                    const barPct =
                      maxMonthByMonthTotal > 0 && r.total > 0
                        ? (r.total / maxMonthByMonthTotal) * 100
                        : 0;
                    return (
                      <li key={r.ym}>
                        <div className="rounded-xl px-3 py-2.5 transition-[border-color,background-color] duration-200 hover:border-sky-500/20 hover:bg-white/5">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 truncate text-sm font-medium text-ink">
                              {formatYearMonthLabel(r.ym)}
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-sky-100/95">
                              {formatInr(r.total)}
                            </span>
                          </div>
                          <div
                            className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#0a1020] ring-1 ring-white/5"
                            aria-hidden
                          >
                            <div
                              className="h-full rounded-full bg-linear-to-r from-sky-600/90 to-sky-400/70 motion-safe:transition-[width] motion-safe:duration-500"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
