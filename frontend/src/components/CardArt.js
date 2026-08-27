import React from "react";
import { ARCHETYPE_META, RARITY_META } from "@/lib/constants";

// Generative, restrained placeholder artwork keyed by archetype + rarity.
export function CardArt({ card, className = "", iconSize = 30 }) {
  const meta = ARCHETYPE_META[card.archetype] || ARCHETYPE_META.Neutral;
  const rarity = RARITY_META[card.rarity] || RARITY_META.Common;
  const Icon = meta.icon;
  // deterministic angle from id
  const seed = (card.id || card.name || "x").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const angle = 120 + (seed % 90);
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(${angle}deg, ${meta.from}, ${meta.to})` }}
    >
      <div className="absolute inset-0 grid-texture opacity-60" />
      <div
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-25"
        style={{ background: meta.color }}
      />
      <div className="relative flex h-full w-full items-center justify-center">
        <Icon size={iconSize} style={{ color: meta.color }} strokeWidth={1.4} className="opacity-80" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: rarity.ring }} />
    </div>
  );
}
