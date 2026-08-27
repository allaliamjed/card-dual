import React from "react";
import { useStudio } from "@/context/StudioContext";
import { Search, ChevronRight, Wifi, WifiOff } from "lucide-react";

const TITLES = {
  library: "Card Library",
  editor: "Card Editor",
  simulation: "Simulation Center",
  balance: "Balance Dashboard",
  log: "Execution Log",
};

export function ContextBar({ saveState }) {
  const { section, project, setPaletteOpen, backendUp } = useStudio();
  return (
    <header
      data-testid="context-bar"
      className="flex h-12 shrink-0 items-center justify-between border-b px-5"
      style={{ background: "var(--panel)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>{project?.project || "Card Dual"}</span>
        <ChevronRight size={13} style={{ color: "var(--text-muted)" }} />
        <span className="font-medium tracking-tight">{TITLES[section]}</span>
      </div>

      <div className="flex items-center gap-3">
        {saveState && (
          <span data-testid="save-indicator" className="text-[11px] font-mono transition-opacity" style={{ color: saveState.color }}>
            {saveState.label}
          </span>
        )}
        <button
          data-testid="context-search-btn"
          onClick={() => setPaletteOpen(true)}
          className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:brightness-110"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)", background: "var(--panel-2)" }}
        >
          <Search size={13} /> <span className="hidden sm:inline">Search</span>
          <kbd className="rounded border px-1 text-[10px] font-mono" style={{ borderColor: "var(--border-medium)" }}>⌘K</kbd>
        </button>
        <div
          className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-mono"
          style={{ borderColor: "var(--border-subtle)", color: backendUp ? "var(--green)" : "var(--red)" }}
          title={backendUp ? "Engine connected" : "Engine unavailable"}
        >
          {backendUp ? <Wifi size={12} /> : <WifiOff size={12} />}
          {backendUp ? "engine" : "offline"}
        </div>
      </div>
    </header>
  );
}
