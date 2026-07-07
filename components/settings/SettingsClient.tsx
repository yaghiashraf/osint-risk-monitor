"use client";

import { useState } from "react";
import { useStore } from "@/lib/store/context";
import { Badge, Button, PageHeader, Panel, SectionLabel } from "@/components/ui";
import { FREE_POSITION_LIMIT, FREE_SCANNER_ROWS } from "@/lib/domain/gating";

export function SettingsClient({ stripeConfigured }: { stripeConfigured: boolean }) {
  const { profile, setPlan } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const checkout = async (interval: "monthly" | "annual") => {
    setBusy(interval);
    setMsg(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setMsg(data.error ?? "Checkout unavailable.");
    } catch {
      setMsg("Checkout failed.");
    } finally {
      setBusy(null);
    }
  };

  const portal = async () => {
    setBusy("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setMsg(data.error ?? "Portal unavailable.");
    } finally {
      setBusy(null);
    }
  };

  const isPro = profile.plan === "pro";

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Plan, billing, and desk preferences."
        right={<Badge tone={isPro ? "teal" : "neutral"}>{isPro ? "Pro" : "Free"}</Badge>}
      />

      <SectionLabel tone="cyan">Plan</SectionLabel>
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <Panel className="p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[15px] font-semibold">Free</h3>
            <span className="text-[13px] text-[var(--ink-muted)]">$0</span>
          </div>
          <ul className="mt-3 space-y-1 text-[12px] text-[var(--ink-muted)]">
            <li>· {FREE_POSITION_LIMIT} tracked positions</li>
            <li>· Scanner limited to {FREE_SCANNER_ROWS} results</li>
            <li>· Trap System + Repair Engine</li>
          </ul>
        </Panel>
        <Panel className="p-4" >
          <div className="flex items-baseline justify-between">
            <h3 className="text-[15px] font-semibold text-[var(--cyan)]">Pro</h3>
            <span className="text-[13px] text-[var(--ink-muted)]">$39/mo · $349/yr</span>
          </div>
          <ul className="mt-3 space-y-1 text-[12px] text-[var(--ink-muted)]">
            <li>· Unlimited tracked positions</li>
            <li>· Full scanner results</li>
            <li>· Everything on Free</li>
          </ul>
          {isPro ? (
            <div className="mt-4 flex items-center gap-2">
              <Badge tone="teal">Active</Badge>
              <Button size="sm" variant="ghost" onClick={portal} disabled={busy !== null}>
                Manage billing
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => checkout("monthly")}
                disabled={busy !== null}
              >
                {busy === "monthly" ? "…" : "Monthly $39"}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => checkout("annual")}
                disabled={busy !== null}
              >
                {busy === "annual" ? "…" : "Annual $349"}
              </Button>
            </div>
          )}
          {msg && <p className="mt-2 text-[11px] text-[var(--amber)]">{msg}</p>}
        </Panel>
      </div>

      {!stripeConfigured && (
        <>
          <SectionLabel tone="amber" note="Stripe not configured in this environment">
            Simulate plan (demo)
          </SectionLabel>
          <Panel className="p-4">
            <p className="mb-3 text-[12px] text-[var(--ink-muted)]">
              Stripe isn&apos;t wired up here, so flip the plan locally to see gating change
              instantly — free limits vs. unlimited Pro — without a redeploy.
            </p>
            <div className="flex gap-2">
              <Button
                variant={isPro ? "ghost" : "primary"}
                size="sm"
                onClick={() => setPlan("free")}
              >
                Set Free
              </Button>
              <Button
                variant={isPro ? "primary" : "ghost"}
                size="sm"
                tone="teal"
                onClick={() => setPlan("pro")}
              >
                Set Pro
              </Button>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
