"use client";
import { useState } from "react";
import { Newspaper, ChevronDown, ChevronUp } from "lucide-react";

export default function EventSummarySection({ summary }: { summary: string }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="glass card-shine rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <Newspaper className="w-4 h-4 text-teal-400 shrink-0" />
        <span className="text-sm font-semibold text-white flex-1 text-left">Eventbericht</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-500" />
          : <ChevronDown className="w-4 h-4 text-gray-500" />
        }
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-sm text-gray-300 leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  );
}
