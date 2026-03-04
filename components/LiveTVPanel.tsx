"use client";

import { useState } from "react";
import { Tv, Volume2, VolumeX, Radio, ExternalLink } from "lucide-react";

const CHANNELS = [
  { name: "Al Jazeera",  id: "XWq0JtqgWUg", flag: "🇶🇦", region: "MENA" },
  { name: "Sky News",    id: "9Auq9mYxFEE", flag: "🇬🇧", region: "UK" },
  { name: "DW News",     id: "mGHBY_crFIE", flag: "🇩🇪", region: "EU" },
  { name: "France 24",   id: "l8PMl7tUDIE", flag: "🇫🇷", region: "EU" },
  { name: "Bloomberg",   id: "dp8PhLsUcFE", flag: "🇺🇸", region: "US" },
  { name: "WION",        id: "KNsJdMakHhA", flag: "🇮🇳", region: "ASIA" },
];

export function LiveTVPanel() {
  const [active, setActive] = useState(0);
  const [muted, setMuted]   = useState(true);

  const ch  = CHANNELS[active];
  const src = `https://www.youtube.com/embed/${ch.id}?autoplay=1&mute=${muted ? 1 : 0}&rel=0&modestbranding=1&playsinline=1&controls=1`;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: "var(--bg-surface)",
      borderRight: "1px solid var(--border)",
      overflow: "hidden",
    }}>
      {/* Panel header */}
      <div style={{
        height: 36, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 12px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-elevated)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Tv size={12} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-primary)" }}>
            Live News TV
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--live)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>
            <Radio size={9} /> LIVE
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setMuted((m) => !m)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          <a
            href={`https://www.youtube.com/watch?v=${ch.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-muted)", display: "flex" }}
          >
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Video embed */}
      <div style={{ position: "relative", flex: 1, minHeight: 180, background: "#000" }}>
        <iframe
          key={`${ch.id}-${muted}`}
          src={src}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: "none", display: "block", minHeight: 180 }}
          title={`${ch.name} Live`}
        />
        {/* Channel label overlay */}
        <div style={{
          position: "absolute", top: 8, left: 8,
          background: "rgba(0,0,0,0.75)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 2, padding: "2px 6px",
          fontSize: 10, color: "#fff",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.08em",
          pointerEvents: "none",
        }}>
          {ch.flag} {ch.name.toUpperCase()}
        </div>
      </div>

      {/* Channel selector */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 4, padding: "8px",
        borderTop: "1px solid var(--border)", flexShrink: 0,
        background: "var(--bg)",
      }}>
        {CHANNELS.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setActive(i)}
            style={{
              flex: "1 1 calc(33% - 4px)",
              padding: "4px 6px",
              borderRadius: 2,
              border: `1px solid ${i === active ? "var(--accent)" : "var(--border)"}`,
              background: i === active ? "rgba(47,129,247,0.12)" : "transparent",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: i === active ? "var(--text-primary)" : "var(--text-muted)",
              letterSpacing: "0.04em",
              textAlign: "left",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              transition: "all 0.12s",
            }}
          >
            {c.flag} {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
