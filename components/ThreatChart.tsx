"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend,
} from "recharts";
import { Activity } from "lucide-react";

interface Article {
  category: string;
  severity?: string;
  date: string;
}

interface ThreatChartProps {
  articles: Article[];
}

// Build 24-hour timeline (past 24h in 4-hour buckets)
function buildTimeline(articles: Article[]) {
  const now  = Date.now();
  const buckets = 6; // 6 × 4h = 24h
  const bucketMs = 4 * 60 * 60 * 1000;

  return Array.from({ length: buckets }, (_, i) => {
    const bucketStart = now - (buckets - i) * bucketMs;
    const bucketEnd   = bucketStart + bucketMs;
    const hour = new Date(bucketStart).getHours();
    const label = `${hour.toString().padStart(2, "0")}:00`;
    const inBucket = articles.filter((a) => {
      const t = new Date(a.date).getTime();
      return t >= bucketStart && t < bucketEnd;
    });
    return {
      label,
      cyber:  inBucket.filter((a) => a.category === "Cyber Attack").length,
      geo:    inBucket.filter((a) => a.category === "Geopolitics").length,
      supply: inBucket.filter((a) => a.category === "Supply Chain").length,
    };
  });
}

function buildSeverityData(articles: Article[]) {
  return [
    { label: "Critical", count: articles.filter((a) => a.severity === "critical").length, color: "#ef4444" },
    { label: "High",     count: articles.filter((a) => a.severity === "high").length,     color: "#f97316" },
    { label: "Medium",   count: articles.filter((a) => a.severity === "medium" || !a.severity).length, color: "#eab308" },
  ];
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(13,17,23,0.97)",
      border: "1px solid var(--border)",
      borderRadius: 3,
      padding: "8px 12px",
      fontFamily: "var(--font-mono)",
      fontSize: 10,
    }}>
      <div style={{ color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, display: "inline-block" }} />
          <span style={{ color: "var(--text-secondary)", textTransform: "capitalize" }}>{p.name}</span>
          <span style={{ color: "var(--text-primary)", marginLeft: "auto", fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function ThreatChart({ articles }: ThreatChartProps) {
  const timeline     = buildTimeline(articles);
  const severityData = buildSeverityData(articles);
  const total        = articles.length;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: "var(--bg-surface)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        height: 36, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 12px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-elevated)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Activity size={12} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-primary)" }}>
            Threat Analytics
          </span>
        </div>
        <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
          {total} EVENTS TRACKED
        </span>
      </div>

      {/* Category breakdown (colored bars) */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
        <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Category Breakdown</div>
        {[
          { label: "Cyber Attack",  color: "#ef4444", count: articles.filter((a) => a.category === "Cyber Attack").length },
          { label: "Geopolitics",   color: "#3b82f6", count: articles.filter((a) => a.category === "Geopolitics").length },
          { label: "Supply Chain",  color: "#f59e0b", count: articles.filter((a) => a.category === "Supply Chain").length },
        ].map(({ label, color, count }) => (
          <div key={label} style={{ marginBottom: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, fontSize: 9 }}>
              <span style={{ color: "var(--text-secondary)" }}>{label}</span>
              <span style={{ color, fontWeight: 600 }}>{count}</span>
            </div>
            <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                width: `${total > 0 ? (count / total) * 100 : 0}%`,
                height: "100%", background: color, borderRadius: 2,
                transition: "width 0.6s ease",
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* 24h Timeline chart */}
      <div style={{ flex: 1, padding: "6px 4px 4px", minHeight: 0 }}>
        <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 8px", marginBottom: 4 }}>24h Event Timeline</div>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={timeline} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="gcyber"  x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ggeo"    x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gsupply" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 2" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 8, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 8, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="cyber"  stroke="#ef4444" strokeWidth={1.5} fill="url(#gcyber)"  name="Cyber" dot={false} />
            <Area type="monotone" dataKey="geo"    stroke="#3b82f6" strokeWidth={1.5} fill="url(#ggeo)"    name="Geo"   dot={false} />
            <Area type="monotone" dataKey="supply" stroke="#f59e0b" strokeWidth={1.5} fill="url(#gsupply)" name="Supply" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Severity badges */}
      <div style={{
        flexShrink: 0, display: "flex", gap: 6, padding: "6px 12px",
        borderTop: "1px solid var(--border)", background: "var(--bg)",
        justifyContent: "space-around",
      }}>
        {severityData.map(({ label, count, color }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{count}</div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
