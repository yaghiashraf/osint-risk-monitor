// The market-data source is swappable behind this interface. v1 ships a Tradier
// sandbox implementation and a deterministic mock; Polygon/Tradier-prod can be
// dropped in later without touching the scanner or desk.

import type { PutContract } from "../domain/scanner";

export interface OptionQuote {
  symbol: string; // underlying
  strike: number;
  expiration: string;
  optionType: "put" | "call";
  bid: number;
  ask: number;
  mid: number;
  delta: number;
  openInterest: number;
  underlyingPrice: number;
}

export interface MarketDataProvider {
  name: string;
  /** Whether this provider is backed by a real (delayed) data feed. */
  live: boolean;
  /** Current underlying last price. */
  getQuote(symbol: string): Promise<number>;
  /** VIX spot. */
  getVix(): Promise<number>;
  /** Put chain for a symbol filtered to a DTE window (inclusive). */
  getPutChain(
    symbol: string,
    dteMin: number,
    dteMax: number,
  ): Promise<PutContract[]>;
  /** Call chain for a symbol filtered to a DTE window (inclusive). */
  getCallChain(
    symbol: string,
    dteMin: number,
    dteMax: number,
  ): Promise<OptionQuote[]>;
  /** Mark for a single option contract (per share), or undefined if unknown. */
  getOptionMark(
    symbol: string,
    strike: number,
    expiration: string,
    optionType: "put" | "call",
  ): Promise<number | undefined>;
}
