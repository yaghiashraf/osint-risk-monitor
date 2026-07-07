// Tradier sandbox implementation of MarketDataProvider. Data is delayed ~15
// min on the sandbox — the UI labels it as such; we never pretend it is live.

import type { PutContract } from "../domain/scanner";
import type { MarketDataProvider, OptionQuote } from "./provider";
import { dte, todayISO } from "../domain/format";

interface TradierGreeks {
  delta?: number;
}

interface TradierOption {
  symbol: string;
  underlying: string;
  strike: number;
  expiration_date: string;
  option_type: "put" | "call";
  bid: number | null;
  ask: number | null;
  open_interest: number | null;
  greeks?: TradierGreeks;
}

export class TradierProvider implements MarketDataProvider {
  name = "tradier";
  live = true;

  constructor(
    private apiKey: string,
    private baseUrl = "https://sandbox.tradier.com/v1",
  ) {}

  private async get(path: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
      // Sandbox is delayed anyway; let our own cache govern freshness.
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Tradier ${res.status} for ${path}`);
    }
    return (await res.json()) as Record<string, unknown>;
  }

  async getQuote(symbol: string): Promise<number> {
    const data = await this.get(
      `/markets/quotes?symbols=${encodeURIComponent(symbol)}`,
    );
    const quotes = (data.quotes as { quote?: unknown })?.quote;
    const q = Array.isArray(quotes) ? quotes[0] : quotes;
    const last = (q as { last?: number; close?: number })?.last;
    const close = (q as { close?: number })?.close;
    return Number(last ?? close ?? 0);
  }

  async getVix(): Promise<number> {
    try {
      const v = await this.getQuote("VIX");
      return v > 0 ? v : 18;
    } catch {
      return 18;
    }
  }

  private async expirationsInWindow(
    symbol: string,
    dteMin: number,
    dteMax: number,
  ): Promise<string[]> {
    const today = todayISO();
    const data = await this.get(
      `/markets/options/expirations?symbol=${encodeURIComponent(symbol)}&includeAllRoots=true`,
    );
    const raw = (data.expirations as { date?: unknown })?.date;
    const list: string[] = Array.isArray(raw) ? raw as string[] : raw ? [raw as string] : [];
    return list.filter((exp) => {
      const d = dte(exp, today);
      return d >= dteMin && d <= dteMax;
    });
  }

  private async chain(symbol: string, expiration: string): Promise<TradierOption[]> {
    const data = await this.get(
      `/markets/options/chains?symbol=${encodeURIComponent(symbol)}&expiration=${expiration}&greeks=true`,
    );
    const raw = (data.options as { option?: unknown })?.option;
    if (!raw) return [];
    return (Array.isArray(raw) ? raw : [raw]) as TradierOption[];
  }

  async getPutChain(
    symbol: string,
    dteMin: number,
    dteMax: number,
  ): Promise<PutContract[]> {
    const expirations = await this.expirationsInWindow(symbol, dteMin, dteMax);
    const underlyingPrice = await this.getQuote(symbol);
    const out: PutContract[] = [];
    for (const exp of expirations) {
      const options = await this.chain(symbol, exp);
      for (const o of options) {
        if (o.option_type !== "put") continue;
        const bid = o.bid ?? 0;
        const ask = o.ask ?? 0;
        const mid = (bid + ask) / 2;
        out.push({
          symbol,
          strike: o.strike,
          expiration: o.expiration_date,
          delta: o.greeks?.delta ?? 0,
          bid,
          ask,
          mid,
          openInterest: o.open_interest ?? 0,
          underlyingPrice,
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
    const expirations = await this.expirationsInWindow(symbol, dteMin, dteMax);
    const underlyingPrice = await this.getQuote(symbol);
    const out: OptionQuote[] = [];
    for (const exp of expirations) {
      const options = await this.chain(symbol, exp);
      for (const o of options) {
        if (o.option_type !== "call") continue;
        const bid = o.bid ?? 0;
        const ask = o.ask ?? 0;
        out.push({
          symbol,
          strike: o.strike,
          expiration: o.expiration_date,
          optionType: "call",
          bid,
          ask,
          mid: (bid + ask) / 2,
          delta: o.greeks?.delta ?? 0,
          openInterest: o.open_interest ?? 0,
          underlyingPrice,
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
    const options = await this.chain(symbol, expiration);
    const match = options.find(
      (o) => o.option_type === optionType && o.strike === strike,
    );
    if (!match) return undefined;
    return ((match.bid ?? 0) + (match.ask ?? 0)) / 2;
  }
}
