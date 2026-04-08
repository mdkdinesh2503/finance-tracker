"use client";

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
} from "@/lib/utils/format";

type Point = { month: string; expense: number };

function formatYAxisTick(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (v >= 1_000_000) return `₹${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}k`;
  return `₹${v}`;
}

export function DashboardMonthlyExpenseChart({ data }: { data: Point[] }) {
  const empty =
    data.length === 0 || data.every((d) => d.expense === 0);

  const maxExpense = Math.max(0, ...data.map((d) => d.expense));
  const yAxisMax = maxExpense <= 0 ? 1 : maxExpense * 1.1;

  if (empty) {
    return (
      <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-primary/25 bg-[var(--glass-simple-bg)] px-5 py-8 text-center">
        <p className="text-sm font-medium text-[var(--ink-muted)]">
          {data.length === 0
            ? "No expense history yet"
            : "No expenses in the last 10 months"}
        </p>
        <p className="mt-1 max-w-xs text-xs text-[var(--ink-muted-2)]">
          Add expenses to see the trend.
        </p>
      </div>
    );
  }

  return (
    <div className="box-border h-full min-h-[200px] w-full rounded-2xl border border-[var(--border)] bg-[var(--glass-simple-bg)] p-2 pb-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 8, left: 2, bottom: 28 }}
        >
          <defs>
            <linearGradient id="dashExpenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.38} />
              <stop offset="55%" stopColor="#1d4ed8" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#1e40af" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 6"
            stroke="#ffffff0f"
            vertical={false}
          />
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
            cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "4 4" }}
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
              return (
                <div
                  className="rounded-xl border border-blue-500/35 bg-[rgba(10,12,16,0.97)] px-3 py-2.5 shadow-xl shadow-black/50"
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
                    Expense
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fill="url(#dashExpenseFill)"
            fillOpacity={1}
            dot={{ r: 3.5, fill: "#60a5fa", stroke: "#0a0c10", strokeWidth: 1.5 }}
            activeDot={{
              r: 6,
              fill: "#93c5fd",
              stroke: "#2563eb",
              strokeWidth: 2,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
