"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { MonthlySeriesPoint } from "@/lib/types";

export function BankTrendChart({
  credits,
  debits
}: {
  credits: MonthlySeriesPoint[];
  debits: MonthlySeriesPoint[];
}) {
  const merged = credits.map((point, index) => ({
    month: point.month,
    credits: point.amount,
    debits: debits[index]?.amount ?? 0
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={merged}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(12, 39, 56, 0.08)" />
          <XAxis dataKey="month" stroke="#52626d" />
          <YAxis stroke="#52626d" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="credits" stroke="#0f766e" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="debits" stroke="#ea580c" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
