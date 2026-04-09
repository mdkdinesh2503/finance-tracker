import type { ReactNode } from "react";
import type { DashboardPayload } from "@/lib/types/transactions";
import type { TransactionType } from "@/lib/db/schema";
import { TransactionTypeChip } from "@/components/common/transaction-type-chip";
import {
  formatActivityDateTime,
  formatCurrency,
  formatYearMonthLabel,
} from "@/lib/utilities/format";
import { PageHeader } from "@/components/common/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { DashboardMonthlyExpenseChart } from "./dashboard-monthly-expense-chart";
import { transactionRailClass } from "@/lib/utilities/transactions/type-ui";

type StatAccent =
  | "income"
  | "expense"
  | "investment"
  | "borrow"
  | "repay"
  | "lend"
  | "receive"
  | "balance"
  | "liability";

const statAccentClass: Record<StatAccent, string> = {
  income:
    "!border-emerald-500/25 bg-emerald-500/[0.07] hover:!border-emerald-400/40 hover:bg-emerald-500/[0.1]",
  expense:
    "!border-rose-500/25 bg-rose-500/[0.07] hover:!border-rose-400/40 hover:bg-rose-500/[0.1]",
  investment:
    "!border-blue-500/30 bg-blue-500/[0.08] hover:!border-blue-400/45 hover:bg-blue-500/[0.12]",
  borrow:
    "!border-amber-500/25 bg-amber-500/[0.07] hover:!border-amber-400/35 hover:bg-amber-500/[0.1]",
  repay:
    "!border-sky-500/25 bg-sky-500/[0.07] hover:!border-sky-400/35 hover:bg-sky-500/[0.1]",
  lend: "!border-violet-500/25 bg-violet-500/[0.07] hover:!border-violet-400/35 hover:bg-violet-500/[0.1]",
  receive:
    "!border-teal-500/25 bg-teal-500/[0.07] hover:!border-teal-400/35 hover:bg-teal-500/[0.1]",
  balance:
    "!border-blue-400/35 bg-linear-to-br from-blue-600/[0.14] via-blue-500/[0.06] to-transparent hover:!border-blue-400/55",
  liability:
    "!border-orange-500/25 bg-orange-500/[0.06] hover:!border-orange-400/35 hover:bg-orange-500/[0.09]",
};

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 flex shrink-0 items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        {children}
      </span>
      <span className="h-px flex-1 bg-linear-to-r from-primary/45 via-(--border) to-transparent" />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
  largeValue,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: StatAccent;
  largeValue?: boolean;
}) {
  return (
    <GlassCard
      className={`group relative overflow-hidden p-3 transition-all duration-300 ${statAccentClass[accent]}`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/5 blur-2xl transition-opacity duration-500 group-hover:opacity-90" />
      <p className="relative text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p
        className={`relative mt-1 font-semibold tabular-nums tracking-tight text-ink ${largeValue ? "text-2xl" : "text-lg"}`}
      >
        {value}
      </p>
      {sub ? (
        <p className="relative mt-1.5 text-[10px] leading-relaxed text-(--ink-muted-2)">
          {sub}
        </p>
      ) : null}
    </GlassCard>
  );
}

function isOutflowType(t: TransactionType): boolean {
  return t === "EXPENSE" || t === "INVESTMENT" || t === "REPAYMENT";
}

function ActivityAmount({
  type,
  amount,
  compact,
}: {
  type: TransactionType;
  amount: number;
  compact?: boolean;
}) {
  const out = isOutflowType(type);
  const formatted = formatCurrency(amount);
  const sz = compact
    ? "text-xs font-semibold tabular-nums"
    : "text-base font-semibold tabular-nums tracking-tight";
  if (out) {
    return <span className={`shrink-0 text-right text-rose-300 ${sz}`}>−{formatted}</span>;
  }
  return <span className={`shrink-0 text-right text-emerald-300 ${sz}`}>+{formatted}</span>;
}

export function DashboardPanel({ data }: { data: DashboardPayload }) {
  const {
    thisMonth,
    cumulativeBalance,
    cumulativePendingLiability,
    cumulativePendingReceivable,
    monthlyExpenseTrend,
    recentActivity,
  } = data;

  const now = new Date();
  const monthLabel = now.toLocaleString(undefined, { month: "long", year: "numeric" });

  const trendHasData =
    monthlyExpenseTrend.length > 0 && monthlyExpenseTrend.some((d) => d.expense > 0);
  const peakMonth = monthlyExpenseTrend.reduce(
    (best, p) => (p.expense > best.expense ? p : best),
    monthlyExpenseTrend[0] ?? { month: "", expense: 0 },
  );

  const peakActivityRow =
    recentActivity.length === 0
      ? null
      : recentActivity.reduce((best, r) => (Math.abs(r.amount) > Math.abs(best.amount) ? r : best));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        subtitle={
          <>
            <span className="font-medium text-ink">{monthLabel}</span>
            {" · "}trend and activity
          </>
        }
      />

      <section className="shrink-0">
        <SectionLabel>This month</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <Stat accent="income" label="Income" value={formatCurrency(thisMonth.income)} />
          <Stat accent="expense" label="Expense" value={formatCurrency(thisMonth.expense)} />
          <Stat accent="investment" label="Investment" value={formatCurrency(thisMonth.investment)} />
          <Stat accent="borrow" label="Borrowed" value={formatCurrency(thisMonth.borrowed)} />
          <Stat accent="repay" label="Repaid" value={formatCurrency(thisMonth.repaid)} />
          <Stat accent="lend" label="Lent" value={formatCurrency(thisMonth.lent)} />
          <Stat accent="receive" label="Received" value={formatCurrency(thisMonth.received)} />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            accent="balance"
            largeValue
            label="Balance (all time)"
            value={formatCurrency(cumulativeBalance)}
            sub="INCOME + BORROW + RECEIVE − EXPENSE − INVESTMENT − REPAYMENT − LEND"
          />
          <Stat
            accent="liability"
            largeValue
            label="Pending liability (all time)"
            value={formatCurrency(cumulativePendingLiability)}
            sub="BORROW − REPAYMENT"
          />
          <Stat
            accent="receive"
            largeValue
            label="Pending receivable (all time)"
            value={formatCurrency(cumulativePendingReceivable)}
            sub="LEND − RECEIVE"
          />
        </div>
      </section>

      <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-x-hidden lg:grid-cols-2">
        <GlassCard
          variant="signature"
          hideAccent
          noLift
          className="flex min-h-0 flex-col"
          panelClassName="flex min-h-0 flex-1 flex-col !p-3"
        >
          <div className="mb-2 shrink-0">
            <div className="flex flex-col items-stretch gap-2 min-[400px]:flex-row min-[400px]:items-start min-[400px]:justify-between min-[400px]:gap-3">
              <div className="flex min-w-0 min-h-0 flex-1 items-start gap-2">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-linear-to-br from-blue-500/15 to-blue-600/5 text-blue-300"
                  aria-hidden
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-pretty text-sm font-semibold tracking-tight text-ink">
                    Monthly expense trend
                  </h2>
                  <p className="mt-0.5 text-pretty text-[11px] leading-snug text-ink-muted">
                    Last 10 months · expenses only
                  </p>
                </div>
              </div>
              {trendHasData ? (
                <div
                  className="grid w-full max-w-sm shrink-0 grid-rows-[auto_auto] gap-2 self-end rounded-lg border border-blue-500/25 bg-blue-500/8 px-3 py-2 min-[400px]:w-50 min-[400px]:max-w-[42%] min-[400px]:self-auto"
                  role="group"
                  aria-label="Peak expense month"
                >
                  <p className="border-b border-blue-500/20 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-blue-200/90">
                    Peak month
                  </p>
                  <div className="flex items-end justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold tabular-nums leading-none text-ink">
                      {formatCurrency(peakMonth.expense)}
                    </span>
                    <span className="shrink-0 text-right text-[10px] leading-snug text-ink-muted">
                      {formatYearMonthLabel(peakMonth.month)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="h-full min-h-[200px] w-full flex-1">
              <DashboardMonthlyExpenseChart data={monthlyExpenseTrend} />
            </div>
          </div>
        </GlassCard>

        <div className="flex min-h-0 flex-col gap-3">
          <GlassCard
            variant="signature"
            hideAccent
            noLift
            className="flex min-h-0 flex-1 flex-col"
            panelClassName="flex min-h-0 flex-1 flex-col !p-3"
          >
            <div className="mb-2 shrink-0">
              <div className="flex flex-col items-stretch gap-2 min-[400px]:flex-row min-[400px]:items-start min-[400px]:justify-between min-[400px]:gap-3">
                <div className="flex min-w-0 min-h-0 flex-1 items-start gap-2">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-linear-to-br from-blue-500/15 to-blue-600/5 text-blue-300"
                    aria-hidden
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-pretty text-sm font-semibold tracking-tight text-ink">
                      Recent activity
                    </h2>
                    <p className="mt-0.5 text-pretty text-[11px] leading-snug text-ink-muted">
                      This month · all types
                    </p>
                  </div>
                </div>
                {peakActivityRow ? (
                  <div
                    className="grid w-full max-w-sm shrink-0 grid-rows-[auto_auto] gap-2 self-end rounded-lg border border-blue-500/25 bg-blue-500/8 px-3 py-2 min-[400px]:w-50 min-[400px]:max-w-[42%] min-[400px]:self-auto"
                    role="group"
                    aria-label="Largest transaction this month"
                  >
                    <p className="border-b border-blue-500/20 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-blue-200/90">
                      Peak amount
                    </p>
                    <div className="flex items-end justify-between gap-2">
                      <ActivityAmount compact type={peakActivityRow.type} amount={peakActivityRow.amount} />
                      <span className="max-w-[55%] truncate text-right text-[10px] leading-snug text-ink-muted">
                        {peakActivityRow.title}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            {recentActivity.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-(--border) bg-(--glass-simple-bg)/50 py-8 text-center text-sm text-ink-muted">
                No transactions yet.
              </p>
            ) : (
              <ul className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain rounded-lg bg-(--glass-simple-bg) shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                {recentActivity.map((row) => {
                  const loc = row.locationName?.trim() || "—";
                  const when = formatActivityDateTime(row.transactionDate, row.transactionTime);
                  return (
                    <li key={row.id}>
                      <div className="group/row relative flex gap-2 overflow-hidden rounded-lg border border-white/8 bg-white/3 px-2.5 py-2 transition-all duration-200 hover:border-blue-500/25 hover:bg-white/5 hover:shadow-[0_0_0_1px_rgba(59,130,246,0.12)]">
                        <div
                          className={`w-1 shrink-0 self-stretch rounded-full bg-linear-to-b ${transactionRailClass(row.type)} opacity-90 group-hover/row:opacity-100`}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="min-w-0 truncate text-xs font-medium leading-snug tracking-tight text-ink">
                              {row.title}
                            </p>
                            <ActivityAmount compact type={row.type} amount={row.amount} />
                          </div>
                          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span className="text-[10px] tabular-nums text-ink-muted">{when}</span>
                            <TransactionTypeChip type={row.type} />
                            <span className="min-w-0 truncate text-[9px] font-medium uppercase tracking-wide text-(--ink-muted-2)">
                              {loc}
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassCard>
        </div>
      </section>
    </div>
  );
}

