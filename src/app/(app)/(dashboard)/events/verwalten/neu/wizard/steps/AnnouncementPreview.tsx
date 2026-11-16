"use client";
import { useEffect, useState } from "react";
import { fromDatetimeLocalBerlin } from "@/lib/time";
import type { EventWizard } from "../useEventWizard";

type Preview = { title: string; description: string; fields: { name: string; value: string }[] };

/**
 * Vorschau der Discord-Ankündigung in der Zusammenfassung — vom Server mit exakt demselben Aufbau
 * (inkl. Benachrichtigungs-Vorlage) erzeugt wie die echte Nachricht, siehe buildNewEventEmbed().
 */
export default function AnnouncementPreview({ w }: { w: EventWizard }) {
  const { title, game, genre, startAt, maxPlayers, participationCoins, publishMode, eventType, format, seriesFixedFormat, playHomeAway } = w;
  const [preview, setPreview] = useState<Preview | null>(null);
  const [failed, setFailed] = useState(false);
  const effectiveFormat = eventType !== "tournament" ? null
    : !seriesFixedFormat && format === "round_robin" && playHomeAway ? "liga" : (seriesFixedFormat ?? format);

  useEffect(() => {
    if (!title.trim() || !startAt) return;
    let cancelled = false;
    fetch("/api/admin/events/announcement-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(), game, genre, format: effectiveFormat, maxPlayers,
        startAt: fromDatetimeLocalBerlin(startAt).toISOString(), participationCoins,
      }),
    })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: Preview) => { if (!cancelled) { setPreview(data); setFailed(false); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [title, game, genre, effectiveFormat, maxPlayers, startAt, participationCoins]);

  return (
    <div className="rounded-xl border border-indigo-500/25 bg-[#2b2d31] p-4 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
        Vorschau Discord-Ankündigung
        {publishMode === "hidden" && " · wird erst beim Sichtbarschalten gesendet"}
        {publishMode === "scheduled" && " · wird zum geplanten Zeitpunkt gesendet"}
      </p>
      {failed && <p className="text-xs text-gray-500">Vorschau gerade nicht verfügbar.</p>}
      {!failed && !preview && <p className="text-xs text-gray-500">Vorschau wird geladen…</p>}
      {preview && (
        <div className="border-l-4 border-teal-500 pl-3 space-y-2">
          <p className="text-sm font-semibold text-white">{preview.title}</p>
          <p className="text-xs text-gray-300 whitespace-pre-line">{preview.description}</p>
          <div className="grid grid-cols-2 gap-2">
            {preview.fields.map(f => (
              <div key={f.name}>
                <p className="text-[11px] font-semibold text-gray-200">{f.name}</p>
                <p className="text-[11px] text-gray-400">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
