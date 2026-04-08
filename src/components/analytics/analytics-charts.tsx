"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

const COLORS = [
  "#2563eb",
  "#22c55e",
  "#f97316",
  "#38bdf8",
  "#f43f5e",
  "#eab308",
  "#3b82f6",
];

type TrendRow = {
  key: string;
  income: number;
  expense: number;
  investment: number;
};

type Named = { name: string; total: number };

export function MonthlyTrendChart({ data }: { data: TrendRow[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        No data for this range.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff18" />
        <XAxis dataKey="key" stroke="#a1a1aa" fontSize={12} />
        <YAxis stroke="#a1a1aa" fontSize={12} />
        <Tooltip
          contentStyle={{
            background: "rgba(10,12,16,0.96)",
            border: "1px solid rgba(37,99,235,0.25)",
            borderRadius: 12,
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="income"
          name="Income"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="expense"
          name="Expense"
          stroke="#f43f5e"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="investment"
          name="Investment"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({ data }: { data: Named[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        No expense data for parent categories in this range.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff18" />
        <XAxis type="number" stroke="#a1a1aa" fontSize={12} />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          stroke="#a1a1aa"
          fontSize={11}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(10,12,16,0.96)",
            border: "1px solid rgba(37,99,235,0.25)",
            borderRadius: 12,
          }}
        />
        <Bar dataKey="total" name="Expense" fill="#2563eb" radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LocationPieChart({ data }: { data: Named[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        No location-tagged expenses in this range.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={(entry) => {
            const pct =
              typeof entry.percent === "number" ? entry.percent : 0;
            return `${entry.name} ${(pct * 100).toFixed(0)}%`;
          }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "rgba(10,12,16,0.96)",
            border: "1px solid rgba(37,99,235,0.25)",
            borderRadius: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
