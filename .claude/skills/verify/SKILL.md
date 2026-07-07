---
name: verify
description: Build, run, and drive WheelDesk end-to-end to verify changes at the real surface (browser + API).
---

# Verifying WheelDesk

## Build & launch

```bash
npm install            # .npmrc sets legacy-peer-deps
npm run build          # Next 16 / Turbopack; TS errors fail the build
nohup npm run start > /tmp/wd.log 2>&1 &   # serves on :3000
```

No env vars needed — with zero keys the app runs in demo mode
(localStorage store + mock market data). Kill with `pkill -f "next start"`.

## Surfaces worth driving

- **API**: `curl /api/scanner` (House Rules results + VIX band),
  `POST /api/marks` (batch option marks; drives Trap status),
  `/api/repair/chain?symbol=INTC` (CC ladder input),
  `/api/cron/alerts` + `/api/cron/quality` (return `skipped` JSON without Supabase),
  `POST /api/stripe/checkout` (400 + clear error without keys).
- **Browser** (client store is localStorage — API checks alone don't cover it):
  Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, launch via
  `playwright-core` (install it in the scratchpad, not the repo) with
  `--no-sandbox`. Key flow: `/desk` → "Load demo positions" → wait for
  `text=TRAP` (marks fetch takes a beat) → "Open Repair Engine" → wait for
  `table >> text=PICK`. Also: Close modal (realized P/L math), Settings →
  "Set Pro" (gating flip), reload (persistence).

## Gotchas

- Demo seed loads 4 tracked positions — over the free limit of 3 by design,
  so scanner Track buttons are disabled until the plan is flipped to Pro.
- Mock data yields ~8 scanner rows, under the 10-row free cap, so the
  blur/upgrade section only appears with live Tradier data or a lower cap.
- `/scanner?symbol=X` (Roll deep-link) is often empty when X has earnings
  inside the 30–45 DTE window — correct House Rules behavior, not a bug.
- Expected demo math: PLTR trap mark ≈ $0.97 vs $2.50 credit; INTC adjusted
  basis $24.00 (raw 25 − $200 premiums / 200 sh).
