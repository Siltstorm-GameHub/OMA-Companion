"use client";
import { MonitorSmartphone } from "lucide-react";
import MancaveDesktopScene from "./MancaveDesktopScene";
import MancaveMobileApp from "./MancaveMobileApp";
import type { MancaveData } from "./mancave-data";

/**
 * Splittet rein per CSS zwischen Ego-Perspektive (Desktop) und
 * Smartphone-in-Hand-Dashboard (Mobile) — kein JS-Viewport-Sniffing, damit
 * es ohne Hydration-Flackern sofort im richtigen Layout ankommt (gleiches
 * Muster wie FloatingPill/BottomNav im Dashboard-Layout).
 */
export default function MancaveClient({ data }: { data: MancaveData }) {
  return (
    <div className="p-5 sm:p-6 max-w-6xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 px-1">
        <MonitorSmartphone className="w-4 h-4 text-teal-400" />
        <h1 className="text-sm font-semibold text-white">Mancave</h1>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-purple-300 bg-purple-500/10 border border-purple-500/20">
          Admin-Vorschau
        </span>
      </div>

      <div className="hidden lg:block">
        <MancaveDesktopScene data={data} />
      </div>
      <div className="lg:hidden">
        <MancaveMobileApp data={data} />
      </div>
    </div>
  );
}
