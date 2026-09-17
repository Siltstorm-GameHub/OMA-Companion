"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";

// ============================================
// MobaInputBox — Text-Eingabefeld im MOBA-Kit-Stil
// ============================================
// Quelle: Assets/UI/MOBA Style/PNG/INPUT/INPUT BOX, kopiert nach
// public/battle-cards/moba/input-box/. Ersetzt die bisherige generische
// bg-black/20+border-Kombination bei den drei Battle-Cards-Textfeldern
// (Nutzersuche in ChallengeUserPicker/GemsChallengeUserPicker, Namensfeld in
// MyCardEditor) — box1-normal/-highlighted werden je nach Fokus-Zustand
// gecrossfadet, exakt das gleiche Muster wie bei MOBA_ICON-Bild-Buttons.
export default function MobaInputBox({
  icon,
  className = "",
  onFocus,
  onBlur,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative">
      <img
        src="/battle-cards/moba/input-box/box1-normal.png"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full transition-opacity"
        style={{ objectFit: "fill", opacity: focused ? 0 : 1 }}
      />
      <img
        src="/battle-cards/moba/input-box/box1-highlighted.png"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full transition-opacity"
        style={{ objectFit: "fill", opacity: focused ? 1 : 0 }}
      />
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10 opacity-50 flex items-center">{icon}</span>}
      <input
        {...props}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        className={`relative z-10 bg-transparent text-white text-sm placeholder:text-slate-500 focus:outline-none ${icon ? "pl-9" : ""} ${className}`}
      />
    </div>
  );
}
