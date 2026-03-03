"use client";

import React, { useState } from "react";
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
  region: string;
  lat: number;
  lng: number;
}

interface WorldMapProps {
  articles: Article[];
}

export default function WorldMap({ articles }: WorldMapProps) {
  const [tooltipContent, setTooltipContent] = useState("");

  // Filter out events with no valid coordinates (e.g., 0,0)
  const mapMarkers = articles.filter(a => a.lat !== 0 && a.lng !== 0);

  const getMarkerColor = (category: string) => {
    switch (category) {
      case 'Cyber Attack': return '#ef4444'; // Red
      case 'Supply Chain': return '#eab308'; // Yellow
      case 'Geopolitics': return '#3b82f6'; // Blue
      default: return '#a8a29e'; // Gray
    }
  };

  return (
    <div className="w-full h-[500px] bg-slate-900 rounded-xl overflow-hidden relative ring-1 ring-slate-800">
      {tooltipContent && (
        <div className="absolute top-4 right-4 bg-slate-800/90 text-slate-200 p-3 rounded-lg shadow-lg border border-slate-700 z-10 max-w-xs pointer-events-none">
          <p className="text-sm font-medium">{tooltipContent}</p>
        </div>
      )}
      
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 120 }}
        width={800}
        height={500}
      >
        <ZoomableGroup zoom={1} maxZoom={5} translateExtent={[[0, 0], [800, 500]]}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1e293b" // slate-800
                  stroke="#334155" // slate-700
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#334155", outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
          
          {mapMarkers.map((marker, index) => (
            <Marker 
              key={index} 
              coordinates={[marker.lng, marker.lat]}
              onMouseEnter={() => {
                setTooltipContent(`${marker.category}: ${marker.title}`);
              }}
              onMouseLeave={() => {
                setTooltipContent("");
              }}
            >
              <circle 
                r={6} 
                fill={getMarkerColor(marker.category)} 
                className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer animate-pulse" 
              />
              <circle 
                r={3} 
                fill="#ffffff" 
              />
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-800/80 p-2 rounded-lg border border-slate-700 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-xs text-slate-300">Geopolitics</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-xs text-slate-300">Supply Chain</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs text-slate-300">Cyber Attack</span>
        </div>
      </div>
    </div>
  );
}
