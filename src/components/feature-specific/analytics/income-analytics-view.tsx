import type { ReactNode } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
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
    <th className="border-b border-white/10 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
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
      className={`border-b border-white/5 px-2 py-2 text-sm text-ink ${className}`}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct == null) {
    return <span className="text-xs text-zinc-500">n/a</span>;
  }
  const up = pct >= 0;
  return (
    <span
      className={`text-xs font-medium ${up ? "text-emerald-300" : "text-rose-300"}`}
    >
      {up ? "+" : ""}
      {pct.toFixed(1)}% vs last month
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
  const salaryDelta = pctVsPrevious(
    thisMonth.salaryWagesTotal,
    lastMonth.salaryWagesTotal,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Insights"
        title="Income analytics"
        subtitle={
          <>
            This calendar month vs last month, breakdown by your income categories, and a simple
            salary trend hint from recent months. General expense trends stay on{" "}
            <Link href="/analytics" className="text-primary underline-offset-2 hover:underline">
              Analytics
            </Link>
            .
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GlassCard className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Total income · {thisMonth.label}
          </p>
          <p className="mt-1 text-xl font-semibold text-emerald-200">
            {formatInr(thisMonth.totalIncome)}
          </p>
          <p className="mt-2">
            <DeltaBadge pct={totalDelta} />
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Last month: {formatInr(lastMonth.totalIncome)}
          </p>
        </GlassCard>

        <GlassCard className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Salary &amp; Wages · {thisMonth.label}
          </p>
          <p className="mt-1 text-xl font-semibold text-emerald-200/95">
            {formatInr(thisMonth.salaryWagesTotal)}
          </p>
          <p className="mt-2">
            <DeltaBadge pct={salaryDelta} />
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Last month: {formatInr(lastMonth.salaryWagesTotal)}
          </p>
        </GlassCard>

        <GlassCard className="p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Other income · {thisMonth.label}
          </p>
          <p className="mt-1 text-xl font-semibold text-teal-200/90">
            {formatInr(thisMonth.otherIncomeParentTotal)}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Parent group &quot;Other Income&quot; (rental, gifts, etc.). Last month:{" "}
            {formatInr(lastMonth.otherIncomeParentTotal)}
          </p>
        </GlassCard>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Salary outlook (informal)</h2>
        <GlassCard className="space-y-3 p-4">
          <p className="text-sm text-ink-muted">
            Uses <strong className="text-ink">Salary &amp; Wages</strong> totals from completed
            calendar months only (not the current partial month). Average month-over-month change
            across those months is applied to the latest completed month—rough guess only, not
            financial advice.
          </p>
          {projection.projectedNextMonthSalary != null &&
          projection.averageMoMChangePercent != null ? (
            <div className="space-y-1">
              <p className="text-lg font-semibold text-emerald-200">
                ~{formatInr(projection.projectedNextMonthSalary)} next month (Salary &amp; Wages)
              </p>
              <p className="text-xs text-zinc-500">
                Avg MoM change: {projection.averageMoMChangePercent >= 0 ? "+" : ""}
                {projection.averageMoMChangePercent.toFixed(2)}% · Based on{" "}
                {projection.completedMonthsUsed} completed month(s), last closed{" "}
                {projection.lastCompletedMonthYm
                  ? formatYearMonthLabel(projection.lastCompletedMonthYm)
                  : "—"}{" "}
                at {formatInr(projection.lastCompletedMonthSalary)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Add at least two past months of Salary &amp; Wages income to see a simple trend-based
              estimate.
            </p>
          )}
        </GlassCard>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Salary &amp; Wages by month</h2>
        <p className="text-sm text-ink-muted">Last 12 months of data in range (calendar months).</p>
        <GlassCard className="overflow-x-auto p-0" hideAccent>
          <table className="w-full min-w-[280px] border-collapse">
            <thead>
              <tr>
                <Th>Month</Th>
                <Th>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {salaryWagesMonthly.length === 0 ? (
                <tr>
                  <Td className="text-zinc-500" colSpan={2}>
                    No Salary &amp; Wages income in the last year.
                  </Td>
                </tr>
              ) : (
                [...salaryWagesMonthly]
                  .sort((a, b) => b.ym.localeCompare(a.ym))
                  .map((r) => (
                    <tr key={r.ym}>
                      <Td>{formatYearMonthLabel(r.ym)}</Td>
                      <Td className="tabular-nums">{formatInr(r.total)}</Td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </GlassCard>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">This month by parent category</h2>
        <GlassCard className="overflow-x-auto p-0" hideAccent>
          <table className="w-full min-w-[360px] border-collapse">
            <thead>
              <tr>
                <Th>Parent</Th>
                <Th>Total</Th>
              </tr>
            </thead>
            <tbody>
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
        </GlassCard>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">This month by subcategory</h2>
        <p className="text-sm text-ink-muted">
          Leaf categories (Primary Salary, Bonus, Rental Income, …).
        </p>
        <GlassCard className="overflow-x-auto p-0" hideAccent>
          <table className="w-full min-w-[480px] border-collapse">
            <thead>
              <tr>
                <Th>Parent</Th>
                <Th>Subcategory</Th>
                <Th>Total</Th>
              </tr>
            </thead>
            <tbody>
              {byLeafThisMonth.length === 0 ? (
                <tr>
                  <Td className="text-zinc-500" colSpan={3}>
                    No income recorded this month.
                  </Td>
                </tr>
              ) : (
                byLeafThisMonth.map((r, i) => (
                  <tr key={`${r.parentName}-${r.leafName}-${i}`}>
                    <Td>{r.parentName}</Td>
                    <Td className="font-medium">{r.leafName}</Td>
                    <Td className="tabular-nums">{formatInr(r.total)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </GlassCard>
      </section>
    </div>
  );
}
