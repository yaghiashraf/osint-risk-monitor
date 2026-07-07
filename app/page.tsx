import Link from "next/link";

// Marketing page — public. Same dark, institutional design system.
export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5" style={{ background: "var(--brand)" }} />
            <span className="text-[16px] font-bold tracking-tight">WheelDesk</span>
          </div>
          <nav className="flex items-center gap-4 text-[13px]">
            <a href="#how" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
              How it works
            </a>
            <a href="#pricing" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
              Pricing
            </a>
            <Link
              href="/desk"
              className="rounded-sm border border-[var(--cyan)] px-3 py-1.5 text-[var(--cyan)] hover:opacity-90"
            >
              Open the desk →
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1100px] px-5 py-20">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--cyan)]">
          Operations desk for wheel traders
        </p>
        <h1 className="max-w-3xl text-[44px] font-semibold leading-[1.05] tracking-tight sm:text-[56px]">
          The wheel doesn&apos;t end at assignment.
          <br />
          <span className="text-[var(--ink-muted)]">Neither should your tools.</span>
        </h1>
        <hr className="brand-rule mt-6 max-w-[120px]" />
        <p className="mt-6 max-w-xl text-[15px] text-[var(--ink-muted)]">
          Not a screener with a table of options. A desk that manages the full lifecycle —
          cash-secured puts, the 50%-profit Trap System, and the one thing nobody else handles:
          what to do <span className="text-[var(--ink)]">after</span> you get assigned.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/desk"
            className="rounded-sm bg-[var(--cyan)] px-5 py-2.5 text-[14px] font-medium text-black hover:opacity-90"
          >
            Load the demo desk
          </Link>
          <a
            href="#how"
            className="rounded-sm border border-[var(--border-strong)] px-5 py-2.5 text-[14px] text-[var(--ink)] hover:border-[var(--cyan)]"
          >
            See the three screens
          </a>
        </div>
        <p className="mt-4 text-[12px] text-[var(--ink-faint)]">
          Free tier · no card · demo positions load in one click.
        </p>
      </section>

      {/* Three screens */}
      <section id="how" className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[1100px] px-5 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <Feature
              tone="var(--cyan)"
              kicker="01 · Scanner"
              title="Find the entry"
              body="House Rules preset: 30–45 DTE, VIX-adjusted delta band, quality + earnings filters, min 3% ROC, real liquidity floors. Delayed Tradier sandbox chains — never faked as real-time."
            />
            <Feature
              tone="var(--amber)"
              kicker="02 · Desk"
              title="Work the position"
              body="Good Bank / Bad Bank split. The Trap System fires the moment an option can be closed at 50% of max profit. Earnings-collision, delta-drift, and 7-DTE alerts on every open leg."
            />
            <Feature
              tone="var(--magenta)"
              kicker="03 · Repair"
              title="Fix the assignment"
              body="The differentiator. An Adjusted-Basis Ladder that grinds your cost basis down without capping the recovery — with a Desk Pick and a shareable 6-cycle repair chart."
            />
          </div>
        </div>
      </section>

      {/* Repair callout */}
      <section className="mx-auto max-w-[1100px] px-5 py-16">
        <div className="border border-[var(--border)] p-6">
          <h2 className="text-[22px] font-semibold tracking-tight">
            The Assignment Repair Engine
          </h2>
          <hr className="brand-rule mt-3 max-w-[120px]" />
          <p className="mt-4 max-w-2xl text-[14px] text-[var(--ink-muted)]">
            Everyone shows you the entry. Nobody tells you what to do when a $30 put gets assigned
            and the stock is at $21. WheelDesk auto-sums every premium you&apos;ve collected on the
            lot, computes your true adjusted basis, and lays out the covered-call campaign that
            repairs it — respecting the house rule: never cap below basis. Or flip to aggressive.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MiniStat label="Adjusted basis" value="$24.00" tone="var(--cyan)" />
            <MiniStat label="Desk pick" value="$25 call · 41% ann." tone="var(--teal)" />
            <MiniStat label="Repair ETA" value="≈ 6.5 months" tone="var(--amber)" />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[1100px] px-5 py-16">
          <h2 className="text-[22px] font-semibold tracking-tight">Pricing</h2>
          <hr className="brand-rule mt-3 max-w-[120px]" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
            <div className="border border-[var(--border)] p-6">
              <h3 className="text-[16px] font-semibold">Free</h3>
              <p className="mt-1 text-[28px] font-semibold tnum">$0</p>
              <ul className="mt-4 space-y-1.5 text-[13px] text-[var(--ink-muted)]">
                <li>· 3 tracked positions</li>
                <li>· Scanner limited to 10 results</li>
                <li>· Full Trap System + Repair Engine</li>
              </ul>
              <Link
                href="/desk"
                className="mt-6 inline-block rounded-sm border border-[var(--border-strong)] px-4 py-2 text-[13px] hover:border-[var(--cyan)]"
              >
                Start free
              </Link>
            </div>
            <div className="border border-[var(--cyan)] p-6">
              <h3 className="text-[16px] font-semibold text-[var(--cyan)]">Pro</h3>
              <p className="mt-1 text-[28px] font-semibold tnum">
                $39<span className="text-[14px] text-[var(--ink-muted)]">/mo</span>
                <span className="ml-2 text-[14px] text-[var(--ink-muted)]">or $349/yr</span>
              </p>
              <ul className="mt-4 space-y-1.5 text-[13px] text-[var(--ink-muted)]">
                <li>· Unlimited tracked positions</li>
                <li>· Full scanner results</li>
                <li>· Everything on Free</li>
              </ul>
              <Link
                href="/settings"
                className="mt-6 inline-block rounded-sm bg-[var(--cyan)] px-4 py-2 text-[13px] font-medium text-black hover:opacity-90"
              >
                Go Pro
              </Link>
            </div>
          </div>
          <p className="mt-4 text-[12px] text-[var(--ink-faint)]">
            No trials — the free tier is the trial.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-[1100px] flex-col items-start justify-between gap-2 px-5 py-8 text-[12px] text-[var(--ink-faint)] sm:flex-row sm:items-center">
          <span>Built by a prop desk, not a dev shop.</span>
          <span>Tracking only — execute at your broker. Not investment advice.</span>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  tone,
  kicker,
  title,
  body,
}: {
  tone: string;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: tone }}>
        {kicker}
      </p>
      <h3 className="mt-2 text-[18px] font-semibold">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-muted)]">{body}</p>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
        {label}
      </div>
      <div className="mt-1 text-[15px] font-semibold tnum" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}
