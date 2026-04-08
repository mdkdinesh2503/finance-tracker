"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  fetchCategoryVsLastMonthAction,
  fetchMonthlyTrendAction,
} from "@/app/actions/analytics";
import type { CategoryVsLastMonthPayload } from "@/features/transactions/services";
import { PageHeader } from "@/components/common/page-header";
import { CategoryVsLastMonth } from "@/components/analytics/category-vs-last-month";
import { MonthlyTrendChart } from "@/components/analytics/analytics-charts";
import {
  CategoryVsLastMonthSkeleton,
  MonthlyTrendChartSkeleton,
} from "@/components/analytics/analytics-skeleton";
import { GlassCard } from "@/components/ui/glass-card";

export function AnalyticsView() {
  const [vsPayload, setVsPayload] = useState<CategoryVsLastMonthPayload | null>(
    null
  );
  const [vsError, setVsError] = useState<string | null>(null);
  const [vsLoading, setVsLoading] = useState(true);

  const [trend, setTrend] = useState<
    {
      key: string;
      income: number;
      expense: number;
      investment: number;
    }[] | null
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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        subtitle="This month vs last by subcategory, then an all-time monthly trend."
      />

      {vsError || trendError ? (
        <div className="space-y-1" role="alert">
          {vsError ? (
            <p className="text-sm text-rose-400">{vsError}</p>
          ) : null}
          {trendError ? (
            <p className="text-sm text-rose-400">{trendError}</p>
          ) : null}
        </div>
      ) : null}

      {vsLoading ? (
        <CategoryVsLastMonthSkeleton />
      ) : vsPayload ? (
        <CategoryVsLastMonth payload={vsPayload} />
      ) : null}

      <div className="space-y-4 border-t border-white/10 pt-8">
        <h2 className="text-lg font-semibold text-white">Monthly trend</h2>
        <p className="text-sm text-zinc-500">
          All calendar months in your data, with income, expense, and
          investment per month.
        </p>
        <GlassCard className="space-y-2">
          {trend === null || trendPending ? (
            <MonthlyTrendChartSkeleton />
          ) : (
            <MonthlyTrendChart data={trend} />
          )}
        </GlassCard>
      </div>
    </div>
  );
}
