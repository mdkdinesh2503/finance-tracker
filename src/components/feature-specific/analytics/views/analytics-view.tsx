"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  fetchCategoryVsLastMonthAction,
  fetchMonthlyTrendAction,
} from "@/app/actions/analytics";
import type { CategoryVsLastMonthPayload } from "@/lib/services/transactions";
import { formatCurrency, formatYearMonthLabel } from "@/lib/utilities/format";
import { PageHeader } from "@/components/common/page-header";
import { CategoryVsLastMonth } from "../components/category-vs-last-month";
import { MonthlyTrendChart } from "../charts/analytics-charts";
import { InvestMonthlyContributionChart } from "@/components/feature-specific/analytics/charts/invest-monthly-contribution-chart";
import {
  CategoryVsLastMonthSkeleton,
  MonthlyTrendChartSkeleton,
} from "@/components/common/skeleton/analytics-skeleton";
import { GlassCard } from "@/components/ui/glass-card";
import { HandCoins, LineChart, PiggyBank, TrendingUp } from "lucide-react";

function QuickKpi({
  label,
  value,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad" | "brand";
  icon?: ReactNode;
}) {
  const tones: Record<typeof tone, { shell: string; value: string }> = {
    neutral: {
      shell: "border-white/10 bg-white/4",
      value: "text-ink",
    },
    good: {
      shell: "border-emerald-500/22 bg-emerald-500/10",
      value: "text-emerald-200",
    },
    bad: {
      shell: "border-rose-500/22 bg-rose-500/10",
      value: "text-rose-200",
    },
    brand: {
      shell: "border-primary/22 bg-primary/10",
      value: "text-sky-200",
    },
  };
  const t = tones[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${t.shell}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted">
            {label}
          </p>
          <p className={`mt-1 text-sm font-semibold tabular-nums ${t.value}`}>
            {value}
          </p>
        </div>
        {icon ? (
          <span className="rounded-xl border border-white/10 bg-white/5 p-2 text-ink-muted">
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function NavTile({
  href,
  title,
  subtitle,
  icon,
  accent,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  accent: "sky" | "emerald" | "violet";
}) {
  const accents: Record<typeof accent, string> = {
    sky: "from-sky-400/18 via-cyan-300/6 to-[var(--surface)] border-sky-500/20",
    emerald:
      "from-emerald-400/16 via-emerald-300/6 to-[var(--surface)] border-emerald-500/18",
    violet:
      "from-violet-400/18 via-indigo-300/6 to-[var(--surface)] border-violet-500/18",
  };

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl border bg-linear-to-br p-5 shadow-(--shadow-card) transition-[transform,box-shadow,border-color] duration-200 hover:shadow-(--shadow-lift) motion-safe:hover:-translate-y-0.5 ${accents[accent]}`}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 opacity-25 blur-3xl transition-opacity duration-200 group-hover:opacity-40"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>
        </div>
        <span className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-ink transition-colors duration-200 group-hover:border-white/15 group-hover:bg-white/8">
          {icon}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-ink-muted">
        <span>Open dashboard</span>
        <span className="transition-transform duration-200 group-hover:translate-x-0.5">
          →
        </span>
      </div>
    </Link>
  );
}

export function AnalyticsView() {
  const [vsPayload, setVsPayload] = useState<CategoryVsLastMonthPayload | null>(
    null,
  );
  const [vsError, setVsError] = useState<string | null>(null);
  const [vsLoading, setVsLoading] = useState(true);

  const [trend, setTrend] = useState<
    | {
        key: string;
        income: number;
        expense: number;
        investment: number;
      }[]
    | null
  >(null);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [trendPending, startTrendTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setVsLoading(true);
    setVsError(null);
    fetchCategoryVsLastMonthAction().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setVsPayload(res.data);
      } else {
        setVsError(res.error);
      }
      setVsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadTrend = useCallback(() => {
    startTrendTransition(async () => {
      setTrendError(null);
      const res = await fetchMonthlyTrendAction();
      if (res.ok) {
        setTrend(res.trend);
      } else {
        setTrendError(res.error);
      }
    });
  }, []);

  useEffect(() => {
    loadTrend();
  }, [loadTrend]);

  const orderedTrend =
    trend == null
      ? null
      : [...trend].sort((a, b) => a.key.localeCompare(b.key));
  const latest =
    orderedTrend && orderedTrend.length > 0
      ? orderedTrend[orderedTrend.length - 1]
      : null;
  const latestMonthLabel = latest ? formatYearMonthLabel(latest.key) : null;
  const latestNet =
    latest != null ? latest.income - latest.expense - latest.investment : null;

  const latestSavingsRate =
    latest != null && latest.income > 0
      ? (latestNet ?? 0) / latest.income
      : null;

  const last3 =
    orderedTrend != null && orderedTrend.length > 0
      ? orderedTrend.slice(Math.max(0, orderedTrend.length - 3))
      : null;
  const last3AvgExpense =
    last3 && last3.length > 0
      ? last3.reduce((s, r) => s + r.expense, 0) / last3.length
      : null;
  const last3AvgInvestment =
    last3 && last3.length > 0
      ? last3.reduce((s, r) => s + r.investment, 0) / last3.length
      : null;

  const investContribSeries =
    orderedTrend == null
      ? []
      : orderedTrend.map((r) => ({ month: r.key, invested: r.investment }));

  return (
    <div className="space-y-10">
      <GlassCard
        variant="signature"
        hideAccent
        className="relative overflow-hidden rounded-3xl"
        panelClassName="p-6 sm:p-8"
      >
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-end">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                Insights
              </p>
              <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
                Your money, in{" "}
                <span className="text-gradient-brand">motion</span>.
              </h1>
              <p className="max-w-xl text-sm text-ink-muted">
                A dashboard that surfaces what changed, what’s trending, and
                where to look next.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/analytics/income/salary"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-white/8"
              >
                Income
              </Link>
              <Link
                href="/analytics/investments"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-white/8"
              >
                Investments
              </Link>
              <Link
                href="/analytics/lending"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-white/8"
              >
                Lending
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2"></div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <QuickKpi
              label="Latest net"
              value={
                latestNet == null ? "—" : formatCurrency(Math.round(latestNet))
              }
              tone={
                latestNet == null ? "neutral" : latestNet >= 0 ? "good" : "bad"
              }
            />
            <QuickKpi
              label="Savings rate"
              value={
                latestSavingsRate == null
                  ? "—"
                  : `${(latestSavingsRate * 100).toFixed(1)}%`
              }
              tone={
                latestSavingsRate == null
                  ? "neutral"
                  : latestSavingsRate >= 0.2
                    ? "good"
                    : latestSavingsRate >= 0
                      ? "brand"
                      : "bad"
              }
            />
            <QuickKpi
              label="This month expense"
              value={
                vsPayload
                  ? formatCurrency(vsPayload.thisMonthTotal)
                  : "Loading…"
              }
              tone="neutral"
            />
            <QuickKpi
              label="Avg investing (3 mo)"
              value={
                last3AvgInvestment == null
                  ? "—"
                  : formatCurrency(Math.round(last3AvgInvestment))
              }
              tone="brand"
              icon={<PiggyBank className="h-4 w-4" />}
            />
          </div>
        </div>
      </GlassCard>

      {vsError || trendError ? (
        <div className="space-y-1" role="alert">
          {vsError ? <p className="text-sm text-rose-400">{vsError}</p> : null}
          {trendError ? (
            <p className="text-sm text-rose-400">{trendError}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4 border-t border-white/10 pt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <LineChart className="h-5 w-5 text-primary" />
              Monthly trend
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              All calendar months in your data, with income, expense, and
              investment per month.
            </p>
          </div>
        </div>
        <GlassCard variant="signature" hideAccent noLift className="space-y-2">
          {trend === null || trendPending ? (
            <MonthlyTrendChartSkeleton />
          ) : (
            <MonthlyTrendChart data={orderedTrend ?? trend} />
          )}
        </GlassCard>
      </div>

      {vsLoading ? (
        <CategoryVsLastMonthSkeleton />
      ) : vsPayload ? (
        <CategoryVsLastMonth payload={vsPayload} />
      ) : null}
    </div>
  );
}
