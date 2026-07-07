// Minimal Black-Scholes (r=0, no dividends) used only by the mock provider to
// generate realistic-looking deltas and premiums. Not used for live data.

function normPdf(x: number): number {
  return Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI);
}

// Abramowitz & Stegun 7.1.26 approximation of the standard normal CDF.
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = normPdf(x);
  const p =
    d *
    (0.319381530 * t -
      0.356563782 * t * t +
      1.781477937 * t * t * t -
      1.821255978 * t ** 4 +
      1.330274429 * t ** 5);
  return x >= 0 ? 1 - p : p;
}

export interface BsPut {
  price: number;
  delta: number; // put delta, negative
}

export function bsPut(S: number, K: number, sigma: number, tYears: number): BsPut {
  if (tYears <= 0 || sigma <= 0) {
    return { price: Math.max(K - S, 0), delta: S < K ? -1 : 0 };
  }
  const sqrtT = Math.sqrt(tYears);
  const d1 = (Math.log(S / K) + (sigma * sigma) / 2 * tYears) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const price = K * normCdf(-d2) - S * normCdf(-d1); // r = 0
  const delta = normCdf(d1) - 1;
  return { price, delta };
}

export function bsCall(S: number, K: number, sigma: number, tYears: number): { price: number; delta: number } {
  if (tYears <= 0 || sigma <= 0) {
    return { price: Math.max(S - K, 0), delta: S > K ? 1 : 0 };
  }
  const sqrtT = Math.sqrt(tYears);
  const d1 = (Math.log(S / K) + (sigma * sigma) / 2 * tYears) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const price = S * normCdf(d1) - K * normCdf(d2);
  return { price, delta: normCdf(d1) };
}
