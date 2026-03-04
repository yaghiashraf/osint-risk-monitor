"use client";

import { useState } from "react";
import { Tv, Volume2, VolumeX, Radio, ExternalLink, LayoutGrid, Maximize2 } from "lucide-react";

// ── Channel definitions matching worldmonitor.app's 9 defaults ─────────────
// type "youtube"    → embed by video ID  (persistent live stream IDs)
// type "yt-channel" → embed by YouTube channel ID live_stream URL
// type "iframe"     → embed a 3rd-party page directly (e.g. CNBC)

type EmbedType = "youtube" | "yt-channel" | "iframe";

interface Channel {
  name:     string;
  flag:     string;
  region:   string;
  type:     EmbedType;
  src:      string;   // video ID | YT channel ID | full URL
  extUrl:   string;   // opens when clicking ↗
}

const CHANNELS: Channel[] = [
  {
    name: "Bloomberg",  flag: "🇺🇸", region: "US",
    type: "youtube",    src:  "dp8PhLsUcFE",
    extUrl: "https://www.youtube.com/watch?v=dp8PhLsUcFE",
  },
  {
    name: "Sky News",   flag: "🇬🇧", region: "UK",
    type: "youtube",    src:  "9Auq9mYxFEE",
    extUrl: "https://www.youtube.com/watch?v=9Auq9mYxFEE",
  },
  {
    name: "Al Jazeera", flag: "🇶🇦", region: "MENA",
    type: "youtube",    src:  "XWq0JtqgWUg",
    extUrl: "https://www.youtube.com/watch?v=XWq0JtqgWUg",
  },
  {
    name: "Euronews",   flag: "🇪🇺", region: "EU",
    type: "youtube",    src:  "znS3HkAkKB8",
    extUrl: "https://www.youtube.com/watch?v=znS3HkAkKB8",
  },
  {
    name: "DW News",    flag: "🇩🇪", region: "EU",
    type: "youtube",    src:  "mGHBY_crFIE",
    extUrl: "https://www.youtube.com/watch?v=mGHBY_crFIE",
  },
  {
    name: "France 24",  flag: "🇫🇷", region: "EU",
    type: "youtube",    src:  "l8PMl7tUDIE",
    extUrl: "https://www.youtube.com/watch?v=l8PMl7tUDIE",
  },
  {
    // CNBC blocks YouTube embeds — use livenewschat.eu per user instruction
    name: "CNBC",       flag: "🇺🇸", region: "US",
    type: "iframe",     src:  "https://livenewschat.eu/cnbc-live-stream/",
    extUrl: "https://livenewschat.eu/cnbc-live-stream/",
  },
  {
    name: "CNN",        flag: "🇺🇸", region: "US",
    type: "yt-channel", src:  "UCupvZG-5ko_eiXAupbDfxWw",
    extUrl: "https://www.youtube.com/@CNN/live",
  },
  {
    name: "Al Arabiya", flag: "🇦🇪", region: "MENA",
    type: "yt-channel", src:  "UCS5GtCr5i3OzOaP_7FoYVA",
    extUrl: "https://www.youtube.com/@AlArabiyaChannel/live",
  },
];

function embedUrl(ch: Channel, muted: boolean): string {
  const muteParam = muted ? 1 : 0;
  const base = `autoplay=1&mute=${muteParam}&rel=0&modestbranding=1&playsinline=1&controls=1`;
  if (ch.type === "youtube")    return `https://www.youtube.com/embed/${ch.src}?${base}`;
  if (ch.type === "yt-channel") return `https://www.youtube.com/embed/live_stream?channel=${ch.src}&${base}`;
  return ch.src; // iframe — full URL as-is
}

// ── Single stream view ──────────────────────────────────────────────────────
function SingleStream({ ch, muted }: { ch: Channel; muted: boolean }) {
  const src = embedUrl(ch, muted);
  return (
    <div style={{ position: "relative", flex: 1, minHeight: 180, background: "#000" }}>
      <iframe
        key={src}
        src={src}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{ width: "100%", height: "100%", border: "none", display: "block", minHeight: 180 }}
        title={`${ch.name} Live`}
      />
      <div style={{
        position: "absolute", top: 8, left: 8, pointerEvents: "none",
        background: "rgba(0,0,0,0.78)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 2, padding: "2px 7px",
        fontSize: 10, color: "#fff",
        fontFamily: "var(--font-mono)", letterSpacing: "0.08em",
      }}>
        {ch.flag} {ch.name.toUpperCase()}
      </div>
    </div>
  );
}

// ── Multi stream grid (2×2) ─────────────────────────────────────────────────
function MultiGrid({ channels, muted }: { channels: Channel[]; muted: boolean }) {
  const shown = channels.slice(0, 4);
  return (
    <div style={{
      flex: 1, display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: 1, background: "var(--border)", minHeight: 200,
    }}>
      {shown.map((ch) => (
        <div key={ch.src} style={{ position: "relative", background: "#000", minHeight: 0 }}>
          <iframe
            key={embedUrl(ch, muted)}
            src={embedUrl(ch, muted)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            title={`${ch.name} Live`}
          />
          <div style={{
            position: "absolute", top: 4, left: 4, pointerEvents: "none",
            background: "rgba(0,0,0,0.7)", borderRadius: 2,
            padding: "1px 5px", fontSize: 9, color: "#fff",
            fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
          }}>
            {ch.flag} {ch.name}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function LiveTVPanel() {
  const [active,  setActive]  = useState(0);
  const [muted,   setMuted]   = useState(true);
  const [multi,   setMulti]   = useState(false);

  const ch = CHANNELS[active];

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: "var(--bg-surface)",
      borderRight: "1px solid var(--border)",
      overflow: "hidden",
      height: "100%",
    }}>
      {/* ── Header ─────────────────────────────────────── */}
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
          {!multi && (
            <span style={{ fontSize: 9, color: "var(--text-muted)", background: "var(--bg)", border: "1px solid var(--border-subtle)", borderRadius: 2, padding: "1px 5px" }}>
              {ch.flag} {ch.name} · {ch.region}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Multi-stream toggle */}
          <button
            onClick={() => setMulti((v) => !v)}
            title={multi ? "Single stream" : "Multi-stream (2×2)"}
            style={{
              background: multi ? "rgba(47,129,247,0.15)" : "none",
              border: `1px solid ${multi ? "var(--accent)" : "var(--border-subtle)"}`,
              borderRadius: 2, cursor: "pointer",
              color: multi ? "var(--accent)" : "var(--text-muted)",
              display: "flex", alignItems: "center", padding: "2px 5px", gap: 4,
              fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
            }}
          >
            <LayoutGrid size={10} />
            {multi ? "MULTI" : "GRID"}
          </button>

          <button
            onClick={() => setMuted((m) => !m)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>

          {!multi && (
            <a
              href={ch.extUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--text-muted)", display: "flex" }}
              title="Open in new tab"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* ── Video area ─────────────────────────────────── */}
      {multi
        ? <MultiGrid channels={CHANNELS} muted={muted} />
        : <SingleStream ch={ch} muted={muted} />
      }

      {/* ── Channel selector (hidden in multi mode) ────── */}
      {!multi && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 3, padding: "7px",
          borderTop: "1px solid var(--border)", flexShrink: 0,
          background: "var(--bg)",
        }}>
          {CHANNELS.map((c, i) => (
            <button
              key={c.src}
              onClick={() => setActive(i)}
              style={{
                padding: "4px 5px",
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
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <span>{c.flag}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
              {i === active && (
                <span style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: "var(--live)", flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
