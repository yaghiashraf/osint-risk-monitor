// Small id helper. Uses crypto.randomUUID when available (browser + node 18+),
// with a deterministic-ish fallback.
export function uid(prefix = ""): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  const id =
    g.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${id}` : id;
}
