import React from "react";
import { CardArt } from "@/components/CardArt";
import { Pill, ValidationBadge, BalanceBadge } from "@/components/StatusBadge";
import { RARITY_META, winRateTone, tone } from "@/lib/constants";
import { Zap } from "lucide-react";

export function CardGridItem({ card, onClick, active }) {
  const rarity = RARITY_META[card.rarity] || RARITY_META.Common;
  const effectSummary = card.effects?.length
    ? `${card.effects[0].trigger}: ${card.effects[0].action} ${card.effects[0].value}${card.effects.length > 1 ? ` +${card.effects.length - 1}` : ""}`
    : "No effects";
  const wrt = tone(winRateTone(card.win_rate));
  return (
    <button
      data-testid={`card-item-${card.id}`}
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-lg border text-left transition-all duration-200 fade-up"
      style={{
        background: "var(--panel)",
        borderColor: active ? "var(--border-highlight)" : "var(--border-subtle)",
        boxShadow: active ? "0 0 0 1px var(--violet)" : "none",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-highlight)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = active ? "var(--border-highlight)" : "var(--border-subtle)"; }}
    >
      <div className="relative">
        <CardArt card={card} className="h-28 w-full" iconSize={34} />
        <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-mono font-bold"
          style={{ background: "rgba(9,10,15,0.8)", border: "1px solid var(--border-medium)", color: "var(--cyan)" }}>
          {card.cost}
        </div>
        <div className="absolute right-2 top-2">
          <span className="rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider"
            style={{ background: "rgba(9,10,15,0.75)", color: rarity.color, border: `1px solid ${rarity.ring}` }}>
            {card.rarity}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">{card.name}</div>
            <div className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
              {card.type} · {card.archetype}
            </div>
          </div>
          <div className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-mono" style={{ background: "var(--panel-2)", color: "var(--text-secondary)" }}>
            <Zap size={10} style={{ color: "var(--violet)" }} /> {card.power_score}
          </div>
        </div>

        <p className="line-clamp-2 text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {effectSummary}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          <ValidationBadge status={card.validation_status} />
          <BalanceBadge status={card.balance_status} />
        </div>
        <div className="flex items-center justify-between border-t pt-2 text-[10px] font-mono" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}>
          <span>v{card.version} · {card.lifecycle_status}</span>
          <span style={{ color: wrt.text }}>{card.win_rate != null ? `${card.win_rate}%` : "—"}</span>
        </div>
      </div>
    </button>
  );
}
