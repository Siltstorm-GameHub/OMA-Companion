"use client";

// ============================================
// OMA Quest — Reisebüro: Schnellreise gegen Gold (statt Wartezeit), erst nach der Hauptstory freigeschaltet
// ============================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotice, type Notify } from "@/components/te-map/play/GameFeed";
import { Gold } from "@/components/te-map/play/Currency";

interface Destination { slug: string; name: string; cost: number; minutes: number }
interface State { unlocked: boolean; gold?: number; destinations?: Destination[]; inTransit?: boolean }

export default function FastTravelPanel({ notify }: { notify?: Notify }) {
  const { notify: say, node } = useNotice(notify);
  const router = useRouter();
  const [data, setData] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dnd/character/travel/fast")
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(json.error ?? "Konnte nicht geladen werden."); return; }
        setData(json);
      })
      .catch(() => { if (!cancelled) setError("Netzwerkfehler."); });
    return () => { cancelled = true; };
  }, []);

  const travel = async (slug: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/dnd/character/travel/fast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { say("error", json.error ?? "Fehlgeschlagen."); return; }
      router.push(`/oma-quest/${slug}`);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="text-xs text-gray-500">{error}</p>;
  if (!data) return null;

  if (!data.unlocked) {
    return (
      <div className="oq-panel p-4 space-y-2">
        <p className="oq-title">🧭 Reisebüro</p>
        <p className="text-xs text-gray-400">„Schnellreise gibt es erst, wenn du die ganze Hauptgeschichte durch hast. Geschäft ist Geschäft.“</p>
      </div>
    );
  }

  return (
    <div className="oq-panel p-4 space-y-3">
      <div className="flex items-center gap-2">
        <p className="oq-title">🧭 Schnellreise</p>
        <Gold n={data.gold ?? 0} className="ml-auto text-xs font-bold" />
      </div>
      {node}
      {data.inTransit ? (
        <p className="text-xs text-amber-300">Du bist schon unterwegs — erst ankommen, dann geht&apos;s schneller weiter.</p>
      ) : !data.destinations?.length ? (
        <p className="text-xs text-gray-500">Keine Ziele von hier aus erreichbar.</p>
      ) : (
        <ul className="space-y-1.5">
          {data.destinations.map((d) => (
            <li key={d.slug} className="flex items-center gap-2 text-xs text-white">
              <span className="min-w-0 flex-1"><b>{d.name}</b> <span className="text-gray-500">· statt {d.minutes} Min.</span></span>
              <button type="button" disabled={busy || (data.gold ?? 0) < d.cost} onClick={() => void travel(d.slug)} className="oq-btn oq-btn-gold text-xs px-3 py-1.5 shrink-0 disabled:opacity-50">
                <Gold n={d.cost} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
