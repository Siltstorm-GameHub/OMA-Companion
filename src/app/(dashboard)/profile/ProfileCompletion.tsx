"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, ChevronDown } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { PROFILE_COMPLETION_ITEMS } from "@/lib/profile-completion";

const STORAGE_KEY = "profile-completion-collapsed";

interface Props {
  done: {
    bio: boolean;
    birthday: boolean;
    banner: boolean;
    twitch: boolean;
    favoriteGames: boolean;
  };
  rewardPerItem: number;
}

function openSection(sectionId: string, openEvent: string) {
  window.dispatchEvent(new Event(openEvent));
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export default function ProfileCompletion({ done, rewardPerItem }: Props) {
  const items = PROFILE_COMPLETION_ITEMS.map((item) => ({ ...item, done: done[item.key] }));
  const doneCount = items.filter((i) => i.done).length;

  // Merkt sich pro Browser, ob der User die Karte eingeklappt hat, damit sie
  // beim nächsten Profilbesuch nicht erneut viel Platz einnimmt.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Privater Modus o.ä. — einfach ausgeklappt lassen
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  }

  if (doneCount === items.length) return null;

  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <div className="glass card-shine relative overflow-hidden rounded-2xl animate-slide-up">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/8 via-transparent to-transparent pointer-events-none" />

      <button
        onClick={toggle}
        aria-expanded={!collapsed}
        className="relative w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-white">Profil vervollständigen</h2>
          {!collapsed && (
            <p className="text-xs text-gray-500 mt-0.5">Für jeden erledigten Punkt gibt's {rewardPerItem} Münzen</p>
          )}
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs text-teal-400 font-semibold tabular-nums">{doneCount}/{items.length}</span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
        </div>
      </button>

      {!collapsed && (
        <div className="relative px-5 pb-5">
          <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, #14b8a6, #2dd4bf)", boxShadow: "0 0 6px rgba(20,184,166,0.6)" }}
            />
          </div>

          <div className="space-y-1">
            {items.map((item) => (
              <button
                key={item.key}
                onClick={() => !item.done && openSection(item.sectionId, item.openEvent)}
                disabled={item.done}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors ${
                  item.done ? "cursor-default" : "hover:bg-white/[0.04] cursor-pointer"
                }`}
              >
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-600 shrink-0" />
                )}
                <span className={`flex-1 text-sm ${item.done ? "text-gray-500 line-through" : "text-gray-200"}`}>
                  {item.label}
                </span>
                {!item.done && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 shrink-0">
                    <CoinIcon size={11} /> +{rewardPerItem}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
