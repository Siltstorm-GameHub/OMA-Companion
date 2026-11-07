"use client";

import { useState, type InputHTMLAttributes } from "react";

export type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Drop-in Ersatz für `<input type="number">`.
 *
 * Problem bei normalen Number-Inputs mit numerischem State: Leert man das Feld,
 * macht `Number("")` daraus sofort eine 0 (bzw. den Mindestwert) und das Feld
 * springt zurück, bevor man die neue Zahl tippen kann.
 *
 * Ist `value` eine Zahl, darf das Feld hier während der Eingabe leer bleiben:
 * Der leere Zustand wird NICHT an `onChange` weitergereicht. Sobald eine Zahl
 * getippt wird, geht sie normal raus. Verlässt man das Feld leer, wird wieder
 * der bisherige Wert angezeigt. String-Werte (optionale Felder) werden
 * unverändert durchgereicht.
 */
export function NumberInput({ value, onChange, onBlur, ...rest }: NumberInputProps) {
  const numeric = typeof value === "number";
  const [empty, setEmpty] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  // Wert wurde von außen geändert (z.B. Reset) → leeren Zwischenzustand verwerfen
  if (value !== prevValue) {
    setPrevValue(value);
    if (empty) setEmpty(false);
  }

  return (
    <input
      {...rest}
      type="number"
      value={numeric && empty ? "" : value}
      onChange={e => {
        if (numeric && e.target.value === "") {
          setEmpty(true);
          return;
        }
        setEmpty(false);
        onChange?.(e);
      }}
      onBlur={e => {
        if (empty) setEmpty(false);
        onBlur?.(e);
      }}
    />
  );
}
