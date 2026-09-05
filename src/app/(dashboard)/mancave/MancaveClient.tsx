"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import MancaveScene3D from "./MancaveScene3D";
import type { MancaveData } from "./mancave-data";

/**
 * Mobile hat keine eigene Mancave-App mehr (siehe Teil B des Umbau-Plans) —
 * Statistik/Pokale/Ausbau/Jobs sind inhaltlich in die Profil-Reiter
 * gewandert. Wer `/mancave` trotzdem direkt aufruft (Lesezeichen, alter
 * Link), landet automatisch auf `/profile`.
 */
function MobileRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/profile"); }, [router]);
  return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
    </div>
  );
}

/**
 * Splittet rein per CSS zwischen Ego-Perspektive (Desktop) und der
 * automatischen Weiterleitung (Mobile) — kein JS-Viewport-Sniffing, damit es
 * ohne Hydration-Flackern sofort im richtigen Layout ankommt (gleiches
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
      <div className="lg:hidden h-full">
        <MobileRedirect />
      </div>
    </div>
  );
}
