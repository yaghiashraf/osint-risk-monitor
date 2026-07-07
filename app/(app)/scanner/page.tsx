import { Suspense } from "react";
import { ScannerClient } from "@/components/scanner/ScannerClient";

export const dynamic = "force-dynamic";

export default function ScannerPage() {
  return (
    <Suspense fallback={<div className="text-[var(--ink-muted)]">Loading scanner…</div>}>
      <ScannerClient />
    </Suspense>
  );
}
