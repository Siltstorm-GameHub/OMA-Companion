"use client";
// OMA Blocks — Controller-Belegung frei einstellen (pro Gerät, siehe settings.ts / gamepad.ts)
//
// Klick auf "+" → nächste gedrückte Controller-Taste (oder Stick-Richtung) wird belegt. Esc oder erneuter
// Klick bricht ab. Während der Belegung bekommt das Spiel keine Controller-Eingaben.

import { useEffect, useState } from "react";
import {
  BINDABLE_ACTIONS, BINDABLE_LABELS, MAX_BUTTONS_PER_ACTION, defaultPadBindings, isBindableButton,
  type BindableAction, type PadBindings,
} from "./settings";
import { bindButton, buttonName, subscribePadButtons, unbindButton, useGamepadName } from "./gamepad";

export default function GamepadBindingsEditor({ bindings, onChange }: { bindings: PadBindings; onChange: (b: PadBindings) => void }) {
  const [capturing, setCapturing] = useState<BindableAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const padName = useGamepadName();

  useEffect(() => {
    if (!capturing) return;
    const unsubscribe = subscribePadButtons((pressed) => {
      const b = pressed.find(isBindableButton);
      if (b === undefined) return;
      const { bindings: next, takenFrom } = bindButton(bindings, capturing, b);
      setNotice(takenFrom ? `${buttonName(b)} war bei „${BINDABLE_LABELS[takenFrom]}“ belegt und wurde dort entfernt.` : null);
      onChange(next);
      setCapturing(null);
    }, true);
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setCapturing(null);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      unsubscribe();
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [capturing, bindings, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Controller-Tasten</p>
        <button
          type="button"
          onClick={() => {
            onChange(defaultPadBindings());
            setNotice("Standardbelegung wiederhergestellt.");
            setCapturing(null);
          }}
          className="text-[11px] font-semibold text-gray-400 hover:text-white"
        >
          Standard wiederherstellen
        </button>
      </div>

      <p className={`text-[11px] ${padName ? "text-teal-300" : "text-gray-500"}`}>
        {padName ? `Verbunden: ${padName}` : "Kein Controller erkannt — verbinden und eine Taste drücken."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {BINDABLE_ACTIONS.map((a) => {
          const buttons = bindings[a];
          const isCapturing = capturing === a;
          return (
            <div key={a} className="flex items-center justify-between gap-2 min-h-8">
              <span className="text-xs text-gray-400 shrink-0">{BINDABLE_LABELS[a]}</span>
              <span className="flex flex-wrap justify-end gap-1">
                {buttons.map((b) => (
                  <span key={b} className="inline-flex items-center gap-1 rounded-md bg-white/[0.07] border border-white/10 pl-2 pr-1 py-0.5 text-[11px] font-semibold text-white">
                    {buttonName(b)}
                    <button
                      type="button"
                      aria-label={`${buttonName(b)} von ${BINDABLE_LABELS[a]} entfernen`}
                      onClick={() => onChange(unbindButton(bindings, a, b))}
                      className="text-gray-500 hover:text-red-300 px-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {isCapturing ? (
                  <button
                    type="button"
                    onClick={() => setCapturing(null)}
                    className="rounded-md border border-teal-400/60 bg-teal-500/15 px-2 py-0.5 text-[11px] font-semibold text-teal-200 animate-pulse"
                  >
                    Controller-Taste drücken … (Esc)
                  </button>
                ) : (
                  buttons.length < MAX_BUTTONS_PER_ACTION && (
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
      <p className="text-[11px] text-gray-500">
        Tastennamen nach Xbox / PlayStation-Layout · Start pausiert bzw. startet eine Solo-Runde · in Menüs: Steuerkreuz wählt, A bestätigt, B schließt · gespeichert auf diesem Gerät.
      </p>
    </div>
  );
}
