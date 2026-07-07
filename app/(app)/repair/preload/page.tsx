import { Suspense } from "react";
import { RepairPreload } from "@/components/repair/RepairPreload";

export const dynamic = "force-dynamic";

// Reached from the Desk's delta_drift alert: pre-load a repair plan for a CSP
// that is likely to be assigned, before it actually is.
export default function RepairPreloadPage() {
  return (
    <Suspense fallback={<div className="text-[var(--ink-muted)]">Loading…</div>}>
      <RepairPreload />
    </Suspense>
  );
}
