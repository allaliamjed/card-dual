import React from "react";
import { useStudio } from "@/context/StudioContext";
import {
  Library, PenSquare, FlaskConical, Scale, Terminal, Command, Layers,
} from "lucide-react";

const SECTIONS = [
  { id: "library", label: "Card Library", icon: Library, hint: "1" },
  { id: "editor", label: "Card Editor", icon: PenSquare, hint: "2" },
  { id: "simulation", label: "Simulation Center", icon: FlaskConical, hint: "3" },
  { id: "balance", label: "Balance Dashboard", icon: Scale, hint: "4" },
  { id: "log", label: "Execution Log", icon: Terminal, hint: "5" },
];

export function Sidebar() {
  const { section, setSection, project, setPaletteOpen } = useStudio();
  return (
    <aside
      data-testid="app-sidebar"
      className="flex h-full w-64 flex-col border-r"
      style={{ background: "var(--panel)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)" }}
        >
          <Layers size={16} className="text-white" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight">Card Dual Studio</div>
          <div className="truncate text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
            {project ? `${project.project} · v${project.version}` : "connecting…"}
          </div>
        </div>
      </div>

      <div className="mx-3 mb-2">
        <button
          data-testid="sidebar-command-btn"
          onClick={() => setPaletteOpen(true)}
          className="flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-xs transition-colors"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)", background: "var(--panel-2)" }}
        >
          <span className="flex items-center gap-2"><Command size={13} /> Search & commands</span>
          <kbd className="rounded border px-1 py-0.5 text-[10px] font-mono" style={{ borderColor: "var(--border-medium)" }}>⌘K</kbd>
        </button>
      </div>

      <nav className="flex-1 px-2 py-1">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <button
              key={s.id}
              data-testid={`nav-${s.id}`}
              onClick={() => setSection(s.id)}
              className="group relative mb-0.5 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors"
              style={{
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                background: active ? "var(--panel-hover)" : "transparent",
              }}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full" style={{ background: "var(--violet)" }} />
              )}
              <Icon size={15} strokeWidth={active ? 2.1 : 1.8} style={{ color: active ? "var(--violet)" : "var(--text-muted)" }} />
              <span className="flex-1 text-left font-medium">{s.label}</span>
              <kbd className="text-[10px] font-mono opacity-0 group-hover:opacity-60" style={{ color: "var(--text-muted)" }}>{s.hint}</kbd>
            </button>
          );
        })}
      </nav>

      <div className="border-t px-4 py-3 text-[10px] font-mono leading-relaxed" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}>
        <div className="flex items-center justify-between">
          <span>UI → Studio → Engine</span>
        </div>
        <div className="mt-1 opacity-70">Rules · Sim · Balance layer</div>
      </div>
    </aside>
  );
}
