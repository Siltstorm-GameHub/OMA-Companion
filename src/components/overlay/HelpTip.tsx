"use client";

import { useState } from "react";
import { HelpCircle } from "@/components/icons";

/** Kleines "?" neben einem Begriff — antippen blendet eine kurze Erklärung ein (auch am Handy). */
export default function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        aria-label="Erklärung"
        aria-expanded={open}
        title={text}
        className="text-gray-500 hover:text-teal-300 transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span className="absolute z-30 left-1/2 -translate-x-1/2 top-5 w-60 rounded-lg border border-white/10 bg-[#0c1118] px-3 py-2 text-xs font-normal normal-case tracking-normal text-gray-300 shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}
