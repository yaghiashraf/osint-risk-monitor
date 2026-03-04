"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";

const GEO_URL = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

export interface Article {
  title: string;
  link: string;
  date: string;
  source: string;
  summary: string;
  category: string;
  severity?: string;
  region: string;
  lat: number;
  lng: number;
}

interface WorldMapProps {
  articles: Article[];
  activeCategory: string;
  onMarkerClick?: (article: Article) => void;
}

interface GeoFeature {
  type: string;
  id?: string | number;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
}

const CATEGORY_COLOR: Record<string, string> = {
  "Cyber Attack": "#ef4444",
  "Supply Chain": "#f59e0b",
  "Geopolitics":  "#3b82f6",
};
const DEFAULT_COLOR = "#4b5563";

function markerColor(cat: string) {
  return CATEGORY_COLOR[cat] ?? DEFAULT_COLOR;
}
function markerR(sev?: string) {
  return sev === "critical" ? 7 : sev === "high" ? 5.5 : 4;
}

export default function WorldMap({ articles, activeCategory, onMarkerClick }: WorldMapProps) {
  const [tooltip, setTooltip]   = useState<Article | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [paths, setPaths]        = useState<{ id: string; d: string }[]>([]);
  const [graticule, setGraticule]= useState<string>("");
  const [sphere, setSphere]      = useState<string>("");
  const [projection, setProjection] = useState<((c: [number, number]) => [number, number] | null) | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const W = 900, H = 460;

  useEffect(() => {
    let mounted = true;
    Promise.all([import("d3-geo"), import("topojson-client")])
      .then(async ([d3, topo]) => {
        const proj = d3.geoNaturalEarth1().scale(155).translate([W / 2, H / 2 + 20]);
        const path = d3.geoPath().projection(proj);

        const res  = await fetch(GEO_URL);
        const data = await res.json();

        const countries = topo.feature(data, data.objects.countries);
        const grats     = d3.geoGraticule()();

        if (!mounted) return;

        const feats = "features" in countries ? (countries.features as GeoFeature[]) : [];
        setPaths(feats.map((f, i) => ({ id: String(f.id ?? i), d: path(f as Parameters<typeof path>[0]) ?? "" })));
        setGraticule(path(grats) ?? "");
        setSphere(path({ type: "Sphere" } as Parameters<typeof path>[0]) ?? "");
        setProjection(() => (c: [number, number]) => proj(c));
      })
      .catch(console.error);

    return () => { mounted = false; };
  }, []);

  const markers = useMemo(
    () => articles.filter((a) => a.lat !== 0 && a.lng !== 0),
    [articles],
  );

  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    const rect = e.currentTarget.closest("svg")?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden scanlines" style={{ background: "var(--map-ocean)" }}>
      {/* Ocean sphere + map */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        onMouseLeave={() => setTooltip(null)}
        onMouseMove={handleMouseMove}
        style={{ maxHeight: "65vh" }}
      >
        {/* Sphere (ocean background) */}
        {sphere && <path d={sphere} fill="var(--map-ocean)" />}

        {/* Graticule */}
        {graticule && (
          <path d={graticule} fill="none" stroke="var(--map-graticule)" strokeWidth={0.3} />
        )}

        {/* Countries */}
        {paths.map(({ id, d }) =>
          d ? (
            <path
              key={id}
              d={d}
              fill="var(--map-land)"
              stroke="var(--map-border)"
              strokeWidth={0.4}
            />
          ) : null,
        )}

        {/* Markers */}
        {projection &&
          markers.map((m, i) => {
            const pt = projection([m.lng, m.lat]);
            if (!pt) return null;
            const [x, y] = pt;
            const col = markerColor(m.category);
            const r   = markerR(m.severity);
            const isActive = !activeCategory || activeCategory === "all" || activeCategory === m.category;
            return (
              <g
                key={i}
                transform={`translate(${x},${y})`}
                opacity={isActive ? 1 : 0.15}
                onMouseEnter={() => setTooltip(m)}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => onMarkerClick?.(m)}
                style={{ cursor: "pointer", transition: "opacity 0.2s" }}
              >
                {/* Animated pulse ring */}
                <circle fill={col} opacity={0}>
                  <animate attributeName="r"      values={`${r};${r + 12}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.35;0"            dur="2s" repeatCount="indefinite" />
                </circle>
                {/* Secondary ring */}
                <circle fill={col} opacity={0}>
                  <animate attributeName="r"      values={`${r};${r + 7}`}  dur="2s" begin="0.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.25;0"            dur="2s" begin="0.5s" repeatCount="indefinite" />
                </circle>
                {/* Core dot */}
                <circle r={r} fill={col} opacity={0.9} />
                <circle r={r * 0.38} fill="#fff" opacity={0.95} />
              </g>
            );
          })}

        {/* Tooltip positioned inside SVG */}
        {tooltip && (
          <foreignObject
            x={Math.min(tooltipPos.x + 12, W - 260)}
            y={Math.max(tooltipPos.y - 90, 4)}
            width={250}
            height={120}
            style={{ pointerEvents: "none", overflow: "visible" }}
          >
            <div
              style={{
                background: "rgba(13,17,23,0.97)",
                border: "1px solid var(--border)",
                borderLeft: `3px solid ${markerColor(tooltip.category)}`,
                borderRadius: 4,
                padding: "10px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-primary)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
              }}
            >
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: markerColor(tooltip.category), display: "inline-block", flexShrink: 0 }} />
                <span style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10 }}>{tooltip.category}</span>
                {tooltip.severity && (
                  <span style={{ marginLeft: "auto", color: tooltip.severity === "critical" ? "#ef4444" : tooltip.severity === "high" ? "#f97316" : "#eab308", fontSize: 9, fontWeight: 600, textTransform: "uppercase" }}>{tooltip.severity}</span>
                )}
              </div>
              <div style={{ fontWeight: 500, lineHeight: 1.4, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{tooltip.title}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>{tooltip.region}</div>
            </div>
          </foreignObject>
        )}
      </svg>

      {/* Loading shimmer */}
      {paths.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "var(--map-ocean)" }}>
          <div style={{ color: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>LOADING MAP DATA...</div>
        </div>
      )}

      {/* Legend — bottom left */}
      <div className="absolute bottom-3 left-3 flex gap-4" style={{
        background: "rgba(7,9,12,0.85)",
        border: "1px solid var(--border)",
        borderRadius: 3,
        padding: "6px 10px",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        backdropFilter: "blur(8px)",
      }}>
        {[
          ["Cyber Attack", "#ef4444"],
          ["Supply Chain", "#f59e0b"],
          ["Geopolitics",  "#3b82f6"],
        ].map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
            <span style={{ color: "var(--text-secondary)" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Marker count — bottom right */}
      <div className="absolute bottom-3 right-3" style={{
        background: "rgba(7,9,12,0.85)",
        border: "1px solid var(--border)",
        borderRadius: 3,
        padding: "4px 8px",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--text-muted)",
        backdropFilter: "blur(8px)",
      }}>
        {markers.length} EVENTS PLOTTED
      </div>
    </div>
  );
}
