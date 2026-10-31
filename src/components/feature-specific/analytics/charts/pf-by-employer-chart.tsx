"use client";

import { useId, useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PfCompanyMonthlyCell } from "@/lib/types/investment-analytics";
import {
  formatCurrency,
  formatYearMonthAxisShort,
  formatYearMonthLabel,
} from "@/lib/utilities/format";

const STROKES = ["#38bdf8", "#34d399", "#a78bfa", "#f472b6", "#fbbf24", "#2dd4bf", "#fb923c"];

function formatYAxisTick(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (v >= 1_000_000) return `₹${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}k`;
  return `₹${v}`;
}

export type PfEmployerSeriesKey = { dataKey: string; label: string };

export function buildPfEmployerChartSeries(cells: PfCompanyMonthlyCell[]): {
  data: Record<string, string | number>[];
  series: PfEmployerSeriesKey[];
} {
  const months = [...new Set(cells.map((c) => c.ym))].sort((a, b) => a.localeCompare(b));
  const companyNames = [...new Set(cells.map((c) => c.companyName))].sort((a, b) =>
    a.localeCompare(b),
  );
  const series: PfEmployerSeriesKey[] = companyNames.map((label, i) => ({
    dataKey: `p${i}`,
    label,
  }));
  const byMonthCompany = new Map<string, Map<string, number>>();
  for (const c of cells) {
    let m = byMonthCompany.get(c.ym);
    if (!m) {
      m = new Map();
      byMonthCompany.set(c.ym, m);
    }
    m.set(c.companyName, (m.get(c.companyName) ?? 0) + c.total);
  }

  const data = months.map((month) => {
    const row: Record<string, string | number> = { month };
    const m = byMonthCompany.get(month);
    companyNames.forEach((name, i) => {
      row[`p${i}`] = m?.get(name) ?? 0;
    });
    return row;
  });

  return { data, series };
}

export function PfByEmployerChart({ cells }: { cells: PfCompanyMonthlyCell[] }) {
  const rawId = useId();
  const { data, series } = useMemo(() => buildPfEmployerChartSeries(cells), [cells]);

  const empty =
    cells.length === 0 || data.every((d) => series.every((s) => Number(d[s.dataKey] ?? 0) === 0));

  const maxY = useMemo(() => {
    let m = 0;
    for (const row of data) {
      for (const s of series) {
        m = Math.max(m, Number(row[s.dataKey] ?? 0));
      }
    }
    return m <= 0 ? 1 : m * 1.12;
  }, [data, series]);

  if (empty) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-sky-500/25 bg-(--glass-simple-bg) px-5 py-10 text-center">
        <p className="text-sm font-medium text-ink-muted">
          No PF rows with a company set yet.
        </p>
        <p className="mt-1 max-w-xs text-xs text-(--ink-muted-2)">
          Choose a company when adding PF investment entries to compare PF balances across companies over time.
        </p>
      </div>
    );
  }

  return (
    <div
      className="box-border h-[320px] w-full rounded-2xl border border-(--border) bg-(--glass-simple-bg) p-2 pb-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:h-[360px]"
      id={`pf-emp-chart-${rawId.replace(/:/g, "")}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 14, left: 2, bottom: 6 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={(m) => formatYearMonthAxisShort(String(m))}
            stroke="rgba(255,255,255,0.35)"
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
          />
          <YAxis
            domain={[0, maxY]}
            tickFormatter={formatYAxisTick}
            stroke="rgba(255,255,255,0.35)"
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length || !label) return null;
              return (
                <div className="rounded-xl border border-white/15 bg-zinc-950/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
                  <p className="font-semibold text-ink">{formatYearMonthLabel(String(label))}</p>
                  <div className="mt-1.5 space-y-1">
                    {payload.map((item) => (
                      <div
                        key={String(item.dataKey)}
                        className="flex items-center justify-between gap-4 font-mono text-[11px]"
                      >
                        <span className="flex items-center gap-1.5 text-ink-muted">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.name}
                        </span>
                        <span className="font-semibold text-ink">
                          {formatCurrency(Number(item.value ?? 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 8, fontSize: "11px" }}
            formatter={(val) => <span className="text-ink-muted">{val}</span>}
          />
          {series.map((s, idx) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.label}
              stroke={STROKES[idx % STROKES.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: STROKES[idx % STROKES.length] }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

