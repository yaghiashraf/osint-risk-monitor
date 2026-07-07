import Link from "next/link";
import type { ReactNode } from "react";

// Shared, deliberately spare UI primitives. Sharp corners, thin borders, no
// drop shadows — this is a trading tool.

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="mb-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--ink)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[13px] text-[var(--ink-muted)]">{subtitle}</p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      <hr className="brand-rule" />
    </header>
  );
}

type Tone =
  | "cyan"
  | "magenta"
  | "amber"
  | "coral"
  | "teal"
  | "neutral"
  | "brand";

const toneColor: Record<Tone, string> = {
  cyan: "var(--cyan)",
  magenta: "var(--magenta)",
  amber: "var(--amber)",
  coral: "var(--coral)",
  teal: "var(--teal)",
  neutral: "var(--ink-muted)",
  brand: "var(--brand)",
};

export function Badge({
  children,
  tone = "neutral",
  solid = false,
}: {
  children: ReactNode;
  tone?: Tone;
  solid?: boolean;
}) {
  const c = toneColor[tone];
  return (
    <span
      className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={
        solid
          ? { background: c, color: "#000" }
          : { color: c, border: `1px solid ${c}`, background: "transparent" }
      }
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  href,
  variant = "default",
  tone = "cyan",
  size = "md",
  disabled,
  type = "button",
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "default" | "ghost";
  tone?: Tone;
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  title?: string;
}) {
  const c = toneColor[tone];
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const sizing = size === "sm" ? "px-2 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]";
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: c, color: "#000", border: `1px solid ${c}` },
    default: { color: c, border: `1px solid ${c}`, background: "transparent" },
    ghost: {
      color: "var(--ink-muted)",
      border: "1px solid var(--border)",
      background: "transparent",
    },
  };
  const cls = `${base} ${sizing} ${className} hover:opacity-90`;
  if (href && !disabled) {
    return (
      <Link href={href} className={cls} style={styles[variant]} title={title}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cls}
      style={styles[variant]}
      title={title}
    >
      {children}
    </button>
  );
}

export function StatTile({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  sub?: ReactNode;
}) {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
        {label}
      </div>
      <div
        className="mt-1 text-[18px] font-semibold tnum"
        style={tone ? { color: toneColor[tone] } : undefined}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-[var(--ink-faint)] tnum">{sub}</div>}
    </div>
  );
}

export function EmptyState({
  text,
  cta,
}: {
  text: string;
  cta?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-6">
      <p className="text-[13px] text-[var(--ink-muted)]">{text}</p>
      {cta}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-[var(--border)] bg-[var(--surface)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({
  children,
  tone = "neutral",
  note,
}: {
  children: ReactNode;
  tone?: Tone;
  note?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <h2
        className="text-[13px] font-semibold uppercase tracking-wider"
        style={{ color: toneColor[tone] }}
      >
        {children}
      </h2>
      {note && <span className="text-[11px] text-[var(--ink-faint)]">{note}</span>}
    </div>
  );
}

export function DataNote({ live }: { live: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--ink-faint)]">
      <span className="wd-live-dot" />
      {live ? "Data delayed 15 min (Tradier sandbox)" : "Demo data — synthetic chains"}
    </span>
  );
}
