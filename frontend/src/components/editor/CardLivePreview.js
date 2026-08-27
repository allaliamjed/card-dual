import React, { useState } from "react";
import { CardArt } from "@/components/CardArt";
import { RARITY_META, ARCHETYPE_META, VALIDATION_TONE, VALIDATION_GLYPH, tone } from "@/lib/constants";
import { RotateCcw } from "lucide-react";

const ACTION_LABEL = {
  "Deal Damage": "Deal", "Apply Bleed": "Bleed", "Draw": "Draw", "Gain Shield": "Shield",
  "Heal": "Heal", "Buff": "Buff", "Summon": "Summon",
};

export function CardLivePreview({ card }) {
  const [face, setFace] = useState("front");
  const rarity = RARITY_META[card.rarity] || RARITY_META.Common;
  const meta = ARCHETYPE_META[card.archetype] || ARCHETYPE_META.Neutral;
  const vt = tone(VALIDATION_TONE[card.validation_status]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        data-testid="card-live-preview"
        className="relative w-full max-w-[280px] overflow-hidden rounded-xl transition-all duration-200"
        style={{ background: "var(--panel-2)", border: `1px solid ${rarity.ring}`, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}
      >
        {face === "front" ? (
          <>
            <div className="flex items-center justify-between px-3 pt-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-mono font-bold"
                style={{ background: "var(--panel)", border: "1px solid var(--border-medium)", color: "var(--cyan)" }}>
                {card.cost}
              </div>
              <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: rarity.color }}>{card.rarity}</span>
            </div>
            <div className="px-3 pt-2">
              <CardArt card={card} className="h-36 w-full rounded-lg" iconSize={44} />
            </div>
            <div className="px-3 pt-2.5">
              <div className="flex items-center justify-between">
                <div className="truncate text-[15px] font-semibold tracking-tight">{card.name || "Untitled"}</div>
                <span className="shrink-0 text-[10px]" style={{ color: vt.text }}>{VALIDATION_GLYPH[card.validation_status]}</span>
              </div>
              <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                {card.type} · {card.archetype} · {meta.label}
              </div>
            </div>

            {card.keywords?.length > 0 && (
              <div className="flex flex-wrap gap-1 px-3 pt-2">
                {card.keywords.map((k) => (
                  <span key={k} className="rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase"
                    style={{ background: "rgba(139,92,246,0.14)", color: "#a78bfa" }}>{k}</span>
                ))}
              </div>
            )}

            <div className="mx-3 mt-2 min-h-[54px] rounded-lg p-2.5" style={{ background: "var(--panel)", border: "1px solid var(--border-subtle)" }}>
              {card.effects?.length ? (
                <ul className="space-y-1">
                  {card.effects.map((e, i) => (
                    <li key={i} className="text-[11px] leading-snug">
                      <span className="font-mono font-medium" style={{ color: "var(--cyan)" }}>{e.trigger}:</span>{" "}
                      <span style={{ color: "var(--text-secondary)" }}>{ACTION_LABEL[e.action] || e.action} {e.value} → {e.target}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-[11px] italic" style={{ color: "var(--text-muted)" }}>No effects defined</div>
              )}
            </div>

            {card.description && (
              <div className="px-3 pt-2 text-[10px] italic leading-snug" style={{ color: "var(--text-muted)" }}>“{card.description}”</div>
            )}

            <div className="mt-2.5 flex items-center justify-between border-t px-3 py-2" style={{ borderColor: "var(--border-subtle)" }}>
              <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>v{card.version}</span>
              <div className="flex items-center gap-1 text-[11px] font-mono font-bold" style={{ color: meta.color }}>
                {card.power}<span className="text-[9px] font-normal" style={{ color: "var(--text-muted)" }}>PWR</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-[420px] flex-col items-center justify-center gap-3" style={{ background: `linear-gradient(135deg, ${meta.from}, ${meta.to})` }}>
            <div className="grid-texture absolute inset-0 opacity-40" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full" style={{ border: `2px solid ${meta.color}`, background: "rgba(9,10,15,0.6)" }}>
              <meta.icon size={28} style={{ color: meta.color }} strokeWidth={1.5} />
            </div>
            <div className="relative text-xs font-mono uppercase tracking-[0.3em]" style={{ color: "var(--text-secondary)" }}>Card Dual</div>
          </div>
        )}
      </div>

      <button
        data-testid="flip-card-btn"
        onClick={() => setFace((f) => (f === "front" ? "back" : "front"))}
        className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] transition-colors"
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)", background: "var(--panel-2)" }}
      >
        <RotateCcw size={12} /> Flip to {face === "front" ? "back" : "front"}
      </button>
    </div>
  );
}
