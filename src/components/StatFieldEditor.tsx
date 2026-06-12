"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";

export default function StatFieldEditor({
  fields,
  onChange,
  isAvg,
}: {
  fields: string[];
  onChange: (next: string[]) => void;
  isAvg?: boolean; // kept for API compat, no longer changes rendering
}) {
  const [input, setInput] = useState("");

  function add() {
    const v = input.trim();
    if (!v || fields.includes(v)) return;
    onChange([...fields, v]);
    setInput("");
  }

  function remove(f: string) {
    onChange(fields.filter(x => x !== f));
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); add(); }
  }

  return (
    <div className="space-y-2">
      {fields.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {fields.map((f) => (
            <span key={f}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border bg-gray-800 border-gray-700 text-gray-200">
              {f}
              <button type="button" onClick={() => remove(f)}
                className="ml-0.5 text-gray-500 hover:text-red-400 transition-colors leading-none">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Feldname eingeben…"
          className="flex-1 text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:border-rose-500 outline-none"
        />
        <button type="button" onClick={add} disabled={!input.trim()}
          className="flex items-center gap-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded-lg px-3 py-2 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Hinzufügen
        </button>
      </div>
      {isAvg && fields.length > 0 && (
        <p className="text-[11px] text-blue-400/80">
          Alle Felder werden pro Runde gemittelt und zu einem Gesamtdurchschnitt zusammengerechnet — der beste Wert gewinnt.
        </p>
      )}
      {fields.length === 0 && (
        <p className="text-[11px] text-gray-600">Noch keine Felder — gib mindestens einen Wert ein (z.B. Kills).</p>
      )}
    </div>
  );
}
