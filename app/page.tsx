"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  ExternalLink,
  Globe,
  MapPin,
  Search,
  ShieldAlert,
  Truck,
  X,
  Activity,
  AlertTriangle,
  Radio,
  Clock,
} from "lucide-react";
import type { Article as MapArticle } from "../components/WorldMap";

const DEFAULT_COLOR = "#4b5563";

const WorldMap = dynamic(() => import("../components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        background: "var(--map-ocean)",
        height: "min(65vh, 520px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--text-muted)",
        letterSpacing: "0.12em",
      }}
    >
      INITIALISING MAP ENGINE...
    </div>
  ),
});

interface Article {
  title: string;
  link: string;
  date: string;
  source: string;
  summary: string;
  category: string;
  severity?: string;
  region: unknown;
  lat: number;
  lng: number;
}

interface Data {
  lastUpdated: string;
  articles: Article[];
}

type CategoryFilter = "all" | "Cyber Attack" | "Supply Chain" | "Geopolitics";
type SeverityFilter = "all" | "critical" | "high" | "medium";

function regionStr(r: unknown): string {
  if (typeof r === "string") return r;
  return "Global";
}

const CATEGORY_COLOR: Record<string, string> = {
  "Cyber Attack": "var(--cyber)",
  "Supply Chain": "var(--supply)",
  "Geopolitics":  "var(--geo)",
};
const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#eab308",
};

function CategoryIcon({ cat, size = 13 }: { cat: string; size?: number }) {
  const s = { width: size, height: size };
  if (cat === "Cyber Attack")  return <ShieldAlert style={s} />;
  if (cat === "Supply Chain")  return <Truck       style={s} />;
  if (cat === "Geopolitics")   return <Globe       style={s} />;
  return <AlertTriangle style={s} />;
}

function formatRelative(dateStr: string, now: number): string {
  const diff  = now - new Date(dateStr).getTime();
  const m     = Math.floor(diff / 60000);
  const h     = Math.floor(m / 60);
  const d     = Math.floor(h / 24);
  if (d > 0)  return `${d}d ago`;
  if (h > 0)  return `${h}h ago`;
  if (m > 0)  return `${m}m ago`;
  return "just now";
}

// ─── Ticker ─────────────────────────────────────────────────────────────────
function Ticker({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  const items = [...articles, ...articles]; // duplicate for seamless loop
  return (
    <div
      style={{
        height: 28,
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        position: "relative",
      }}
    >
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: 60, zIndex: 2,
        background: "linear-gradient(to right, var(--bg-surface), transparent)",
      }} />
      <div className="ticker-inner">
        {items.map((a, i) => {
          const col = CATEGORY_COLOR[a.category] ?? "var(--text-muted)";
          return (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 40, whiteSpace: "nowrap", fontSize: 10, color: "var(--text-secondary)" }}>
              <span style={{ color: col, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{a.category}</span>
              <span style={{ color: "var(--text-muted)" }}>›</span>
              <span style={{ color: "var(--text-primary)" }}>{a.title}</span>
              {regionStr(a.region) && (
                <>
                  <span style={{ color: "var(--text-muted)" }}>·</span>
                  <span>{regionStr(a.region)}</span>
                </>
              )}
            </span>
          );
        })}
      </div>
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: 40, zIndex: 2,
        background: "linear-gradient(to left, var(--bg-surface), transparent)",
      }} />
    </div>
  );
}

