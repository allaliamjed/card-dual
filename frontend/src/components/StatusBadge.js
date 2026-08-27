import React from "react";
import { tone, VALIDATION_TONE, LIFECYCLE_TONE, BALANCE_TONE, VALIDATION_GLYPH } from "@/lib/constants";

export function Pill({ toneName = "slate", children, glyph, testid, className = "" }) {
  const t = tone(toneName);
  return (
    <span
      data-testid={testid}
      className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wide ${className}`}
      style={{ color: t.text, background: t.bg, border: `1px solid ${t.border}` }}
    >
      {glyph && <span className="leading-none">{glyph}</span>}
      {children}
    </span>
  );
}

export function Dot({ toneName = "slate", className = "" }) {
  const t = tone(toneName);
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${className}`} style={{ background: t.text }} />;
}

export const ValidationBadge = ({ status, testid }) => (
  <Pill toneName={VALIDATION_TONE[status]} glyph={VALIDATION_GLYPH[status]} testid={testid}>{status}</Pill>
);
export const LifecycleBadge = ({ status, testid }) => (
  <Pill toneName={LIFECYCLE_TONE[status]} testid={testid}>{status}</Pill>
);
export const BalanceBadge = ({ status, testid }) => (
  <Pill toneName={BALANCE_TONE[status]} testid={testid}>{status}</Pill>
);
