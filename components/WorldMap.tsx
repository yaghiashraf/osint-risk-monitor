"use client";

import React, { useState, useEffect, useRef } from "react";
import { geoNaturalEarth1, geoPath, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";

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

export default function WorldMap({ articles, onMarkerClick }: WorldMapProps) {
  const [tooltip, setTooltip] = useState<Article | null>(null);
  const [geoData, setGeoData] = useState<FeatureCollection<Geometry> | null>(null);
  const [hoveredGeo, setHoveredGeo] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = 900;
  const height = 460;

  const projection: GeoProjection = geoNaturalEarth1()
    .scale(155)
    .translate([width / 2, height / 2 + 20]);

  const pathGenerator = geoPath().projection(projection);

  useEffect(() => {
    fetch(GEO_URL)
      .then((res) => res.json())
      .then((topo: Topology) => {
        const countries = feature(
          topo,
          topo.objects.countries
        ) as FeatureCollection<Geometry>;
        setGeoData(countries);
      })
      .catch(console.error);
  }, []);

  const mapMarkers = articles.filter((a) => a.lat !== 0 && a.lng !== 0);

  const projectPoint = (lng: number, lat: number) => projection([lng, lat]);

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
        {geoData?.features.map((geo, i) => {
          const d = pathGenerator(geo);
          if (!d) return null;
          const id = String(geo.id ?? i);
          return (
            <path
              key={id}
              d={d}
              fill={hoveredGeo === id ? "#283548" : "#1e293b"}
              stroke="#0f172a"
              strokeWidth={0.5}
              onMouseEnter={() => setHoveredGeo(id)}
              onMouseLeave={() => setHoveredGeo(null)}
            />
          );
        })}

        {/* Markers */}
        {mapMarkers.map((marker, index) => {
          const point = projectPoint(marker.lng, marker.lat);
          if (!point) return null;
          const [x, y] = point;
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

      {/* Loading state for map data */}
      {!geoData && (
        <div className="absolute inset-0 flex items-center justify-center">
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
