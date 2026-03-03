"use client";

import React, { useState, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

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

export default function WorldMap({ articles, onMarkerClick }: WorldMapProps) {
  const [tooltip, setTooltip] = useState<Article | null>(null);

  const mapMarkers = articles.filter((a) => a.lat !== 0 && a.lng !== 0);

  const getMarkerColor = useCallback((category: string) => {
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
  }, []);

  const getMarkerSize = useCallback((severity?: string) => {
    switch (severity) {
      case "critical":
        return 8;
      case "high":
        return 6;
      case "medium":
        return 5;
      default:
        return 4;
    }
  }, []);

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

      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 140, center: [10, 10] }}
        width={800}
        height={420}
        style={{ width: "100%", height: "auto" }}
      >
        <ZoomableGroup zoom={1} maxZoom={6} minZoom={1}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1e293b"
                  stroke="#0f172a"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#283548", outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {mapMarkers.map((marker, index) => {
            const color = getMarkerColor(marker.category);
            const size = getMarkerSize(marker.severity);
            return (
              <Marker
                key={index}
                coordinates={[marker.lng, marker.lat]}
                onMouseEnter={() => setTooltip(marker)}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => onMarkerClick?.(marker)}
              >
                {/* Outer pulse ring */}
                <circle
                  r={size + 4}
                  fill={color}
                  opacity={0.15}
                  className="animate-ping"
                  style={{ animationDuration: "3s" }}
                />
                {/* Main marker */}
                <circle
                  r={size}
                  fill={color}
                  opacity={0.8}
                  className="cursor-pointer"
                  stroke={color}
                  strokeWidth={1}
                  strokeOpacity={0.3}
                />
                {/* Center dot */}
                <circle r={size * 0.4} fill="#ffffff" opacity={0.9} />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

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

      {/* Zoom hint */}
      <div className="absolute bottom-3 right-3 text-[10px] text-slate-600">
        Scroll to zoom &middot; Drag to pan
      </div>
    </div>
  );
}
