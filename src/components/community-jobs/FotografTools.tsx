"use client";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatBerlinDate } from "@/lib/time";

/** Fotografen-Büro: offene Bildwünsche der Journalisten — "Bild hochladen" öffnet das Upload-Formular mit Verknüpfung zum Wunsch. */

interface OpenRequest {
  id: string; description: string; createdAt: string; eventId: string | null; eventTitle: string | null;
  requester: { id: string; username: string | null; name: string | null };
}

export function PhotoRequestList({ onFulfill }: { onFulfill: (request: { id: string; eventId: string | null; description: string }) => void }) {
  const [items, setItems] = useState<OpenRequest[] | null>(null);

  useEffect(() => {
    fetch("/api/community-jobs/photo-requests?scope=open").then(r => (r.ok ? r.json() : { requests: [] }))
      .then((d: { requests: OpenRequest[] }) => setItems(d.requests)).catch(() => setItems([]));
  }, []);

  if (!items) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
        <Camera className="w-3 h-3" /> Bildwünsche von Journalisten{items.length > 0 ? ` (${items.length})` : ""}
      </p>
      {items.length === 0 && <p className="text-[11px] text-gray-600">Aktuell keine offenen Wünsche.</p>}
      {items.map(r => (
        <div key={r.id} className="rounded-lg bg-amber-500/[0.05] border border-amber-500/20 p-2.5 flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs text-gray-200">{r.description}</p>
            <p className="text-[10px] text-gray-600">
              von {r.requester.username ?? r.requester.name}{r.eventTitle ? ` · ${r.eventTitle}` : ""} · {formatBerlinDate(r.createdAt)}
            </p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => onFulfill({ id: r.id, eventId: r.eventId, description: r.description })}>Bild hochladen</Button>
        </div>
      ))}
    </div>
  );
}
