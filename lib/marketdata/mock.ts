// Deterministic mock provider. Generates plausible option chains from the
// watchlist's indicative price/IV so the scanner, desk marks and repair ladder
// all work with ZERO API keys. Data is synthetic — clearly labelled as such.

import type { PutContract } from "../domain/scanner";
import type { MarketDataProvider, OptionQuote } from "./provider";
import { bsPut, bsCall } from "./blackscholes";
import { WATCHLIST } from "../quality/watchlist";
import { dte, todayISO } from "../domain/format";

const BY_SYMBOL = new Map(WATCHLIST.map((w) => [w.symbol, w]));

// Fallback synthetic underlying for a symbol not in the watchlist (e.g. a demo
// lot on an unusual ticker) so the desk/repair screens still render.
function synth(symbol: string): { price: number; iv: number } {
  const wl = BY_SYMBOL.get(symbol);
  if (wl) return { price: wl.price, iv: wl.iv };
  const seed = hash(symbol);
  return { price: 20 + (seed % 300), iv: 0.3 + ((seed >> 5) % 40) / 100 };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function strikeStep(price: number): number {
  if (price < 25) return 1;
  if (price < 50) return 2.5;
  if (price < 200) return 5;
  return 10;
}

// Deterministic OI so the same contract always shows the same liquidity.
function openInterest(symbol: string, strike: number, exp: string): number {
  const h = hash(`${symbol}|${strike}|${exp}`);
  // 60..6060, occasionally below the 100 floor to exercise the liquidity gate.
  return 60 + (h % 6000);
}

function expirations(today: string): string[] {
  // Three expirations inside the 30-45 DTE window (weekly + monthly cadence).
  return [addDays(today, 31), addDays(today, 38), addDays(today, 45)];
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export class MockProvider implements MarketDataProvider {
  name = "mock";
  live = false;

  async getQuote(symbol: string): Promise<number> {
    return synth(symbol).price;
  }

  async getVix(): Promise<number> {
    return 18.5; // "normal" regime by default
  }

  async getPutChain(
    symbol: string,
    dteMin: number,
    dteMax: number,
  ): Promise<PutContract[]> {
    const today = todayISO();
    const { price, iv } = synth(symbol);
    const out: PutContract[] = [];
    const step = strikeStep(price);
    for (const exp of expirations(today)) {
      const d = dte(exp, today);
      if (d < dteMin || d > dteMax) continue;
      const t = d / 365;
      // Walk strikes from just below spot down to deep OTM.
      const top = Math.floor(price / step) * step;
      for (let k = top; k >= top - step * 14; k -= step) {
        if (k <= 0) break;
        const { price: mid0, delta } = bsPut(price, k, iv, t);
        if (Math.abs(delta) < 0.03 || Math.abs(delta) > 0.5) continue;
        const mid = round2(Math.max(0.02, mid0));
        const halfSpread = round2(Math.max(0.02, mid * 0.03));
        out.push({
          symbol,
          strike: k,
          expiration: exp,
          delta: round2(delta),
          bid: round2(Math.max(0.01, mid - halfSpread)),
          ask: round2(mid + halfSpread),
          mid,
          openInterest: openInterest(symbol, k, exp),
          underlyingPrice: price,
        });
      }
    }
    return out;
  }

  async getCallChain(
    symbol: string,
    dteMin: number,
    dteMax: number,
  ): Promise<OptionQuote[]> {
    const today = todayISO();
    const { price, iv } = synth(symbol);
    const out: OptionQuote[] = [];
    const step = strikeStep(price);
    for (const exp of expirations(today)) {
      const d = dte(exp, today);
      if (d < dteMin || d > dteMax) continue;
      const t = d / 365;
      const bottom = Math.ceil(price / step) * step;
      for (let k = bottom; k <= bottom + step * 18; k += step) {
        const { price: mid0, delta } = bsCall(price, k, iv, t);
        if (delta < 0.03 || delta > 0.6) continue;
        const mid = round2(Math.max(0.02, mid0));
        const halfSpread = round2(Math.max(0.02, mid * 0.03));
        out.push({
          symbol,
          strike: k,
          expiration: exp,
          optionType: "call",
          bid: round2(Math.max(0.01, mid - halfSpread)),
          ask: round2(mid + halfSpread),
          mid,
          delta: round2(delta),
          openInterest: openInterest(symbol, k, exp),
          underlyingPrice: price,
        });
      }
    }
    return out;
  }

  async getOptionMark(
    symbol: string,
    strike: number,
    expiration: string,
    optionType: "put" | "call",
  ): Promise<number | undefined> {
    const today = todayISO();
    const { price, iv } = synth(symbol);
    const d = Math.max(0, dte(expiration, today));
    const t = Math.max(1, d) / 365;
    const { price: mid } =
      optionType === "put" ? bsPut(price, strike, iv, t) : bsCall(price, strike, iv, t);
    return round2(Math.max(0.01, mid));
  }
}
