"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, BarChart2, RefreshCw } from "lucide-react";

const COINS = [
  { id: "bitcoin",      sym: "BTC", name: "Bitcoin" },
  { id: "ethereum",     sym: "ETH", name: "Ethereum" },
  { id: "solana",       sym: "SOL", name: "Solana" },
  { id: "ripple",       sym: "XRP", name: "Ripple" },
  { id: "binancecoin",  sym: "BNB", name: "BNB" },
  { id: "cardano",      sym: "ADA", name: "Cardano" },
];

interface Coin {
  usd: number;
  usd_24h_change: number;
}

interface FearGreed {
  value: string;
  classification: string;
}

function fgColor(v: number) {
  if (v >= 75) return "#ef4444"; // extreme greed
  if (v >= 55) return "#f97316"; // greed
  if (v >= 45) return "#eab308"; // neutral
  if (v >= 25) return "#3b82f6"; // fear
  return "#8b5cf6"; // extreme fear
}

function fmt(n: number) {
  if (n >= 10000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1)     return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${n.toFixed(4)}`;
}

export function MarketPanel() {
  const [prices, setPrices]    = useState<Record<string, Coin> | null>(null);
  const [fg, setFg]            = useState<FearGreed | null>(null);
  const [loading, setLoading]  = useState(true);
  const [lastUp, setLastUp]    = useState<number>(0);
  const [spinning, setSpinning] = useState(false);

  const fetchData = useCallback(async () => {
    setSpinning(true);
    try {
      const ids = COINS.map((c) => c.id).join(",");
      const [priceRes, fgRes] = await Promise.all([
        fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`),
        fetch("https://api.alternative.me/fng/"),
      ]);
      if (priceRes.ok) setPrices(await priceRes.json());
      if (fgRes.ok) {
        const fgData = await fgRes.json();
        setFg({ value: fgData.data[0].value, classification: fgData.data[0].value_classification });
      }
      setLastUp(Date.now());
    } catch {
      // silent fail — keep existing data
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 90_000); // every 90s (CoinGecko free rate limit)
    return () => clearInterval(id);
  }, [fetchData]);

  const secsAgo = lastUp ? Math.floor((Date.now() - lastUp) / 1000) : null;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: "var(--bg-surface)",
      borderRight: "1px solid var(--border)",
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
          <BarChart2 size={12} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-primary)" }}>
            Market Intel
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {secsAgo !== null && (
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
              {secsAgo < 60 ? `${secsAgo}s ago` : `${Math.floor(secsAgo / 60)}m ago`}
            </span>
          )}
          <button
            onClick={fetchData}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", display: "flex",
              animation: spinning ? "spin 1s linear infinite" : "none",
            }}
            title="Refresh"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Coin list */}
      <div style={{ flex: 1, overflow: "auto", padding: "6px 0" }}>
        {loading && !prices ? (
          <div style={{ padding: "24px 12px", textAlign: "center", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
            LOADING MARKET DATA...
          </div>
        ) : (
          COINS.map((coin) => {
            const data = prices?.[coin.id];
            const chg  = data?.usd_24h_change ?? 0;
            const up   = chg >= 0;
            return (
              <div
                key={coin.id}
                style={{
                  display: "flex", alignItems: "center",
                  padding: "5px 12px",
                  borderBottom: "1px solid var(--border-subtle)",
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", width: 32, flexShrink: 0, letterSpacing: "0.06em" }}>
                  {coin.sym}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {coin.name}
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-primary)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                  {data ? fmt(data.usd) : "—"}
                </span>
                <span style={{
                  display: "flex", alignItems: "center", gap: 2,
                  fontSize: 10, fontWeight: 600,
                  color: data ? (up ? "#3fb950" : "#ef4444") : "var(--text-muted)",
                  flexShrink: 0, width: 52, justifyContent: "flex-end",
                }}>
                  {data ? (up ? <TrendingUp size={9} /> : <TrendingDown size={9} />) : null}
                  {data ? `${up ? "+" : ""}${chg.toFixed(2)}%` : "—"}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Fear & Greed Index */}
      {fg && (
        <div style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border)",
          padding: "8px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--bg)",
        }}>
          <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Crypto Fear &amp; Greed
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Mini gauge */}
            <div style={{ width: 48, height: 5, borderRadius: 3, background: "var(--bg-elevated)", overflow: "hidden" }}>
              <div style={{ width: `${fg.value}%`, height: "100%", background: fgColor(Number(fg.value)), borderRadius: 3, transition: "width 0.5s" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: fgColor(Number(fg.value)), fontVariantNumeric: "tabular-nums" }}>
              {fg.value}
            </span>
            <span style={{ fontSize: 9, color: fgColor(Number(fg.value)), textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {fg.classification}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
