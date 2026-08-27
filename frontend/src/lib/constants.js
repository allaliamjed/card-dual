// Visual + semantic maps for Card Dual Studio.
import {
  Droplet, Flame, Cpu, Sparkles, Hexagon,
} from "lucide-react";

export const ARCHETYPE_META = {
  Shadow: { icon: Droplet, color: "#e11d48", from: "#2a0a14", to: "#0d0910", label: "Bleed" },
  Ember: { icon: Flame, color: "#f97316", from: "#2a1607", to: "#0d0b08", label: "Burn" },
  Tech: { icon: Cpu, color: "#06b6d4", from: "#062a30", to: "#080d10", label: "Artifact" },
  Arcane: { icon: Sparkles, color: "#8b5cf6", from: "#1c1435", to: "#0b0912", label: "Synergy" },
  Neutral: { icon: Hexagon, color: "#64748b", from: "#161a22", to: "#0b0d12", label: "Neutral" },
};

export const RARITY_META = {
  Common: { color: "#94a3b8", ring: "rgba(148,163,184,0.4)" },
  Rare: { color: "#38bdf8", ring: "rgba(56,189,248,0.5)" },
  Epic: { color: "#a78bfa", ring: "rgba(167,139,250,0.55)" },
  Legendary: { color: "#f59e0b", ring: "rgba(245,158,11,0.6)" },
  Mythic: { color: "#f43f5e", ring: "rgba(244,63,94,0.6)" },
};

// tone: green | amber | red | violet | cyan | slate
const TONES = {
  green: { text: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)" },
  amber: { text: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" },
  red: { text: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)" },
  violet: { text: "#a78bfa", bg: "rgba(139,92,246,0.14)", border: "rgba(139,92,246,0.4)" },
  cyan: { text: "#22d3ee", bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.35)" },
  slate: { text: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.25)" },
};

export const tone = (t) => TONES[t] || TONES.slate;

export const VALIDATION_TONE = {
  Valid: "green", "Needs Review": "amber", Invalid: "red", Unvalidated: "slate",
};
export const LIFECYCLE_TONE = {
  Draft: "slate", Proposed: "cyan", "Needs Review": "amber",
  Valid: "green", Approved: "violet", Exported: "cyan",
};
export const BALANCE_TONE = {
  Balanced: "green", Unbalanced: "red", Simulating: "cyan", "Not Simulated": "slate",
};

export const VALIDATION_GLYPH = {
  Valid: "✓", "Needs Review": "⚠", Invalid: "✕", Unvalidated: "○",
};

export function winRateTone(wr) {
  if (wr == null) return "slate";
  if (wr >= 58 || wr <= 42) return "red";
  if (wr >= 54 || wr <= 46) return "amber";
  return "green";
}
