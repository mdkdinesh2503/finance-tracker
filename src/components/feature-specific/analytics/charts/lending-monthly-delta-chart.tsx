"use client";

import { useId, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatYearMonthAxisShort, formatYearMonthLabel } from "@/lib/utilities/format";

export type LendingMonthlyDeltaPoint = {
  ym: string;
  deltaYouOwe: number;
  deltaTheyOweYou: number;
  netDelta: number;
};

function formatYAxisTick(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${v < 0 ? "−" : ""}₹${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${v < 0 ? "−" : ""}₹${(abs / 1_000).toFixed(0)}k`;
  return `${v < 0 ? "−" : ""}₹${abs}`;
}

export function LendingMonthlyDeltaChart({ data }: { data: LendingMonthlyDeltaPoint[] }) {
  const rawId = useId();
  const fillId = `lendDeltaFill-${rawId.replace(/:/g, "")}`;

  const ordered = useMemo(
    () => [...data].sort((a, b) => a.ym.localeCompare(b.ym)),
    [data],
  );

  const empty = ordered.length === 0 || ordered.every((d) => d.deltaYouOwe === 0 && d.deltaTheyOweYou === 0 && d.netDelta === 0);
  const maxAbs = Math.max(
    1,
    ...ordered.map((d) => Math.abs(d.deltaYouOwe)),
    ...ordered.map((d) => Math.abs(d.deltaTheyOweYou)),
    ...ordered.map((d) => Math.abs(d.netDelta)),
  );

  if (empty) {
    return (
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-primary/25 bg-(--glass-simple-bg) px-5 py-8 text-center">
        <p className="text-sm font-medium text-ink-muted">No lending activity in these months</p>
        <p className="mt-1 max-w-xs text-xs text-(--ink-muted-2)">
          Add BORROW / REPAYMENT / LEND / RECEIVE entries to see the trend.
        </p>
      </div>
    );
  }

  return (
    <div className="box-border h-full min-h-[220px] w-full rounded-2xl border border-(--border) bg-(--glass-simple-bg) p-2 pb-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        <ComposedChart data={ordered} margin={{ top: 12, right: 8, left: 2, bottom: 28 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.28} />
              <stop offset="60%" stopColor="#fbbf24" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#0b0f18" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="#ffffff0f" vertical={false} />
          <XAxis
            dataKey="ym"
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
            domain={[-maxAbs * 1.1, maxAbs * 1.1]}
            stroke="#71717a"
            tick={{ fill: "#c4c4cc", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            width={58}
            tickFormatter={(v) => formatYAxisTick(Number(v))}
          />
          <Tooltip
            cursor={{ stroke: "#a78bfa", strokeWidth: 1, strokeDasharray: "4 4" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as LendingMonthlyDeltaPoint;
              return (
                <div
                  className="max-w-[240px] rounded-xl border border-violet-500/35 bg-[rgba(10,12,16,0.97)] px-3 py-2.5 shadow-xl shadow-black/50"
                  style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)" }}
                >
                  <p className="text-xs font-semibold tracking-tight text-white">{formatYearMonthLabel(row.ym)}</p>
                  <div className="mt-2 grid gap-1 text-[11px] text-zinc-300">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-amber-200/90">You owe Δ</span>
                      <span className="font-semibold tabular-nums">{formatCurrency(row.deltaYouOwe)}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-violet-200/90">They owe you Δ</span>
                      <span className="font-semibold tabular-nums">{formatCurrency(row.deltaTheyOweYou)}</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-white/10 pt-1.5">
                      <span className="text-zinc-400">Net Δ</span>
                      <span className="font-semibold tabular-nums">{formatCurrency(row.netDelta)}</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />

          <Area
            type="monotone"
            dataKey="netDelta"
            stroke="#a78bfa"
            strokeWidth={2.25}
            fill={`url(#${fillId})`}
            fillOpacity={1}
            dot={false}
            activeDot={{ r: 5, fill: "#c4b5fd", stroke: "#7c3aed", strokeWidth: 2 }}
          />
          <Line type="monotone" dataKey="deltaYouOwe" stroke="#fbbf24" strokeWidth={1.8} dot={false} />
          <Line type="monotone" dataKey="deltaTheyOweYou" stroke="#a78bfa" strokeWidth={1.8} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

