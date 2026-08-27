import React, { useEffect, useMemo, useState } from "react";
import { useStudio } from "@/context/StudioContext";
import { api } from "@/lib/api";
import { CardGridItem } from "./CardGridItem";
import { Plus, SlidersHorizontal, X, Search, LayoutGrid } from "lucide-react";
import { toast } from "sonner";

const Select = ({ label, value, onChange, options, testid }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</label>
    <select
      data-testid={testid}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border px-2 py-1.5 text-xs outline-none"
      style={{ background: "var(--panel-2)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
    >
      <option value="">All</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export function CardLibrary() {
  const { meta, openCard, selectedId, inspectorOpen, cards: allCards, refreshCards, afterMutation, setSection } = useStudio();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ type: "", archetype: "", rarity: "", status: "", balance: "" });
  const [sort, setSort] = useState("name");
  const [showFilters, setShowFilters] = useState(true);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useMemo(() => async () => {
    setLoading(true);
    try {
      const data = await api.listCards({ search: search || undefined, ...cleanFilters(filters), sort });
      setCards(data);
    } catch { setCards([]); }
    setLoading(false);
  }, [search, filters, sort]);

  useEffect(() => {
    const t = setTimeout(load, 180);
    return () => clearTimeout(t);
  }, [load, allCards]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const createCard = async () => {
    const c = await api.createCard({ name: "Untitled Card", type: "Unit", archetype: "Neutral", rarity: "Common", cost: 1, power: 1 });
    await afterMutation();
    await load();
    openCard(c.id);
    setSection("editor");
    toast.success("Card created", { description: "New draft added to the library" });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            data-testid="card-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards, effects, tags…"
            className="w-full rounded-md border py-2 pl-9 pr-3 text-sm outline-none transition-colors"
            style={{ background: "var(--panel-2)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase" style={{ color: "var(--text-muted)" }}>Sort</span>
            <select
              data-testid="card-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-md border px-2 py-1.5 text-xs outline-none"
              style={{ background: "var(--panel-2)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              <option value="name">Name</option>
              <option value="power">Power score</option>
              <option value="win_rate">Win rate</option>
              <option value="modified">Last modified</option>
            </select>
          </div>
          <button
            data-testid="toggle-filters-btn"
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors"
            style={{ background: showFilters ? "var(--panel-hover)" : "var(--panel-2)", borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
          >
            <SlidersHorizontal size={13} /> Filters
            {activeFilterCount > 0 && <span className="rounded-full px-1.5 text-[10px] font-mono" style={{ background: "var(--violet)", color: "#fff" }}>{activeFilterCount}</span>}
          </button>
          <button
            data-testid="create-card-btn"
            onClick={createCard}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-transform hover:brightness-110 active:scale-[0.98]"
            style={{ background: "var(--violet)" }}
          >
            <Plus size={14} /> New Card
          </button>
        </div>
      </div>

      {showFilters && meta && (
        <div className="flex flex-wrap items-end gap-3 border-b px-6 py-3 fade-up" style={{ borderColor: "var(--border-subtle)", background: "var(--panel)" }}>
          <Select label="Type" testid="filter-type" value={filters.type} onChange={(v) => setFilters((f) => ({ ...f, type: v }))} options={meta.card_types} />
          <Select label="Archetype" testid="filter-archetype" value={filters.archetype} onChange={(v) => setFilters((f) => ({ ...f, archetype: v }))} options={meta.archetypes} />
          <Select label="Rarity" testid="filter-rarity" value={filters.rarity} onChange={(v) => setFilters((f) => ({ ...f, rarity: v }))} options={meta.rarities} />
          <Select label="Status" testid="filter-status" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} options={meta.lifecycle} />
          <Select label="Balance" testid="filter-balance" value={filters.balance} onChange={(v) => setFilters((f) => ({ ...f, balance: v }))} options={meta.balance} />
          {activeFilterCount > 0 && (
            <button data-testid="clear-filters-btn" onClick={() => setFilters({ type: "", archetype: "", rarity: "", status: "", balance: "" })}
              className="flex items-center gap-1 rounded-md border px-2 py-1.5 text-[11px]" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
              <X size={12} /> Clear
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-6 py-2 text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
        <span>{loading ? "Loading…" : `${cards.length} card${cards.length === 1 ? "" : "s"}`}</span>
        <span className="flex items-center gap-1"><LayoutGrid size={11} /> Library</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border-subtle)" }} />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <EmptyState onCreate={createCard} hasFilters={activeFilterCount > 0 || !!search} />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {cards.map((c) => (
              <CardGridItem key={c.id} card={c} active={inspectorOpen && selectedId === c.id} onClick={() => openCard(c.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreate, hasFilters }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border" style={{ borderColor: "var(--border-medium)", background: "var(--panel)" }}>
        <LayoutGrid size={22} style={{ color: "var(--text-muted)" }} />
      </div>
      <div className="text-sm font-medium">{hasFilters ? "No cards match your filters" : "No cards yet"}</div>
      <div className="max-w-xs text-xs" style={{ color: "var(--text-muted)" }}>
        {hasFilters ? "Adjust or clear your search and filters to see more cards." : "Create your first card to begin designing the Card Dual set."}
      </div>
      {!hasFilters && (
        <button onClick={onCreate} className="mt-1 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white" style={{ background: "var(--violet)" }}>
          <Plus size={14} /> New Card
        </button>
      )}
    </div>
  );
}

function cleanFilters(f) {
  const out = {};
  Object.entries(f).forEach(([k, v]) => { if (v) out[k] = v; });
  return out;
}
