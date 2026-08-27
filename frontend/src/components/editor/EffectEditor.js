import React from "react";
import { Plus, Trash2 } from "lucide-react";

export function EffectEditor({ effects, meta, onChange }) {
  const update = (i, key, val) => {
    const next = effects.map((e, idx) => (idx === i ? { ...e, [key]: val } : e));
    onChange(next);
  };
  const add = () => onChange([...effects, { trigger: "On Play", action: "Deal Damage", target: "Enemy Hero", value: 1 }]);
  const remove = (i) => onChange(effects.filter((_, idx) => idx !== i));

  const sel = (val, opts, cb, testid) => (
    <select
      data-testid={testid}
      value={val}
      onChange={(e) => cb(e.target.value)}
      className="rounded border px-1.5 py-1 text-[11px] outline-none"
      style={{ background: "var(--panel)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
    >
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="space-y-2">
      {effects.length === 0 && (
        <div className="rounded-md border border-dashed px-3 py-3 text-center text-[11px]" style={{ borderColor: "var(--border-medium)", color: "var(--text-muted)" }}>
          No structured effects. Add one to define card behaviour.
        </div>
      )}
      {effects.map((e, i) => (
        <div key={i} data-testid={`effect-row-${i}`} className="rounded-md border p-2" style={{ background: "var(--panel-2)", borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Effect {i + 1}</span>
            <button data-testid={`remove-effect-${i}`} onClick={() => remove(i)} className="rounded p-0.5 transition-colors hover:bg-[var(--panel-hover)]" style={{ color: "var(--red)" }}>
              <Trash2 size={13} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {sel(e.trigger, meta.effect_triggers, (v) => update(i, "trigger", v), `effect-trigger-${i}`)}
            {sel(e.action, meta.effect_actions, (v) => update(i, "action", v), `effect-action-${i}`)}
            {sel(e.target, meta.effect_targets, (v) => update(i, "target", v), `effect-target-${i}`)}
            <input
              data-testid={`effect-value-${i}`}
              type="number"
              value={e.value}
              onChange={(ev) => update(i, "value", parseInt(ev.target.value || "0", 10))}
              className="rounded border px-1.5 py-1 text-[11px] outline-none"
              style={{ background: "var(--panel)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
        </div>
      ))}
      <button
        data-testid="add-effect-btn"
        onClick={add}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed py-1.5 text-[11px] transition-colors hover:bg-[var(--panel-hover)]"
        style={{ borderColor: "var(--border-medium)", color: "var(--text-secondary)" }}
      >
        <Plus size={13} /> Add effect
      </button>
    </div>
  );
}
