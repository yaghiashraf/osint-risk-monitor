"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useStore } from "@/lib/store/context";
import { clerkEnabled } from "@/lib/clerk-config";
import { Badge } from "./ui";

const NAV = [
  { href: "/desk", label: "Desk" },
  { href: "/scanner", label: "Scanner" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useStore();

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1200px] items-center gap-6 px-4">
          <Link href="/desk" className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3"
              style={{ background: "var(--brand)" }}
            />
            <span className="text-[15px] font-bold tracking-tight">WheelDesk</span>
          </Link>
          <div className="flex items-center gap-1">
            {NAV.map((n) => {
              const active =
                pathname === n.href || pathname.startsWith(n.href + "/");
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-sm px-2.5 py-1 text-[13px] transition-colors"
                  style={{
                    color: active ? "var(--cyan)" : "var(--ink-muted)",
                    background: active ? "var(--surface-2)" : "transparent",
                  }}
                >
                  {n.label}
                </Link>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge tone={profile.plan === "pro" ? "teal" : "neutral"}>
              {profile.plan === "pro" ? "Pro" : "Free"}
            </Badge>
            {clerkEnabled ? (
              <UserButton />
            ) : (
              <span className="text-[11px] text-[var(--ink-faint)]">Demo mode</span>
            )}
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-[1200px] px-4 py-6 wd-fade">{children}</main>
    </div>
  );
}
