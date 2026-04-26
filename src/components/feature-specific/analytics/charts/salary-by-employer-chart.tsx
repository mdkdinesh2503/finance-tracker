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
import type { SalaryEmployerMonthlyCell } from "@/lib/types/income-analytics";
import {
  formatCurrency,
  formatYearMonthAxisShort,
  formatYearMonthLabel,
} from "@/lib/utilities/format";

const STROKES = ["#34d399", "#38bdf8", "#a78bfa", "#f472b6", "#fbbf24", "#2dd4bf", "#fb923c"];

function formatYAxisTick(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (v >= 1_000_000) return `₹${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}k`;
  return `₹${v}`;
}

export type EmployerSeriesKey = { dataKey: string; label: string };

export function buildEmployerChartSeries(cells: SalaryEmployerMonthlyCell[]): {
  data: Record<string, string | number>[];
  series: EmployerSeriesKey[];
} {
  const months = [...new Set(cells.map((c) => c.ym))].sort((a, b) => a.localeCompare(b));
  const companyNames = [...new Set(cells.map((c) => c.companyName))].sort((a, b) =>
    a.localeCompare(b),
  );
  const series: EmployerSeriesKey[] = companyNames.map((label, i) => ({
    dataKey: `e${i}`,
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
      row[`e${i}`] = m?.get(name) ?? 0;
    });
    return row;
  });

  return { data, series };
}

export function SalaryByEmployerChart({ cells }: { cells: SalaryEmployerMonthlyCell[] }) {
  const rawId = useId();
  const { data, series } = useMemo(() => buildEmployerChartSeries(cells), [cells]);

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
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-500/25 bg-(--glass-simple-bg) px-5 py-10 text-center">
        <p className="text-sm font-medium text-ink-muted">
          No salary rows with an employer set yet.
        </p>
        <p className="mt-1 max-w-xs text-xs text-(--ink-muted-2)">
          Add an employer on Salary &amp; Wages income entries to compare companies over time.
        </p>
      </div>
    );
  }

  return (
    <div
      className="box-border h-[360px] w-full rounded-2xl border border-(--border) bg-(--glass-simple-bg) p-2 pb-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:h-[400px]"
      id={`salary-emp-chart-${rawId.replace(/:/g, "")}`}
    >
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        <LineChart data={data} margin={{ top: 12, right: 8, left: 2, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="#ffffff0f" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="#71717a"
            tick={{ fill: "#c4c4cc", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            height={34}
            interval="preserveStartEnd"
            tickFormatter={(ym) => formatYearMonthAxisShort(String(ym))}
          />
          <YAxis
            domain={[0, maxY]}
            stroke="#71717a"
            tick={{ fill: "#c4c4cc", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            width={52}
            tickFormatter={(v) => formatYAxisTick(Number(v))}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const ym = String(label ?? "");
              return (
                <div className="max-w-[240px] rounded-xl border border-emerald-500/35 bg-[rgba(10,12,16,0.97)] px-3 py-2.5 shadow-xl shadow-black/50">
                  <p className="text-xs font-semibold text-white">{formatYearMonthLabel(ym)}</p>
                  <ul className="mt-2 space-y-1">
                    {payload
                      .filter((p) => Number(p.value) > 0)
                      .map((p) => (
                        <li
                          key={String(p.dataKey)}
                          className="flex justify-between gap-4 text-[11px] tabular-nums"
                        >
                          <span className="text-zinc-400">{p.name}</span>
                          <span className="font-medium text-zinc-100">
                            {formatCurrency(Number(p.value))}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => <span className="text-zinc-300">{value}</span>}
          />
          {series.map((s, i) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.label}
              stroke={STROKES[i % STROKES.length]}
              strokeWidth={2.2}
              dot={{ r: 3, strokeWidth: 1.5 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
