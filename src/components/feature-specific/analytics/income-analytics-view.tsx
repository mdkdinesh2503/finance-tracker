import type { ReactNode } from "react";
import Link from "next/link";

import { IncomeSalaryWagesChart } from "@/components/feature-specific/analytics/income-salary-wages-chart";
import { GlassCard } from "@/components/ui/glass-card";
import type { IncomeAnalyticsSnapshot } from "@/lib/types/income-analytics";
import { formatInr, formatYearMonthLabel } from "@/lib/utilities/format";

type Props = {
  data: IncomeAnalyticsSnapshot;
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
          ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-200"
          : "border-rose-500/30 bg-rose-500/10 text-rose-200"
      }`}
    >
      {up ? "↑" : "↓"} {up ? "+" : ""}
      {pct.toFixed(1)}% vs prior month
    </span>
  );
}

export function IncomeAnalyticsView({ data }: Props) {
  const {
    thisMonth,
    lastMonth,
    byParentThisMonth,
    byLeafThisMonth,
    salaryWagesMonthly,
    projection,
  } = data;

  const totalDelta = pctVsPrevious(thisMonth.totalIncome, lastMonth.totalIncome);
  const salaryDelta = pctVsPrevious(thisMonth.salaryWagesTotal, lastMonth.salaryWagesTotal);

  const salaryChartData = [...salaryWagesMonthly]
    .sort((a, b) => a.ym.localeCompare(b.ym))
    .map((r) => ({ month: r.ym, salary: r.total }));

  const salaryRhythmHasData =
    salaryChartData.length > 0 && salaryChartData.some((d) => d.salary > 0);

  const peakSalaryMonth = salaryWagesMonthly.reduce<{ ym: string; total: number } | null>(
    (best, r) => {
      if (!best || r.total > best.total) return { ym: r.ym, total: r.total };
      return best;
    },
    null,
  );

  const salaryMonthRows = [...salaryWagesMonthly].sort((a, b) => b.ym.localeCompare(a.ym));
  const maxSalaryMonth = salaryMonthRows.reduce((m, r) => Math.max(m, r.total), 0);

  return (
    <div className="income-scope relative space-y-10 pb-16">
      <div
        className="income-aurora-blob pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden
      />
      <div
        className="income-aurora-blob income-aurora-blob--delayed pointer-events-none absolute -left-24 top-48 h-64 w-64 rounded-full bg-teal-500/8 blur-3xl"
        aria-hidden
      />

      <header className="relative z-[1] space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">
              Insights · Income
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              <span className="bg-linear-to-r from-ink via-emerald-100 to-teal-200 bg-clip-text text-transparent">
                Cash-in rhythm
              </span>
            </h1>
            <p className="max-w-2xl text-sm leading-snug text-ink-muted">
              This month vs last, <strong className="text-ink">Salary &amp; Wages</strong> trend, and
              a naive salary hint from closed months only. Broader trends live on{" "}
              <Link
                href="/analytics"
                prefetch={false}
                className="text-primary underline-offset-2 hover:underline"
              >
                Analytics
              </Link>
              {" · "}
              <Link
                href="/analytics/investments"
                prefetch={false}
                className="text-primary underline-offset-2 hover:underline"
              >
                Invest
              </Link>
              .
            </p>
          </div>
          <DeltaChip pct={totalDelta} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <GlassCard
            variant="signature"
            className="income-hero-stat flex h-full min-h-0 flex-col overflow-hidden sm:col-span-2 xl:col-span-1"
            panelClassName="!flex !min-h-0 !flex-1 !flex-col !p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Total income · {thisMonth.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-100 tabular-nums sm:text-3xl">
              {formatInr(thisMonth.totalIncome)}
            </p>
            <p className="mt-auto pt-3 text-[11px] text-zinc-500">
              Prev month: {formatInr(lastMonth.totalIncome)}
            </p>
          </GlassCard>

          <GlassCard
            variant="signature"
            className="income-hero-stat flex h-full min-h-0 flex-col"
            panelClassName="!flex !min-h-0 !flex-1 !flex-col !p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Salary &amp; Wages
            </p>
            <p className="mt-2 text-2xl font-semibold text-emerald-100/95 tabular-nums">
              {formatInr(thisMonth.salaryWagesTotal)}
            </p>
            <p className="mt-auto pt-3">
              <DeltaChip pct={salaryDelta} />
            </p>
          </GlassCard>

          <GlassCard
            variant="signature"
            className="income-hero-stat flex h-full min-h-0 flex-col sm:col-span-2 xl:col-span-1"
            panelClassName="!flex !min-h-0 !flex-1 !flex-col !p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Other income · {thisMonth.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-teal-100/90 tabular-nums">
              {formatInr(thisMonth.otherIncomeParentTotal)}
            </p>
            <p className="mt-auto pt-3 text-[11px] text-zinc-500">
              Parent &quot;Other Income&quot; · Prev {formatInr(lastMonth.otherIncomeParentTotal)}
            </p>
          </GlassCard>
        </div>
      </header>

      <section className="relative z-[1] space-y-4">
        <GlassCard
          variant="signature"
          hideAccent
          noLift
          className="flex min-h-0 flex-col"
          panelClassName="flex min-h-0 flex-1 flex-col !p-3"
        >
          <div className="mb-2 shrink-0">
            <div className="flex flex-col gap-2 min-[400px]:flex-row min-[400px]:items-start min-[400px]:justify-between min-[400px]:gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-linear-to-br from-emerald-500/15 to-teal-600/5 text-emerald-300"
                  aria-hidden
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-pretty text-sm font-semibold tracking-tight text-ink">
                    Salary &amp; Wages · 12-month flow
                  </h2>
                  <p className="mt-0.5 text-pretty text-[11px] leading-snug text-ink-muted">
                    Calendar months in range — hover points for detail
                  </p>
                </div>
              </div>
              {salaryRhythmHasData && peakSalaryMonth ? (
                <div
                  className="grid w-full max-w-sm shrink-0 grid-rows-[auto_auto] gap-2 self-end rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2 min-[400px]:w-50 min-[400px]:max-w-[42%] min-[400px]:self-auto"
                  role="group"
                  aria-label="Peak salary month in window"
                >
                  <p className="border-b border-emerald-500/20 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-200/90">
                    Peak month
                  </p>
                  <div className="flex items-end justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold tabular-nums leading-none text-ink">
                      {formatInr(peakSalaryMonth.total)}
                    </span>
                    <span className="shrink-0 text-right text-[10px] leading-snug text-ink-muted">
                      {formatYearMonthLabel(peakSalaryMonth.ym)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="min-h-0 w-full flex-1">
            <IncomeSalaryWagesChart data={salaryChartData} />
          </div>
        </GlassCard>
      </section>

      <section className="relative z-[1] space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">Salary outlook</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Completed months only — not advice; rough extrapolation from average MoM change.
          </p>
        </div>
        <GlassCard variant="signature" hideAccent noLift panelClassName="!p-5">
          {projection.projectedNextMonthSalary != null && projection.averageMoMChangePercent != null ? (
            <div className="space-y-2">
              <p className="text-xl font-semibold text-emerald-100 sm:text-2xl">
                ~{formatInr(projection.projectedNextMonthSalary)}{" "}
                <span className="text-base font-normal text-ink-muted">next month (Salary &amp; Wages)</span>
              </p>
              <p className="text-xs text-ink-muted">
                Avg MoM {projection.averageMoMChangePercent >= 0 ? "+" : ""}
                {projection.averageMoMChangePercent.toFixed(2)}% · {projection.completedMonthsUsed} closed
                month(s) · Last closed{" "}
                {projection.lastCompletedMonthYm
                  ? formatYearMonthLabel(projection.lastCompletedMonthYm)
                  : "—"}{" "}
                at {formatInr(projection.lastCompletedMonthSalary)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              Add at least two past months of Salary &amp; Wages to unlock a simple trend estimate.
            </p>
          )}
        </GlassCard>
      </section>

      <section className="relative z-[1] space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Salary by month</h2>
        <p className="text-xs text-ink-muted">Newest first · relative bar vs largest month in window</p>
        <GlassCard variant="signature" hideAccent noLift panelClassName="!p-3">
          <div className="rounded-2xl border border-(--border) bg-(--glass-simple-bg) p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {salaryMonthRows.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-muted">No Salary &amp; Wages in the last year.</p>
            ) : (
              <ul className="flex flex-col gap-1.5" role="list">
                {salaryMonthRows.map((r) => {
                  const barPct =
                    maxSalaryMonth > 0 && r.total > 0 ? (r.total / maxSalaryMonth) * 100 : 0;
                  return (
                    <li key={r.ym}>
                      <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 transition-[border-color,background-color] duration-200 hover:border-emerald-500/20 hover:bg-white/5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-medium text-ink">{formatYearMonthLabel(r.ym)}</span>
                          <span className="text-sm font-semibold tabular-nums text-emerald-100/95">
                            {formatInr(r.total)}
                          </span>
                        </div>
                        <div
                          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#0a1020] ring-1 ring-white/5"
                          aria-hidden
                        >
                          <div
                            className="h-full rounded-full bg-linear-to-r from-emerald-600/90 to-teal-400/75 motion-safe:transition-[width] motion-safe:duration-500"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </GlassCard>
      </section>

      <section className="relative z-[1] space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">This month · parent groups</h2>
        <GlassCard variant="signature" hideAccent panelClassName="!p-0 !overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] border-collapse text-left">
              <thead>
                <tr>
                  <Th>Parent</Th>
                  <Th>Total</Th>
                </tr>
              </thead>
              <tbody className="[&_tr:hover]:bg-white/[0.04]">
                {byParentThisMonth.length === 0 ? (
                  <tr>
                    <Td className="text-zinc-500" colSpan={2}>
                      No income recorded this month.
                    </Td>
                  </tr>
                ) : (
                  byParentThisMonth.map((r) => (
                    <tr key={r.parentName}>
                      <Td className="font-medium">{r.parentName}</Td>
                      <Td className="tabular-nums">{formatInr(r.total)}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>

      <section className="relative z-[1] space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">This month · subcategories</h2>
        <p className="text-xs text-ink-muted">Leaf categories with parent context</p>
        <GlassCard variant="signature" hideAccent panelClassName="!p-0 !overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left">
              <thead>
                <tr>
                  <Th>Parent</Th>
                  <Th>Subcategory</Th>
                  <Th>Total</Th>
                </tr>
              </thead>
              <tbody className="[&_tr:hover]:bg-white/[0.04]">
                {byLeafThisMonth.length === 0 ? (
                  <tr>
                    <Td className="text-zinc-500" colSpan={3}>
                      No income recorded this month.
                    </Td>
                  </tr>
                ) : (
                  byLeafThisMonth.map((r, i) => (
                    <tr key={`${r.parentName}-${r.leafName}-${i}`}>
                      <Td className="text-ink-muted">{r.parentName}</Td>
                      <Td className="font-medium">{r.leafName}</Td>
                      <Td className="tabular-nums">{formatInr(r.total)}</Td>
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
