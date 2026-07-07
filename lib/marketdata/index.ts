// Provider selection + a 15-minute in-memory cache. Sandbox data is delayed
// anyway, so caching by (method, args) for 15 min is safe and keeps us well
// under Tradier's sandbox rate limits.

import type { PutContract } from "../domain/scanner";
import type { MarketDataProvider, OptionQuote } from "./provider";
import { TradierProvider } from "./tradier";
import { MockProvider } from "./mock";

export const CACHE_TTL_MS = 15 * 60 * 1000;

let providerSingleton: MarketDataProvider | null = null;

export function getProvider(): MarketDataProvider {
  if (providerSingleton) return providerSingleton;
  const key = process.env.TRADIER_API_KEY;
  const base = process.env.TRADIER_BASE_URL;
  providerSingleton =
    key && key.trim().length > 0
      ? new CachingProvider(new TradierProvider(key, base))
      : new CachingProvider(new MockProvider());
  return providerSingleton;
}

// Whether the active provider is a real (delayed) feed. Drives the
// "Data delayed 15 min" vs "Demo data" note in the UI.
export function providerIsLive(): boolean {
  return !!(process.env.TRADIER_API_KEY && process.env.TRADIER_API_KEY.trim());
}

interface CacheEntry {
  value: unknown;
  expires: number;
}

// Wraps any provider, memoizing results for CACHE_TTL_MS. Falls back to the
// mock provider if a live call throws, so the app never hard-fails on a data
// outage — it degrades to synthetic data with a clear label.
class CachingProvider implements MarketDataProvider {
  name: string;
  live: boolean;
  private cache = new Map<string, CacheEntry>();
  private fallback = new MockProvider();

  constructor(private inner: MarketDataProvider) {
    this.name = inner.name;
    this.live = inner.live;
  }

  private async memo<T>(key: string, fn: () => Promise<T>, fb: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    const now = Date.now();
    if (hit && hit.expires > now) return hit.value as T;
    try {
      const value = await fn();
      this.cache.set(key, { value, expires: now + CACHE_TTL_MS });
      return value;
    } catch (err) {
      console.error(`marketdata: ${key} failed, using fallback`, err);
      return fb();
    }
  }

  getQuote(symbol: string): Promise<number> {
    return this.memo(`quote:${symbol}`, () => this.inner.getQuote(symbol), () =>
      this.fallback.getQuote(symbol),
    );
  }

  getVix(): Promise<number> {
    return this.memo("vix", () => this.inner.getVix(), () => this.fallback.getVix());
  }

  getPutChain(symbol: string, dteMin: number, dteMax: number): Promise<PutContract[]> {
    return this.memo(
      `puts:${symbol}:${dteMin}:${dteMax}`,
      () => this.inner.getPutChain(symbol, dteMin, dteMax),
      () => this.fallback.getPutChain(symbol, dteMin, dteMax),
    );
  }

  getCallChain(symbol: string, dteMin: number, dteMax: number): Promise<OptionQuote[]> {
    return this.memo(
      `calls:${symbol}:${dteMin}:${dteMax}`,
      () => this.inner.getCallChain(symbol, dteMin, dteMax),
      () => this.fallback.getCallChain(symbol, dteMin, dteMax),
    );
  }

  getOptionMark(
    symbol: string,
    strike: number,
    expiration: string,
    optionType: "put" | "call",
  ): Promise<number | undefined> {
    return this.memo(
      `mark:${symbol}:${strike}:${expiration}:${optionType}`,
      () => this.inner.getOptionMark(symbol, strike, expiration, optionType),
      () => this.fallback.getOptionMark(symbol, strike, expiration, optionType),
    );
  }
}
