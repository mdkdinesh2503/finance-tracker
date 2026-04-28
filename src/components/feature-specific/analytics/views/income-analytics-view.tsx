import type { ReactNode } from "react";
import Link from "next/link";

import { IncomeSalaryWagesChart } from "@/components/feature-specific/analytics/charts/income-salary-wages-chart";
import { SalaryByEmployerChart } from "@/components/feature-specific/analytics/charts/salary-by-employer-chart";
import { GlassCard } from "@/components/ui/glass-card";
import type {
  IncomeAnalyticsSnapshot,
  SalaryHistoryRow,
} from "@/lib/types/income-analytics";
import type { IncomeSalaryChartPoint } from "@/components/feature-specific/analytics/charts/income-salary-wages-chart";
import { formatInr, formatYearMonthLabel } from "@/lib/utilities/format";

function mergeSalaryChartSeries(
  calendar: SalaryHistoryRow[],
  spend: SalaryHistoryRow[],
): IncomeSalaryChartPoint[] {
  const keys = new Set<string>();
  for (const r of calendar) keys.add(r.ym);
  for (const r of spend) keys.add(r.ym);
  const cMap = new Map(calendar.map((r) => [r.ym, r.total]));
  const sMap = new Map(spend.map((r) => [r.ym, r.total]));
  return [...keys]
    .sort((a, b) => a.localeCompare(b))
    .map((month) => ({
      month,
      salary: cMap.get(month) ?? 0,
      salarySpendAligned: sMap.get(month) ?? 0,
    }));
}

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
          ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-200"
          : "border-rose-500/30 bg-rose-500/10 text-rose-200"
      }`}
    >
      {up ? "↑" : "↓"} {up ? "+" : ""}
      {pct.toFixed(1)}% vs prior month
    </span>
  );
}

function SalaryIncomeAnalyticsViewContent({ data }: Props) {
  const {
    thisMonth,
    lastMonth,
    salaryWagesMonthly,
    salaryWagesSpendAlignedMonthly,
    lifetimeSalaryWagesTotal,
    lifetimeSalaryByEmployer,
    salaryEmployerMonthlyCells,
    employerSalaryInsights,
  } = data;

  const salaryDelta = pctVsPrevious(thisMonth.totalIncome, lastMonth.totalIncome);

  const salaryChartData = mergeSalaryChartSeries(
    salaryWagesMonthly,
    salaryWagesSpendAlignedMonthly,
  );

  const salaryRhythmHasData =
    salaryChartData.length > 0 && salaryChartData.some((d) => d.salary > 0);

  const peakSalaryMonth = salaryWagesMonthly.reduce<{ ym: string; total: number } | null>(
    (best, r) => {
      if (!best || r.total > best.total) return { ym: r.ym, total: r.total };
      return best;
    },
    null,
  );

  const compareMax = Math.max(thisMonth.totalIncome, lastMonth.totalIncome, 1);
  const barThisPct = (thisMonth.totalIncome / compareMax) * 100;
  const barLastPct = (lastMonth.totalIncome / compareMax) * 100;
  const absDeltaInr = thisMonth.totalIncome - lastMonth.totalIncome;

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

      <header className="relative z-1 space-y-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">
            Insights · Income · Salary &amp; Wages
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            <span className="bg-linear-to-r from-ink via-emerald-100 to-teal-200 bg-clip-text text-transparent">
              Salary &amp; Wages
            </span>
          </h1>
          <p className="max-w-2xl text-sm leading-snug text-ink-muted">
            Totals use each row&apos;s transaction date. Multiple employers appear together on the
            chart below. Other income is on{" "}
            <Link
              href="/analytics/income/other"
              prefetch={false}
              className="text-primary underline-offset-2 hover:underline"
            >
              Other income
            </Link>
            .
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <GlassCard
            variant="signature"
            className="income-hero-stat flex min-h-0 flex-col overflow-hidden"
            panelClassName="!flex !min-h-0 !flex-1 !flex-col !p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Total · all time
            </p>
            <p className="mt-2 text-xl font-semibold tracking-tight text-emerald-100 tabular-nums sm:text-2xl">
              {formatInr(lifetimeSalaryWagesTotal)}
            </p>
            <p className="mt-auto pt-3 text-[11px] text-zinc-500">Salary &amp; Wages only</p>
          </GlassCard>
          <GlassCard
            variant="signature"
            className="income-hero-stat flex min-h-0 flex-col overflow-hidden"
            panelClassName="!flex !min-h-0 !flex-1 !flex-col !p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Current month · {thisMonth.label}
            </p>
            <p className="mt-2 text-xl font-semibold tracking-tight text-emerald-100 tabular-nums sm:text-2xl">
              {formatInr(thisMonth.totalIncome)}
            </p>
          </GlassCard>
          <GlassCard
            variant="signature"
            className="income-hero-stat flex min-h-0 flex-col overflow-hidden"
            panelClassName="!flex !min-h-0 !flex-1 !flex-col !p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Previous month · {lastMonth.label}
            </p>
            <p className="mt-2 text-xl font-semibold tracking-tight text-emerald-100/90 tabular-nums sm:text-2xl">
              {formatInr(lastMonth.totalIncome)}
            </p>
          </GlassCard>
        </div>
      </header>

      <section className="relative z-1 space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">By employer over time</h2>
          <p className="mt-1 text-xs text-ink-muted">
            One line per company. When you add a new employer, it appears as another line on the same
            chart so you can compare.
          </p>
        </div>
        {employerSalaryInsights.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {employerSalaryInsights.map((e) => (
              <GlassCard key={e.companyName} variant="signature" hideAccent noLift panelClassName="!p-4">
                <p className="text-xs font-semibold text-ink">{e.companyName}</p>
                {e.firstMonthYm != null ? (
                  <p className="mt-1 text-[11px] text-ink-muted">
                    First in data:{" "}
                    <span className="font-medium text-ink">
                      {formatYearMonthLabel(e.firstMonthYm)}
                    </span>{" "}
                    · {formatInr(e.firstAmount)}
                  </p>
                ) : null}
                {e.stepUpMonthYm != null ? (
                  <p className="mt-2 text-sm text-ink-muted">
                    <span className="font-medium text-emerald-200">Increase</span> from{" "}
                    {formatInr(e.amountBeforeStepUp)} to {formatInr(e.amountAfterStepUp)} starting{" "}
                    <span className="font-semibold text-ink">
                      {formatYearMonthLabel(e.stepUpMonthYm)}
                    </span>
                    .
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-ink-muted">
                    No month-over-month increase detected yet (flat or only decreases).
                  </p>
                )}
              </GlassCard>
            ))}
          </div>
        ) : null}
        <GlassCard variant="signature" hideAccent noLift panelClassName="!p-3">
          <SalaryByEmployerChart cells={salaryEmployerMonthlyCells} />
        </GlassCard>
      </section>

      {lifetimeSalaryByEmployer.length > 0 ? (
        <section className="relative z-1 space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Salary &amp; Wages by employer · all time totals
          </h2>
          <p className="text-xs text-ink-muted">
            Uses the <em>Employer</em> field on each salary income row.
          </p>
          <GlassCard variant="signature" hideAccent noLift panelClassName="!p-0 !overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[280px] border-collapse text-left">
                <thead>
                  <tr>
                    <Th>Employer</Th>
                    <Th>Total</Th>
                  </tr>
                </thead>
                <tbody className="[&_tr:hover]:bg-white/4">
                  {lifetimeSalaryByEmployer.map((r) => (
                    <tr key={r.companyName}>
                      <Td className="font-medium">{r.companyName}</Td>
                      <Td className="tabular-nums">{formatInr(r.total)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </section>
      ) : null}
    </div>
  );
}

function OtherIncomeAnalyticsView({ data }: Props) {
  const {
    thisMonth,
    lastMonth,
    byParentThisMonth,
    byLeafThisMonth,
    otherIncomeMonthly,
    lifetimeOtherIncomeParentTotal,
    lifetimeFamilySupportTotal,
    lifetimeByParent,
    lifetimeByLeaf,
  } = data;

  const totalDelta = pctVsPrevious(thisMonth.totalIncome, lastMonth.totalIncome);
  const chartData = mergeSalaryChartSeries(otherIncomeMonthly, otherIncomeMonthly);
  const otherRhythmHasData =
    chartData.length > 0 && chartData.some((d) => d.salary > 0);
  const peakOtherMonth = otherIncomeMonthly.reduce<{ ym: string; total: number } | null>(
    (best, r) => {
      if (!best || r.total > best.total) return { ym: r.ym, total: r.total };
      return best;
    },
    null,
  );
  const otherMonthRows = [...otherIncomeMonthly].sort((a, b) => b.ym.localeCompare(a.ym));
  const maxOtherMonth = otherMonthRows.reduce((m, r) => Math.max(m, r.total), 0);

  return (
    <div className="income-scope relative space-y-10 pb-16">
      <div
        className="income-aurora-blob pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl"
        aria-hidden
      />
      <div
        className="income-aurora-blob income-aurora-blob--delayed pointer-events-none absolute -left-24 top-48 h-64 w-64 rounded-full bg-cyan-500/8 blur-3xl"
        aria-hidden
      />

      <header className="relative z-1 space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">
              Insights · Income · Other Income
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              <span className="bg-linear-to-r from-ink via-teal-100 to-cyan-200 bg-clip-text text-transparent">
                Other income
              </span>
            </h1>
            <p className="max-w-2xl text-sm leading-snug text-ink-muted">
              Gifts, family support, and other non-salary cash-in (parent{" "}
              <strong className="text-ink">Other Income</strong>). Salary is on{" "}
              <Link
                href="/analytics/income/salary"
                prefetch={false}
                className="text-primary underline-offset-2 hover:underline"
              >
                Salary &amp; Wages
              </Link>
              .
            </p>
          </div>
          <DeltaChip pct={totalDelta} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <GlassCard
            variant="signature"
            className="income-hero-stat flex h-full min-h-0 flex-col overflow-hidden"
            panelClassName="!flex !min-h-0 !flex-1 !flex-col !p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Other Income · {thisMonth.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-teal-100 tabular-nums sm:text-3xl">
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
              Family support · all time
            </p>
            <p className="mt-2 text-2xl font-semibold text-cyan-100/90 tabular-nums">
              {formatInr(lifetimeFamilySupportTotal)}
            </p>
            <p className="mt-auto pt-3 text-[11px] text-zinc-500">
              Subcategory under Other Income (not a loan).
            </p>
          </GlassCard>
        </div>
      </header>

      <section className="relative z-1 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">All-time · Other Income</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <GlassCard variant="signature" panelClassName="!p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Other Income parent · all time
            </p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-teal-100/90 sm:text-2xl">
              {formatInr(lifetimeOtherIncomeParentTotal)}
            </p>
          </GlassCard>
        </div>
      </section>

      <section className="relative z-1 space-y-4">
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
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-500/30 bg-linear-to-br from-teal-500/15 to-cyan-600/5 text-teal-300"
                  aria-hidden
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-pretty text-sm font-semibold tracking-tight text-ink">
                    Other Income · 12-month flow
                  </h2>
                  <p className="mt-0.5 text-pretty text-[11px] leading-snug text-ink-muted">
                    Totals by calendar month of each credit.
                  </p>
                </div>
              </div>
              {otherRhythmHasData && peakOtherMonth ? (
                <div
                  className="grid w-full max-w-sm shrink-0 grid-rows-[auto_auto] gap-2 self-end rounded-lg border border-teal-500/25 bg-teal-500/8 px-3 py-2 min-[400px]:w-50 min-[400px]:max-w-[42%] min-[400px]:self-auto"
                  role="group"
                  aria-label="Peak other income month in window"
                >
                  <p className="border-b border-teal-500/20 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-teal-200/90">
                    Peak month
                  </p>
                  <div className="flex items-end justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold tabular-nums leading-none text-ink">
                      {formatInr(peakOtherMonth.total)}
                    </span>
                    <span className="shrink-0 text-right text-[10px] leading-snug text-ink-muted">
                      {formatYearMonthLabel(peakOtherMonth.ym)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="min-h-0 w-full flex-1">
            <IncomeSalaryWagesChart
              data={chartData}
              primarySeriesLabel="Other Income"
              showSpendMonthInTooltip={false}
              emptyTitle="No Other Income history in range"
              emptyHint="Record income under Other Income to see the trend."
            />
          </div>
        </GlassCard>
      </section>

      <section className="relative z-1 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Other Income by month</h2>
        <p className="text-xs text-ink-muted">Newest first · relative bar vs largest month in window</p>
        <GlassCard variant="signature" hideAccent noLift panelClassName="!p-3">
          <div className="rounded-2xl border border-(--border) bg-(--glass-simple-bg) p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {otherMonthRows.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-muted">No Other Income in the last year.</p>
            ) : (
              <ul className="flex flex-col gap-1.5" role="list">
                {otherMonthRows.map((r) => {
                  const barPct =
                    maxOtherMonth > 0 && r.total > 0 ? (r.total / maxOtherMonth) * 100 : 0;
                  return (
                    <li key={r.ym}>
                      <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 transition-[border-color,background-color] duration-200 hover:border-teal-500/20 hover:bg-white/5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-medium text-ink">{formatYearMonthLabel(r.ym)}</span>
                          <span className="text-sm font-semibold tabular-nums text-teal-100/95">
                            {formatInr(r.total)}
                          </span>
                        </div>
                        <div
                          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#0a1020] ring-1 ring-white/5"
                          aria-hidden
                        >
                          <div
                            className="h-full rounded-full bg-linear-to-r from-teal-600/90 to-cyan-400/75 motion-safe:transition-[width] motion-safe:duration-500"
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

      <section className="relative z-1 space-y-3">
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
              <tbody className="[&_tr:hover]:bg-white/4">
                {byParentThisMonth.length === 0 ? (
                  <tr>
                    <Td className="text-zinc-500" colSpan={2}>
                      No Other Income recorded this month.
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

      <section className="relative z-1 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">This month · subcategories</h2>
        <p className="text-xs text-ink-muted">Leaf categories</p>
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
              <tbody className="[&_tr:hover]:bg-white/4">
                {byLeafThisMonth.length === 0 ? (
                  <tr>
                    <Td className="text-zinc-500" colSpan={3}>
                      No Other Income recorded this month.
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

      <section className="relative z-1 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">All-time · parent groups</h2>
        <GlassCard variant="signature" hideAccent panelClassName="!p-0 !overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] border-collapse text-left">
              <thead>
                <tr>
                  <Th>Parent</Th>
                  <Th>Total</Th>
                </tr>
              </thead>
              <tbody className="[&_tr:hover]:bg-white/4">
                {lifetimeByParent.length === 0 ? (
                  <tr>
                    <Td className="text-zinc-500" colSpan={2}>
                      No Other Income yet.
                    </Td>
                  </tr>
                ) : (
                  lifetimeByParent.map((r) => (
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

      <section className="relative z-1 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink">All-time · subcategories</h2>
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
              <tbody className="[&_tr:hover]:bg-white/4">
                {lifetimeByLeaf.length === 0 ? (
                  <tr>
                    <Td className="text-zinc-500" colSpan={3}>
                      No Other Income yet.
                    </Td>
                  </tr>
                ) : (
                  lifetimeByLeaf.map((r, i) => (
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

export function IncomeAnalyticsView({ data }: Props) {
  if (data.scope === "other") {
    return <OtherIncomeAnalyticsView data={data} />;
  }
  return <SalaryIncomeAnalyticsViewContent data={data} />;
}
