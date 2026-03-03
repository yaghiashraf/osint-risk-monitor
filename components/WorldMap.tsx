"use no memo";
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";

const GEO_URL = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

interface Article {
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
  onMarkerClick?: (article: Article) => void;
}

interface GeoFeature {
  type: string;
  id?: string | number;
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][] | number[][][][];
  };
}

function getMarkerColor(category: string) {
  switch (category) {
    case "Cyber Attack":
      return "#ef4444";
    case "Supply Chain":
      return "#f59e0b";
    case "Geopolitics":
      return "#3b82f6";
    default:
      return "#6b7280";
  }
}

function getMarkerSize(severity?: string) {
  switch (severity) {
    case "critical":
      return 7;
    case "high":
      return 5.5;
    case "medium":
      return 4.5;
    default:
      return 3.5;
  }
}

// Simple Mercator-like projection (no external dependency)
function projectMercator(
  lng: number,
  lat: number,
  width: number,
  height: number,
): [number, number] {
  const x = ((lng + 180) / 360) * width;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = height / 2 - (mercN / Math.PI) * (height / 2);
  return [x, Math.max(0, Math.min(height, y))];
}

export default function WorldMap({ articles, onMarkerClick }: WorldMapProps) {
  const [tooltip, setTooltip] = useState<Article | null>(null);
  const [geoData, setGeoData] = useState<GeoFeature[] | null>(null);
  const [hoveredGeo, setHoveredGeo] = useState<string | null>(null);
  const [d3Modules, setD3Modules] = useState<{
    geoNaturalEarth1: typeof import("d3-geo").geoNaturalEarth1;
    geoPath: typeof import("d3-geo").geoPath;
    feature: typeof import("topojson-client").feature;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = 900;
  const height = 460;

  // Dynamically import d3-geo and topojson-client on client side only
  useEffect(() => {
    Promise.all([import("d3-geo"), import("topojson-client")])
      .then(([d3Geo, topoClient]) => {
        setD3Modules({
          geoNaturalEarth1: d3Geo.geoNaturalEarth1,
          geoPath: d3Geo.geoPath,
          feature: topoClient.feature,
        });
      })
      .catch(console.error);
  }, []);

  // Load geo data after d3 modules are ready
  useEffect(() => {
    if (!d3Modules) return;
    fetch(GEO_URL)
      .then((res) => res.json())
      .then((topo) => {
        const countries = d3Modules.feature(topo, topo.objects.countries);
        if ("features" in countries) {
          setGeoData(countries.features as GeoFeature[]);
        }
      })
      .catch(console.error);
  }, [d3Modules]);

  const mapMarkers = articles.filter((a) => a.lat !== 0 && a.lng !== 0);

  // Build paths and projected points only when we have data + modules
  const paths = useMemo(() => {
    if (!d3Modules || !geoData) return [];
    const projection = d3Modules
      .geoNaturalEarth1()
      .scale(155)
      .translate([width / 2, height / 2 + 20]);
    const pathGen = d3Modules.geoPath().projection(projection);
    return geoData.map((geo, i) => ({
      id: String(geo.id ?? i),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      d: pathGen(geo as any) || "",
    }));
  }, [d3Modules, geoData, width, height]);

  const projectedMarkers = useMemo(() => {
    if (!d3Modules) {
      // Fallback: simple mercator
      return mapMarkers.map((m) => ({
        ...m,
        point: projectMercator(m.lng, m.lat, width, height),
      }));
    }
    const projection = d3Modules
      .geoNaturalEarth1()
      .scale(155)
      .translate([width / 2, height / 2 + 20]);
    return mapMarkers.map((m) => ({
      ...m,
      point: projection([m.lng, m.lat]) as [number, number] | null,
    }));
  }, [d3Modules, mapMarkers, width, height]);

  return (
    <div className="w-full bg-slate-900/50 rounded-2xl overflow-hidden relative ring-1 ring-slate-800/50 backdrop-blur-sm">
      {/* Tooltip */}
      {tooltip && (
        <div className="absolute top-4 right-4 bg-slate-800/95 text-slate-200 p-4 rounded-xl shadow-2xl border border-slate-700/50 z-10 max-w-sm pointer-events-none backdrop-blur-sm animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getMarkerColor(tooltip.category) }}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {tooltip.category}
            </span>
            {tooltip.severity && (
              <span
                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  tooltip.severity === "critical"
                    ? "bg-red-500/20 text-red-400"
                    : tooltip.severity === "high"
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {tooltip.severity}
              </span>
            )}
          </div>
          <p className="text-sm font-medium leading-snug">{tooltip.title}</p>
          <p className="text-xs text-slate-400 mt-1">{tooltip.region}</p>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        style={{ background: "transparent" }}
      >
        {/* Country geometries */}
        {paths.map(({ id, d }) => (
          <path
            key={id}
            d={d}
            fill={hoveredGeo === id ? "#283548" : "#1e293b"}
            stroke="#0f172a"
            strokeWidth={0.5}
            onMouseEnter={() => setHoveredGeo(id)}
            onMouseLeave={() => setHoveredGeo(null)}
          />
        ))}

        {/* Markers */}
        {projectedMarkers.map((marker, index) => {
          if (!marker.point) return null;
          const [x, y] = marker.point;
          const color = getMarkerColor(marker.category);
          const size = getMarkerSize(marker.severity);

          return (
            <g
              key={index}
              transform={`translate(${x},${y})`}
              onMouseEnter={() => setTooltip(marker)}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => onMarkerClick?.(marker)}
              className="cursor-pointer"
            >
              {/* Pulse ring */}
              <circle r={size + 4} fill={color} opacity={0.12}>
                <animate
                  attributeName="r"
                  from={String(size + 2)}
                  to={String(size + 10)}
                  dur="2.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.2"
                  to="0"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* Main dot */}
              <circle
                r={size}
                fill={color}
                opacity={0.85}
                stroke={color}
                strokeWidth={1}
                strokeOpacity={0.3}
              />
              {/* Center highlight */}
              <circle r={size * 0.35} fill="#ffffff" opacity={0.9} />
            </g>
          );
        })}
      </svg>

      {/* Loading state */}
      {!geoData && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30">
          <div className="w-6 h-6 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-sm px-3 py-2.5 rounded-xl border border-slate-800/50 flex gap-4">
        {[
          { label: "Cyber Attack", color: "bg-red-500" },
          { label: "Supply Chain", color: "bg-amber-500" },
          { label: "Geopolitics", color: "bg-blue-500" },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[11px] text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
