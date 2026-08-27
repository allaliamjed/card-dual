import React from "react";
import { useStudio } from "@/context/StudioContext";
import { CardEditor } from "./CardEditor";
import { PenSquare } from "lucide-react";

export function EditorPage() {
  const { selectedId, cards, setSelectedId } = useStudio();

  if (!selectedId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border" style={{ borderColor: "var(--border-medium)", background: "var(--panel)" }}>
          <PenSquare size={22} style={{ color: "var(--text-muted)" }} />
        </div>
        <div className="text-sm font-medium">Select a card to edit</div>
        <div className="max-w-sm text-center text-xs" style={{ color: "var(--text-muted)" }}>
          Choose a card from the library, or pick a recent one below. The editor gives you the full workspace with live preview and engine analysis.
        </div>
        <div className="flex max-w-lg flex-wrap justify-center gap-2">
          {cards.slice(0, 8).map((c) => (
            <button key={c.id} data-testid={`editor-pick-${c.id}`} onClick={() => setSelectedId(c.id)}
              className="rounded-md border px-2.5 py-1 text-xs transition-colors hover:bg-[var(--panel-hover)]"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)", background: "var(--panel-2)" }}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <CardEditor key={selectedId} cardId={selectedId} layout="page" onClose={() => setSelectedId(null)} />
    </div>
  );
}
