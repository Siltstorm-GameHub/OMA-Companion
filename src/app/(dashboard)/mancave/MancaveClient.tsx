"use client";
import MancaveScene3D from "./MancaveScene3D";
import MancaveMobileApp from "./MancaveMobileApp";
import type { MancaveData } from "./mancave-data";

/**
 * Splittet rein per CSS zwischen Ego-Perspektive (Desktop) und
 * Smartphone-in-Hand-Dashboard (Mobile) — kein JS-Viewport-Sniffing, damit
 * es ohne Hydration-Flackern sofort im richtigen Layout ankommt (gleiches
 * Muster wie FloatingPill/BottomNav im Dashboard-Layout).
 *
 * Läuft (anders als der Rest des Dashboards) im Vollbild ohne Kachel-Padding —
 * das umgebende Layout (siehe (dashboard)/layout.tsx, isMancave-Zweig) gibt
 * <main> dafür bereits volle Höhe/Breite ohne Ticker/Footer.
 */
export default function MancaveClient({ data }: { data: MancaveData }) {
  return (
    <div className="h-full animate-fade-in">
      <div className="hidden lg:block h-full">
        <MancaveScene3D data={data} />
      </div>
      <div className="lg:hidden h-full overflow-y-auto px-5 py-4">
        <MancaveMobileApp data={data} />
      </div>
    </div>
  );
}