// ─── Stat Pill ───────────────────────────────────────────────────────────────
function StatPill({
  label, count, color, active, onClick,
}: {
  label: string; count: number; color: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "3px 10px",
        borderRadius: 2,
        border: `1px solid ${active ? color : "var(--border)"}`,
        background: active ? `${color}18` : "transparent",
        cursor: "pointer",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        transition: "all 0.15s",
      }}
    >
      <span style={{ color, fontWeight: 600 }} className="tabular">{count}</span>
      <span style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Home() {
  const [data,          setData]         = useState<Data | null>(null);
  const [loading,       setLoading]      = useState(true);
  const [categoryFilter,setCategoryFilter] = useState<CategoryFilter>("all");
  const [severityFilter,setSeverityFilter] = useState<SeverityFilter>("all");
  const [searchQuery,   setSearchQuery]  = useState("");
  const [now,           setNow]          = useState(() =>
    typeof window !== "undefined" ? Date.now() : 0,
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/data/latest_insights.json")
      .then((r) => r.json())
      .then((j: Data) => { setData(j); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const articles = useMemo(() => {
    if (!data?.articles) return [];
    return data.articles.map((a) => ({ ...a, region: regionStr(a.region) }));
  }, [data]);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (severityFilter !== "all" && (a.severity ?? "medium") !== severityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          regionStr(a.region).toLowerCase().includes(q) ||
          a.source.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [articles, categoryFilter, severityFilter, searchQuery]);

  const stats = useMemo(() => ({
    cyber:    articles.filter((a) => a.category === "Cyber Attack").length,
    supply:   articles.filter((a) => a.category === "Supply Chain").length,
    geo:      articles.filter((a) => a.category === "Geopolitics").length,
    critical: articles.filter((a) => a.severity  === "critical").length,
  }), [articles]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", gap: 16 }}>
        <Activity style={{ color: "var(--accent)", width: 22, height: 22 }} />
        <div style={{ color: "var(--text-primary)", letterSpacing: "0.12em", fontSize: 12 }}>LOADING INTELLIGENCE FEED</div>
        <div style={{ color: "var(--text-muted)", fontSize: 10 }}>Fetching threat data...</div>
      </div>
    );
  }

  const clearFilters = () => { setCategoryFilter("all"); setSeverityFilter("all"); setSearchQuery(""); };
  const hasFilters = categoryFilter !== "all" || severityFilter !== "all" || searchQuery !== "";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>

      {/* ── HEADER ─────────────────────────────────────── */}
      <header style={{
        height: 40, flexShrink: 0,
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        {/* Left: branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="live-dot" />
          <span style={{ fontWeight: 600, fontSize: 12, letterSpacing: "0.12em", color: "var(--text-primary)", textTransform: "uppercase" }}>
            OSINT Risk Monitor
          </span>
          <span style={{ color: "var(--border)", userSelect: "none" }}>|</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
            {data?.lastUpdated
              ? `UPDATED ${formatRelative(data.lastUpdated, now).toUpperCase()}`
              : "NO DATA"}
          </span>
        </div>

        {/* Right: stat pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StatPill label="Cyber"    count={stats.cyber}    color="var(--cyber)"   active={categoryFilter === "Cyber Attack"} onClick={() => setCategoryFilter(categoryFilter === "Cyber Attack" ? "all" : "Cyber Attack")} />
          <StatPill label="Geo"      count={stats.geo}      color="var(--geo)"     active={categoryFilter === "Geopolitics"}  onClick={() => setCategoryFilter(categoryFilter === "Geopolitics"  ? "all" : "Geopolitics")} />
          <StatPill label="Supply"   count={stats.supply}   color="var(--supply)"  active={categoryFilter === "Supply Chain"} onClick={() => setCategoryFilter(categoryFilter === "Supply Chain" ? "all" : "Supply Chain")} />
          <StatPill label="Critical" count={stats.critical} color="#ef4444"        active={severityFilter === "critical"}     onClick={() => setSeverityFilter(severityFilter === "critical"     ? "all" : "critical")} />
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 8, color: "var(--live)", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em" }}>
            <Radio size={11} />
            LIVE
          </div>
        </div>
      </header>

      {/* ── TICKER ─────────────────────────────────────── */}
      <Ticker articles={articles} />

      {/* ── MAP SECTION ────────────────────────────────── */}
      <div style={{ position: "relative", borderBottom: "1px solid var(--border)" }}>
        {/* Map toolbar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
          height: 34,
          background: "rgba(7,9,12,0.92)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center",
          padding: "0 12px", gap: 8,
          backdropFilter: "blur(8px)",
        }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 6 }}>Layer</span>
          {(["all", "Cyber Attack", "Supply Chain", "Geopolitics"] as const).map((cat) => {
            const label = cat === "all" ? "All" : cat.replace(" ", "\u00A0");
            const active = categoryFilter === cat;
            const col = cat === "all" ? "var(--text-secondary)" : CATEGORY_COLOR[cat];
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(active && cat !== "all" ? "all" : cat)}
                style={{
                  padding: "2px 9px", borderRadius: 2, fontSize: 10, fontWeight: 500,
                  fontFamily: "var(--font-mono)", cursor: "pointer",
                  background: active ? `${col}22` : "transparent",
                  border: `1px solid ${active ? col : "var(--border-subtle)"}`,
                  color: active ? "var(--text-primary)" : "var(--text-muted)",
                  letterSpacing: "0.05em", textTransform: "uppercase",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}

          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Severity</span>
            {(["all", "critical", "high", "medium"] as SeverityFilter[]).map((sev) => {
              const active = severityFilter === sev;
              const col = sev === "all" ? "var(--text-secondary)" : SEVERITY_COLOR[sev];
              return (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(active && sev !== "all" ? "all" : sev)}
                  style={{
                    padding: "2px 8px", borderRadius: 2, fontSize: 10, fontFamily: "var(--font-mono)", cursor: "pointer",
                    background: active ? `${col}22` : "transparent",
                    border: `1px solid ${active ? col : "var(--border-subtle)"}`,
                    color: active ? (sev === "all" ? "var(--text-primary)" : col) : "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    transition: "all 0.15s",
                  }}
                >
                  {sev === "all" ? "All" : sev}
                </button>
              );
            })}
          </div>
        </div>

        {/* The map itself (toolbar height offset) */}
        <div style={{ paddingTop: 34 }}>
          <WorldMap
            articles={filtered as MapArticle[]}
            activeCategory={categoryFilter}
          />
        </div>
      </div>

      {/* ── FEED TOOLBAR ───────────────────────────────── */}
      <div style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        padding: "8px 14px",
        display: "flex", alignItems: "center", gap: 10,
        flexWrap: "wrap",
        flexShrink: 0,
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 320 }}>
          <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search threats, regions..."
            style={{
              width: "100%", paddingLeft: 28, paddingRight: searchQuery ? 28 : 10,
              height: 28, background: "var(--bg)", border: "1px solid var(--border)",
              borderRadius: 2, fontFamily: "var(--font-mono)", fontSize: 11,
              color: "var(--text-primary)", outline: "none",
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Result count */}
        <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
          {filtered.length} <span style={{ textTransform: "uppercase" }}>REPORTS</span>
        </span>

        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", border: "1px solid var(--border)", borderRadius: 2, background: "transparent", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)" }}
          >
            <X size={10} /> Clear filters
          </button>
        )}
      </div>

      {/* ── INTELLIGENCE GRID ──────────────────────────── */}
      <main style={{
        flex: 1,
        padding: "12px 14px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 8,
        alignContent: "start",
      }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 20px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em" }}>
            <AlertTriangle style={{ width: 22, height: 22, margin: "0 auto 12px", display: "block" }} />
            NO REPORTS MATCH CURRENT FILTERS
          </div>
        ) : (
          filtered.map((article, idx) => {
            const catColor  = CATEGORY_COLOR[article.category] ?? DEFAULT_COLOR;
            const sevColor  = SEVERITY_COLOR[article.severity ?? "medium"] ?? "var(--text-muted)";
            const region    = regionStr(article.region);
            return (
              <div
                key={idx}
                className="fade-in"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderLeft: `3px solid ${catColor}`,
                  borderRadius: 3,
                  padding: "12px 14px",
                  animationDelay: `${idx * 30}ms`,
                  transition: "border-color 0.15s, background 0.15s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "var(--bg-elevated)";
                  (e.currentTarget as HTMLDivElement).style.borderColor = catColor;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "var(--bg-surface)";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLDivElement).style.borderLeftColor = catColor;
                }}
              >
                {/* Card header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: catColor, display: "flex" }}>
                      <CategoryIcon cat={article.category} size={12} />
                    </span>
                    <span style={{ color: catColor, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>{article.category}</span>
                    {article.severity && (
                      <span style={{ color: sevColor, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", borderLeft: "1px solid var(--border-subtle)", paddingLeft: 6, marginLeft: 2 }}>
                        {article.severity}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", fontSize: 10 }}>
                    <Clock size={10} />
                    {formatRelative(article.date, now)}
                  </div>
                </div>

                {/* Title */}
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 8, textDecoration: "none" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: 12, lineHeight: 1.45, flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {article.title}
                  </span>
                  <ExternalLink size={10} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
                </a>

                {/* Meta */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-muted)" }}>
                    <Globe size={10} />
                    {article.source}
                  </span>
                  {region && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-muted)" }}>
                      <MapPin size={10} />
                      {region}
                    </span>
                  )}
                </div>

                {/* AI Analysis */}
                <div style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 2,
                  padding: "9px 11px",
                }}>
                  <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 5 }}>
                    AI RISK ANALYSIS
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                    {article.summary}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* ── STATUS BAR ─────────────────────────────────── */}
      <footer style={{
        height: 24, flexShrink: 0,
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px",
        fontSize: 10, color: "var(--text-muted)",
        letterSpacing: "0.06em",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>OSINT MONITOR v2.0</span>
          <span style={{ color: "var(--border)" }}>|</span>
          <span>SRC: BBC · CNBC · THN · CISA · KREBS · NYT</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>AI: LLAMA 3.2 · HUGGINGFACE</span>
          <span style={{ color: "var(--border)" }}>|</span>
          <span style={{ color: "var(--live)", fontWeight: 600 }}>● AUTO-UPDATE 6H</span>
        </div>
      </footer>

    </div>
  );
}
