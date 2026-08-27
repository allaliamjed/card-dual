import React, { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useStudio } from "@/context/StudioContext";
import { CardLivePreview } from "./CardLivePreview";
import { EffectEditor } from "./EffectEditor";
import { ValidationBadge, LifecycleBadge, BalanceBadge, Pill } from "@/components/StatusBadge";
import { tone, winRateTone } from "@/lib/constants";
import {
  Zap, Gauge, CheckCircle2, AlertTriangle, XCircle, Link2, Swords,
  GitBranch, Trash2, ShieldCheck, Send, Rocket, RotateCcw, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const EDITABLE = ["name", "type", "archetype", "rarity", "cost", "resource_type",
  "power", "abilities", "keywords", "effects", "tags", "description", "notes", "artwork_key"];

function pick(card) {
  const o = {};
  EDITABLE.forEach((k) => { o[k] = card[k]; });
  return o;
}

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</label>
    {children}
  </div>
);

const inputCls = "rounded-md border px-2 py-1.5 text-sm outline-none focus:border-[var(--border-highlight)] transition-colors";
const inputStyle = { background: "var(--panel-2)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" };

export function CardEditor({ cardId, layout = "slideover", onClose }) {
  const { meta, afterMutation, setSaveState, setExportOpen } = useStudio();
  const [card, setCard] = useState(null);
  const [form, setForm] = useState(null);
  const [relations, setRelations] = useState(null);
  const [versions, setVersions] = useState([]);
  const [busy, setBusy] = useState(false);
  const saveTimer = useRef(null);
  const dirty = useRef(false);

  const loadAux = useCallback(async (id) => {
    try {
      const [rel, vers] = await Promise.all([api.relations(id), api.versions(id)]);
      setRelations(rel); setVersions(vers);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!cardId) return;
    let cancel = false;
    (async () => {
      const c = await api.getCard(cardId);
      if (cancel) return;
      setCard(c); setForm(pick(c));
      loadAux(cardId);
    })();
    return () => { cancel = true; };
  }, [cardId, loadAux]);

  const doSave = useCallback(async (data) => {
    setSaveState({ label: "Saving…", color: "var(--cyan)" });
    try {
      const updated = await api.updateCard(cardId, data);
      setCard(updated);
      dirty.current = false;
      setSaveState({ label: "Saved ✓", color: "var(--green)" });
      afterMutation();
      setTimeout(() => setSaveState((s) => (s && s.label === "Saved ✓" ? null : s)), 1600);
    } catch {
      setSaveState({ label: "Save failed", color: "var(--red)" });
    }
  }, [cardId, setSaveState, afterMutation]);

  const change = useCallback((key, val) => {
    setForm((f) => {
      const next = { ...f, [key]: val };
      dirty.current = true;
      setSaveState({ label: "Unsaved changes", color: "var(--amber)" });
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => doSave(next), 700);
      return next;
    });
  }, [doSave, setSaveState]);

  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (form) doSave(form);
  }, [form, doSave]);

  const validate = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setBusy(true);
    if (form) await api.updateCard(cardId, form);
    const c = await api.validateCard(cardId);
    setCard(c); setForm(pick(c));
    afterMutation();
    setBusy(false);
    const msg = { Valid: "Card is valid", "Needs Review": "Card needs review", Invalid: "Card is invalid" }[c.validation_status];
    toast[c.validation_status === "Valid" ? "success" : c.validation_status === "Invalid" ? "error" : "warning"](msg, {
      description: `${c.validation_errors.length} errors · ${c.validation_warnings.length} warnings`,
    });
  }, [cardId, form, afterMutation]);

  const transition = useCallback(async (action, label) => {
    setBusy(true);
    try {
      const c = await api.transition(cardId, action);
      setCard(c); afterMutation();
      toast.success(label);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Action failed");
    }
    setBusy(false);
  }, [cardId, afterMutation]);

  const del = useCallback(async () => {
    await api.deleteCard(cardId);
    afterMutation();
    toast.success("Card deleted");
    onClose?.();
  }, [cardId, afterMutation, onClose]);

  // keyboard: Ctrl+S save, Ctrl+Enter validate
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); saveNow(); }
      else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); validate(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [saveNow, validate]);

  if (!card || !form || !meta) {
    return <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>Loading card…</div>;
  }

  const preview = { ...card, ...form };
  const wide = layout === "page";

  const editorFields = (
    <div className="space-y-4">
      <Field label="Card name">
        <input data-testid="field-name" className={inputCls} style={inputStyle} value={form.name} onChange={(e) => change("name", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <select data-testid="field-type" className={inputCls} style={inputStyle} value={form.type} onChange={(e) => change("type", e.target.value)}>
            {meta.card_types.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Archetype">
          <select data-testid="field-archetype" className={inputCls} style={inputStyle} value={form.archetype} onChange={(e) => change("archetype", e.target.value)}>
            {meta.archetypes.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Rarity">
          <select data-testid="field-rarity" className={inputCls} style={inputStyle} value={form.rarity} onChange={(e) => change("rarity", e.target.value)}>
            {meta.rarities.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Resource">
          <select data-testid="field-resource" className={inputCls} style={inputStyle} value={form.resource_type} onChange={(e) => change("resource_type", e.target.value)}>
            {meta.resource_types.map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Cost">
          <input data-testid="field-cost" type="number" className={inputCls} style={inputStyle} value={form.cost} onChange={(e) => change("cost", parseInt(e.target.value || "0", 10))} />
        </Field>
        <Field label="Power">
          <input data-testid="field-power" type="number" className={inputCls} style={inputStyle} value={form.power} onChange={(e) => change("power", parseInt(e.target.value || "0", 10))} />
        </Field>
      </div>

      <Field label="Keywords">
        <div className="flex flex-wrap gap-1.5">
          {meta.keywords.map((k) => {
            const on = form.keywords.includes(k);
            return (
              <button key={k} data-testid={`keyword-${k}`}
                onClick={() => change("keywords", on ? form.keywords.filter((x) => x !== k) : [...form.keywords, k])}
                className="rounded px-2 py-0.5 text-[11px] font-mono transition-colors"
                style={{ background: on ? "rgba(139,92,246,0.16)" : "var(--panel-2)", color: on ? "#a78bfa" : "var(--text-muted)", border: `1px solid ${on ? "rgba(139,92,246,0.4)" : "var(--border-subtle)"}` }}>
                {k}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Effects">
        <EffectEditor effects={form.effects} meta={meta} onChange={(e) => change("effects", e)} />
      </Field>

      <Field label="Tags (comma separated)">
        <input data-testid="field-tags" className={inputCls} style={inputStyle} value={form.tags.join(", ")} onChange={(e) => change("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} />
      </Field>
      <Field label="Abilities (comma separated)">
        <input data-testid="field-abilities" className={inputCls} style={inputStyle} value={form.abilities.join(", ")} onChange={(e) => change("abilities", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} />
      </Field>
      <Field label="Description">
        <textarea data-testid="field-description" rows={2} className={inputCls} style={inputStyle} value={form.description} onChange={(e) => change("description", e.target.value)} />
      </Field>
      <Field label="Internal designer notes">
        <textarea data-testid="field-notes" rows={2} className={inputCls} style={inputStyle} value={form.notes} onChange={(e) => change("notes", e.target.value)} />
      </Field>
    </div>
  );

  const analysis = <Analysis card={card} relations={relations} versions={versions} />;

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <button data-testid="validate-card-btn" disabled={busy} onClick={validate}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-50" style={{ background: "var(--violet)" }}>
        <ShieldCheck size={14} /> Validate <kbd className="ml-1 text-[9px] opacity-70">⌘↵</kbd>
      </button>
      {card.lifecycle_status === "Draft" && (
        <button data-testid="propose-card-btn" disabled={busy} onClick={() => transition("propose", "Card proposed")} className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
          <Send size={13} /> Propose
        </button>
      )}
      {card.validation_status === "Valid" && card.lifecycle_status !== "Approved" && card.lifecycle_status !== "Exported" && (
        <button data-testid="approve-card-btn" disabled={busy} onClick={() => transition("approve", "Card approved")} className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors" style={{ borderColor: "rgba(139,92,246,0.4)", color: "#a78bfa" }}>
          <CheckCircle2 size={13} /> Approve
        </button>
      )}
      {(card.lifecycle_status === "Approved" || card.lifecycle_status === "Exported") && (
        <button data-testid="open-export-btn" disabled={busy} onClick={() => setExportOpen(true)} className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors" style={{ borderColor: "rgba(6,182,212,0.4)", color: "var(--cyan)" }}>
          <Rocket size={13} /> Export
        </button>
      )}
      {card.lifecycle_status !== "Draft" && (
        <button data-testid="revert-draft-btn" disabled={busy} onClick={() => transition("revert_draft", "Reverted to draft")} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}>
          <RotateCcw size={12} /> Draft
        </button>
      )}
      <button data-testid="delete-card-btn" disabled={busy} onClick={del} className="ml-auto flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors" style={{ borderColor: "var(--border-subtle)", color: "var(--red)" }}>
        <Trash2 size={13} />
      </button>
    </div>
  );

  const badges = (
    <div className="flex flex-wrap items-center gap-1.5">
      <ValidationBadge status={card.validation_status} testid="inspector-validation-badge" />
      <LifecycleBadge status={card.lifecycle_status} testid="inspector-lifecycle-badge" />
      <BalanceBadge status={card.balance_status} testid="inspector-balance-badge" />
      {card.ai_generated && <Pill toneName="violet" glyph={<Sparkles size={9} />}>AI proposal</Pill>}
    </div>
  );

  if (wide) {
    return (
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4 xl:col-span-3">
          <div className="sticky top-0 space-y-4">
            <CardLivePreview card={preview} />
          </div>
        </div>
        <div className="col-span-5 xl:col-span-5">
          {badges}
          <div className="mt-3">{editorFields}</div>
          <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border-subtle)" }}>{actions}</div>
        </div>
        <div className="col-span-3 xl:col-span-4">{analysis}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-5 py-3" style={{ borderColor: "var(--border-subtle)" }}>{badges}</div>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <CardLivePreview card={preview} />
        {editorFields}
        {analysis}
      </div>
      <div className="border-t px-5 py-3" style={{ borderColor: "var(--border-subtle)", background: "var(--panel)" }}>{actions}</div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, toneName }) {
  const t = tone(toneName || "slate");
  return (
    <div className="rounded-md border p-2.5" style={{ background: "var(--panel-2)", borderColor: "var(--border-subtle)" }}>
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase" style={{ color: "var(--text-muted)" }}>
        <Icon size={11} /> {label}
      </div>
      <div className="mt-1 font-mono text-lg font-bold tabular" style={{ color: t.text }}>{value}</div>
      {sub && <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

function Analysis({ card, relations, versions }) {
  const expected = card.cost * 2.4 + 1;
  const dev = (card.power_score - expected).toFixed(1);
  const wrt = winRateTone(card.win_rate);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={Zap} label="Power score" value={card.power_score} sub={`curve ${expected.toFixed(1)} (${dev > 0 ? "+" : ""}${dev})`} toneName={Math.abs(dev) > 4.5 ? "amber" : "violet"} />
        <Stat icon={Gauge} label="Complexity" value={card.complexity_score} toneName="cyan" />
        <Stat icon={Swords} label="Win rate" value={card.win_rate != null ? `${card.win_rate}%` : "—"} sub={card.sample_size ? `n=${card.sample_size}` : "not simulated"} toneName={wrt} />
        <Stat icon={CheckCircle2} label="Validation" value={card.validation_status === "Valid" ? "OK" : `${card.validation_errors.length}E/${card.validation_warnings.length}W`} toneName={card.validation_status === "Valid" ? "green" : card.validation_status === "Invalid" ? "red" : "amber"} />
      </div>

      {(card.validation_errors.length > 0 || card.validation_warnings.length > 0) ? (
        <div className="space-y-1.5">
          {card.validation_errors.map((e, i) => (
            <div key={`e${i}`} className="flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[11px]" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#fca5a5" }}>
              <XCircle size={13} className="mt-0.5 shrink-0" /> {e}
            </div>
          ))}
          {card.validation_warnings.map((w, i) => (
            <div key={`w${i}`} className="flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[11px]" style={{ borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)", color: "#fcd34d" }}>
              <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px]" style={{ borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)", color: "#6ee7b7" }}>
          <CheckCircle2 size={13} /> No validation issues.
        </div>
      )}

      {relations && (
        <div className="space-y-3">
          <RelGroup icon={Link2} title="Synergies" color="#6ee7b7" items={relations.synergies} empty="No known synergies" />
          <RelGroup icon={Swords} title="Counters" color="#fca5a5" items={relations.counters} empty="No known counters" />
          <RelGroup icon={Link2} title="Related cards" color="var(--text-secondary)" items={relations.related} empty="No related cards" />
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-mono uppercase" style={{ color: "var(--text-muted)" }}>
          <GitBranch size={11} /> Simulation history
        </div>
        {versions.length ? (
          <div className="space-y-1">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded border px-2.5 py-1.5 text-[11px] font-mono" style={{ borderColor: "var(--border-subtle)", background: "var(--panel-2)" }}>
                <span style={{ color: "var(--text-secondary)" }}>v{v.version}</span>
                <span style={{ color: tone(winRateTone(v.win_rate)).text }}>{v.win_rate}%</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Not yet simulated.</div>
        )}
      </div>
    </div>
  );
}

function RelGroup({ icon: Icon, title, color, items, empty }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-mono uppercase" style={{ color: "var(--text-muted)" }}>
        <Icon size={11} /> {title} {items?.length ? `(${items.length})` : ""}
      </div>
      {items?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it) => (
            <span key={it.id} title={it.reason || ""} className="rounded px-1.5 py-0.5 text-[11px] font-mono" style={{ background: "var(--panel-2)", border: "1px solid var(--border-subtle)", color }}>
              {it.name}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{empty}</div>
      )}
    </div>
  );
}
