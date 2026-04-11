"use client";

import { useId, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatCurrency,
  formatYearMonthAxisShort,
  formatYearMonthLabel,
} from "@/lib/utilities/format";

type Point = { month: string; salary: number };

function formatYAxisTick(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (v >= 1_000_000) return `₹${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}k`;
  return `₹${v}`;
}

export function IncomeSalaryWagesChart({ data }: { data: Point[] }) {
  const rawId = useId();
  const fillId = `incomeSalaryFill-${rawId.replace(/:/g, "")}`;

  const empty = data.length === 0 || data.every((d) => d.salary === 0);
  const maxSal = Math.max(0, ...data.map((d) => d.salary));
  const yAxisMax = maxSal <= 0 ? 1 : maxSal * 1.1;

  const ordered = useMemo(() => [...data].sort((a, b) => a.month.localeCompare(b.month)), [data]);

  if (empty) {
    return (
      <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-500/25 bg-(--glass-simple-bg) px-5 py-8 text-center">
        <p className="text-sm font-medium text-ink-muted">
          {data.length === 0
            ? "No Salary & Wages history in range"
            : "No salary amounts in these months"}
        </p>
        <p className="mt-1 max-w-xs text-xs text-(--ink-muted-2)">
          Record income under Salary &amp; Wages to see the trend.
        </p>
      </div>
    );
  }

  return (
    <div className="box-border h-[340px] w-full rounded-2xl border border-(--border) bg-(--glass-simple-bg) p-2 pb-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:h-[380px]">
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        <ComposedChart data={ordered} margin={{ top: 12, right: 8, left: 2, bottom: 28 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity={0.42} />
              <stop offset="55%" stopColor="#047857" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#064e3b" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            domain={[0, yAxisMax]}
            stroke="#71717a"
            tick={{ fill: "#c4c4cc", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            width={52}
            tickFormatter={(v) => formatYAxisTick(Number(v))}
          />
          <Tooltip
            cursor={{ stroke: "#34d399", strokeWidth: 1, strokeDasharray: "4 4" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as Point;
              const ym = row?.month ?? "";
              const raw = payload[0].value;
              const amount =
                typeof raw === "number"
                  ? raw
                  : typeof raw === "string"
                    ? Number(raw)
                    : NaN;
              const idx = ordered.findIndex((d) => d.month === ym);
              const prior = idx > 0 ? ordered[idx - 1] : null;
              const pctPrior =
                prior != null && prior.salary > 0 && Number.isFinite(amount)
                  ? ((amount - prior.salary) / prior.salary) * 100
                  : null;
              const pctPeak = maxSal > 0 && Number.isFinite(amount) ? (amount / maxSal) * 100 : null;

              return (
                <div
                  className="max-w-[220px] rounded-xl border border-emerald-500/35 bg-[rgba(10,12,16,0.97)] px-3 py-2.5 shadow-xl shadow-black/50"
                  style={{
                    boxShadow:
                      "0 12px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
                  }}
                >
                  <p className="text-xs font-semibold tracking-tight text-white">
                    {formatYearMonthLabel(ym)}
                  </p>
                  <p className="mt-1 text-sm font-medium tabular-nums text-zinc-200">
                    {Number.isFinite(amount) ? formatCurrency(amount) : "—"}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                    Salary &amp; Wages
                  </p>
                  {pctPrior != null ? (
                    <p className="mt-1.5 text-[10px] leading-snug text-zinc-400">
                      {pctPrior >= 0 ? "+" : ""}
                      {pctPrior.toFixed(1)}% vs prior month
                    </p>
                  ) : null}
                  {pctPeak != null ? (
                    <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
                      {pctPeak.toFixed(0)}% of peak in window
                    </p>
                  ) : null}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="salary"
            stroke="#34d399"
            strokeWidth={2.5}
            fill={`url(#${fillId})`}
            fillOpacity={1}
            dot={{ r: 3.5, fill: "#6ee7b7", stroke: "#0a0c10", strokeWidth: 1.5 }}
            activeDot={{
              r: 6,
              fill: "#a7f3d0",
              stroke: "#059669",
              strokeWidth: 2,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
