import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStudio } from "@/context/StudioContext";
import { CardEditor } from "./CardEditor";
import { X, Maximize2 } from "lucide-react";

export function CardInspector() {
  const { inspectorOpen, selectedId, closeInspector, setSection } = useStudio();

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape" && inspectorOpen) closeInspector(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [inspectorOpen, closeInspector]);

  return (
    <AnimatePresence>
      {inspectorOpen && selectedId && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeInspector}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(3,4,8,0.5)" }}
          />
          <motion.div
            key="panel"
            data-testid="card-inspector"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="fixed right-0 top-0 z-50 flex h-full w-[440px] flex-col border-l"
            style={{ background: "var(--panel)", borderColor: "var(--border-subtle)", boxShadow: "-20px 0 40px rgba(0,0,0,0.4)" }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <span className="text-xs font-mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Card Inspector</span>
              <div className="flex items-center gap-1">
                <button data-testid="inspector-expand-btn" onClick={() => { setSection("editor"); closeInspector(); }} className="rounded p-1 transition-colors hover:bg-[var(--panel-hover)]" style={{ color: "var(--text-muted)" }} title="Open in editor">
                  <Maximize2 size={14} />
                </button>
                <button data-testid="inspector-close-btn" onClick={closeInspector} className="rounded p-1 transition-colors hover:bg-[var(--panel-hover)]" style={{ color: "var(--text-muted)" }} title="Close (Esc)">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <CardEditor cardId={selectedId} layout="slideover" onClose={closeInspector} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
