"use client";

import { useState, useEffect } from "react";
import { Megaphone, X } from "lucide-react";

type Message = {
  id:      string;
  title:   string;
  content: string;
  endDate: string;
};

export function DailyMessageBanner({
  message,
  onVisibilityChange,
  fill = false,
}: {
  message: Message;
  onVisibilityChange?: (visible: boolean) => void;
  /** Streckt die Box auf 100% der Höhe des Elternelements und zentriert den Inhalt vertikal (z.B. im Banner-Slider). */
  fill?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(`daily-msg-dismissed-${message.id}`);
    if (!dismissed) setVisible(true);
  }, [message.id]);

  useEffect(() => {
    onVisibilityChange?.(visible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function dismiss() {
    localStorage.setItem(`daily-msg-dismissed-${message.id}`, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="flex gap-3 px-4 py-3.5 rounded-xl"
      style={{
        background: "linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(139,92,246,0.06) 100%)",
        border: "1px solid rgba(168,85,247,0.25)",
        boxShadow: "0 0 20px rgba(168,85,247,0.06)",
        ...(fill ? { height: "100%", boxSizing: "border-box" as const, alignItems: "center" } : {}),
      }}
    >
      {/* Icon */}
      <div className="shrink-0 mt-0.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.25)" }}>
          <Megaphone className="w-4 h-4 text-purple-400" />
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-purple-400/70 mb-0.5">
          Mitteilung
        </p>
        <p className="text-sm font-semibold text-white leading-snug">{message.title}</p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{message.content}</p>
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        className="shrink-0 self-start p-1 rounded-md text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
        aria-label="Schließen"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
