"use client";
// OMA Blocks — Tastenbelegung frei einstellen (pro Gerät, siehe settings.ts)
//
// Klick auf "+" → nächste gedrückte Taste wird belegt. Esc bricht ab. Ist die Taste schon einer
// anderen Aktion zugeordnet, wird sie dort entfernt und ein Hinweis angezeigt.

import { useEffect, useState } from "react";
import {
  BINDABLE_ACTIONS, BINDABLE_LABELS, MAX_KEYS_PER_ACTION, bindKey, defaultKeyBindings, isBindableKey, keyName, unbindKey,
  type BindableAction, type KeyBindings,
} from "./settings";

export default function KeyBindingsEditor({ bindings, onChange }: { bindings: KeyBindings; onChange: (b: KeyBindings) => void }) {
  const [capturing, setCapturing] = useState<BindableAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      // Vor allen anderen Listenern (Spielfeld, Modal) abfangen.
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      if (e.code === "Escape") {
        setCapturing(null);
        return;
      }
      if (!isBindableKey(e.code)) {
        setNotice(`${keyName(e.code)} kann nicht belegt werden.`);
        return;
      }
      const { bindings: next, takenFrom } = bindKey(bindings, capturing, e.code);
      setNotice(takenFrom ? `${keyName(e.code)} war bei „${BINDABLE_LABELS[takenFrom]}“ belegt und wurde dort entfernt.` : null);
      onChange(next);
      setCapturing(null);
    };
    const swallowUp = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("keyup", swallowUp, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("keyup", swallowUp, { capture: true });
    };
  }, [capturing, bindings, onChange]);

  const empty = BINDABLE_ACTIONS.filter((a) => bindings[a].length === 0 && a !== "restart");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Tasten</p>
        <button
          type="button"
          onClick={() => {
            onChange(defaultKeyBindings());
            setNotice("Standardbelegung wiederhergestellt.");
            setCapturing(null);
          }}
          className="text-[11px] font-semibold text-gray-400 hover:text-white"
        >
          Standard wiederherstellen
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {BINDABLE_ACTIONS.map((a) => {
          const keys = bindings[a];
          const isCapturing = capturing === a;
          return (
            <div key={a} className="flex items-center justify-between gap-2 min-h-8">
              <span className="text-xs text-gray-400 shrink-0">{BINDABLE_LABELS[a]}</span>
              <span className="flex flex-wrap justify-end gap-1">
                {keys.map((k) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-md bg-white/[0.07] border border-white/10 pl-2 pr-1 py-0.5 text-[11px] font-semibold text-white">
                    {keyName(k)}
                    <button
                      type="button"
                      aria-label={`${keyName(k)} von ${BINDABLE_LABELS[a]} entfernen`}
                      onClick={() => onChange(unbindKey(bindings, a, k))}
                      className="text-gray-500 hover:text-red-300 px-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {isCapturing ? (
                  <span className="rounded-md border border-teal-400/60 bg-teal-500/15 px-2 py-0.5 text-[11px] font-semibold text-teal-200 animate-pulse">
                    Taste drücken … (Esc)
                  </span>
                ) : (
                  keys.length < MAX_KEYS_PER_ACTION && (
                    <button
                      type="button"
                      onClick={() => {
                        setNotice(null);
                        setCapturing(a);
                      }}
                      className="rounded-md border border-dashed border-white/15 px-2 py-0.5 text-[11px] font-semibold text-gray-400 hover:text-white hover:border-white/30"
                    >
                      + Taste
                    </button>
                  )
                )}
              </span>
            </div>
          );
        })}
      </div>

      {notice && <p className="text-[11px] text-amber-300">{notice}</p>}
      {empty.length > 0 && (
        <p className="text-[11px] text-red-300">Ohne Taste: {empty.map((a) => BINDABLE_LABELS[a]).join(", ")}</p>
      )}
      <p className="text-[11px] text-gray-500">
        Bis zu {MAX_KEYS_PER_ACTION} Tasten pro Aktion · gespeichert auf diesem Gerät · Pause und Neustart gelten nur im Solo-Modus.
      </p>
    </div>
  );
}
