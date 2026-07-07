"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border border-[var(--border-strong)] bg-[var(--surface)] wd-fade"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h3 className="text-[14px] font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      {...props}
      className={`w-full rounded-sm border border-[var(--border-strong)] bg-[var(--bg)] px-2.5 py-1.5 text-[13px] text-[var(--ink)] tnum outline-none focus:border-[var(--cyan)] ${props.className ?? ""}`}
    />
  );
}

export function SelectInput(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return (
    <select
      {...props}
      className={`w-full rounded-sm border border-[var(--border-strong)] bg-[var(--bg)] px-2.5 py-1.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--cyan)] ${props.className ?? ""}`}
    />
  );
}
