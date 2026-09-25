"use client";

// ============================================
// OMA Quest — Prototyp: Figur gestalten + durch das Dorf laufen
// ============================================
// Der gestaltete Charakter liegt nur im Browser (localStorage) — der Prototyp schreibt noch nichts
// in die Datenbank. Die Quest ist lokal, nicht mit dem Quest-System der App verbunden.

import { useEffect, useState } from "react";
import TeCharacterEditor from "@/components/te-character/TeCharacterEditor";
import TeMapGame from "./TeMapGame";
import { defaultTeConfig, sanitizeTeConfig, type TeCharacterConfig } from "@/lib/te-character";

const STORAGE_KEY = "oma-quest-te-character-v1";

export default function TeQuestPrototype() {
  const [config, setConfig] = useState<TeCharacterConfig>(defaultTeConfig);
  const [tab, setTab] = useState<"map" | "editor">("editor");
  const [loaded, setLoaded] = useState(false);

  // Gespeicherten Charakter laden. Nur ein leerer Speicher bleibt beim Standard-Charakter
  // (und startet im Editor), sonst geht es direkt ins Dorf.
  useEffect(() => {
    // localStorage gibt es erst nach dem Hydrieren — das Nachladen hier ist der übliche Weg, ohne Hydration-Fehler.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = raw ? sanitizeTeConfig(JSON.parse(raw)) : null;
      if (saved) { setConfig(saved); setTab("map"); }
    } catch { /* Speicher gesperrt oder kaputt: Standard-Charakter */ }
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function update(next: TeCharacterConfig) {
    setConfig(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* nicht schlimm */ }
  }

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-full bg-black/30 p-0.5 gap-0.5" role="tablist" aria-label="Ansicht">
        {([["editor", "Figur gestalten"], ["map", "Dorf Krähbach"]] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${tab === id ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "editor" ? (
        <TeCharacterEditor value={config} onChange={update} />
      ) : (
        <TeMapGame character={config} />
      )}
    </div>
  );
}
