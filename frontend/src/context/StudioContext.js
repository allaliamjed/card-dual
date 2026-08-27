import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

const StudioContext = createContext(null);
export const useStudio = () => useContext(StudioContext);

export function StudioProvider({ children }) {
  const [section, setSection] = useState("library");
  const [project, setProject] = useState(null);
  const [meta, setMeta] = useState(null);
  const [cards, setCards] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [backendUp, setBackendUp] = useState(true);
  const [saveState, setSaveState] = useState(null);

  const refreshProject = useCallback(async () => {
    try { setProject(await api.project()); setBackendUp(true); }
    catch { setBackendUp(false); }
  }, []);

  const refreshCards = useCallback(async () => {
    try { setCards(await api.listCards()); setBackendUp(true); }
    catch { setBackendUp(false); }
  }, []);

  const refreshLogs = useCallback(async () => {
    try { setLogs(await api.logs()); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    (async () => {
      try { setMeta(await api.meta()); } catch { setBackendUp(false); }
    })();
    refreshProject();
    refreshCards();
    refreshLogs();
  }, [refreshProject, refreshCards, refreshLogs]);

  // poll logs while on the log section
  useEffect(() => {
    if (section !== "log") return;
    const t = setInterval(refreshLogs, 2500);
    return () => clearInterval(t);
  }, [section, refreshLogs]);

  const openCard = useCallback((id) => {
    setSelectedId(id);
    setInspectorOpen(true);
  }, []);

  const closeInspector = useCallback(() => setInspectorOpen(false), []);

  const afterMutation = useCallback(async () => {
    await Promise.all([refreshCards(), refreshLogs(), refreshProject()]);
  }, [refreshCards, refreshLogs, refreshProject]);

  const value = {
    section, setSection,
    project, meta, cards, logs, backendUp,
    selectedId, setSelectedId, inspectorOpen, setInspectorOpen,
    paletteOpen, setPaletteOpen, exportOpen, setExportOpen,
    saveState, setSaveState,
    openCard, closeInspector,
    refreshProject, refreshCards, refreshLogs, afterMutation,
  };
  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}
