"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { projectRepair } from "@/lib/domain/wheel";
import { fmtUsd } from "@/lib/domain/format";

// The shareable Repair chart: adjusted basis grinding down toward current price
// over 6 covered-call cycles (flat-price, repeatable-premium model).
export function RepairChart({
  adjustedBasis,
  currentPrice,
  premiumPerShare,
}: {
  adjustedBasis: number;
  currentPrice: number;
  premiumPerShare: number;
}) {
  const data = projectRepair(adjustedBasis, currentPrice, premiumPerShare, 6);
  const crossed = data.find((d) => d.adjustedBasis <= currentPrice);

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="#1f1f1f" vertical={false} />
          <XAxis
            dataKey="cycle"
            stroke="#5a5a5a"
            tick={{ fontSize: 11 }}
            tickFormatter={(c) => `C${c}`}
          />
          <YAxis
            stroke="#5a5a5a"
            tick={{ fontSize: 11 }}
            width={52}
            domain={["auto", "auto"]}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{ background: "#0a0a0a", border: "1px solid #2c2c2c" }}
            labelStyle={{ color: "#8a8a8a" }}
            labelFormatter={(c) => `Cycle ${c}`}
            formatter={((v: number, name: string) => [
              fmtUsd(v),
              name === "adjustedBasis" ? "Adjusted basis" : "Current price",
            ]) as never}
          />
          {crossed && (
            <ReferenceLine
              x={crossed.cycle}
              stroke="#00c9a7"
              strokeDasharray="3 3"
              label={{ value: "breakeven", fill: "#00c9a7", fontSize: 10, position: "top" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="adjustedBasis"
            stroke="#00e5ff"
            strokeWidth={2}
            dot={{ r: 2, fill: "#00e5ff" }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#ff6b57"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
