"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CalendarDays, RefreshCw } from "@/components/icons";
import { PUBLISH_STEP_LABELS, parsePublishState } from "@/lib/event-publish-state";
import { formatBerlinDateTime, fromDatetimeLocalBerlin, toDatetimeLocalBerlin } from "@/lib/time";

/**
 * Veröffentlichungs-Status eines Events in der Bearbeitung:
 *  - unsichtbar: geplante Veröffentlichung ("veröffentlichen am …") setzen/entfernen
 *  - sichtbar: fehlgeschlagene Veröffentlichungs-Schritte (Discord/Push) anzeigen + erneut ausführen
 */
export default function PublishStatusPanel({
  eventId, hidden, publishAt, publishStateJson, startAt,
}: {
  eventId: string;
  hidden: boolean;
  publishAt: string | Date | null;
  publishStateJson: string | null;
  startAt: string | Date;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [planned, setPlanned] = useState(publishAt ? toDatetimeLocalBerlin(new Date(publishAt)) : "");
  const state = parsePublishState(publishStateJson);

  async function savePublishAt(value: string | null) {
    const at = value ? fromDatetimeLocalBerlin(value) : null;
    if (at && at >= new Date(startAt)) { toast.error("Die Veröffentlichung muss vor dem Event-Start liegen"); return; }
    if (at && at <= new Date()) { toast.error("Der Zeitpunkt liegt in der Vergangenheit — dann einfach sichtbar schalten"); return; }
    setBusy(true);
    const res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, publishAt: at ? at.toISOString() : null }),
    });
    setBusy(false);
    if (!res.ok) { const e = await res.json().catch(() => ({})); toast.error(e.error ?? "Fehler beim Speichern"); return; }
    toast.success(at ? "Veröffentlichung geplant" : "Planung entfernt");
    if (!at) setPlanned("");
    router.refresh();
  }

  async function retry() {
    setBusy(true);
    const res = await fetch(`/api/admin/events/${eventId}/publish`, { method: "POST" });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Fehler"); return; }
    if ((data.errors ?? []).length === 0) toast.success("Alle Schritte erfolgreich nachgeholt");
    else toast.error("Einige Schritte sind erneut fehlgeschlagen");
    router.refresh();
  }

  if (hidden) {
    return (
      <div className="rounded-control border border-primary/35 bg-primary-soft/60 px-4 py-3 space-y-2">
        <p className="text-sm text-primary-fg flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          {publishAt
            ? <>Wird am {formatBerlinDateTime(new Date(publishAt), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} Uhr automatisch veröffentlicht und angekündigt</>
            : "Unsichtbar — noch nicht angekündigt"}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="datetime-local" value={planned} onChange={e => setPlanned(e.target.value)}
            className="text-xs bg-surface-2 border border-line text-fg rounded-control px-2 py-1.5" />
          <button type="button" disabled={busy || !planned} onClick={() => savePublishAt(planned)}
            className="text-xs text-primary-fg border border-primary/35 rounded-control px-3 py-1.5 hover:bg-primary-soft disabled:opacity-40">
            Veröffentlichung planen
          </button>
          {publishAt && (
            <button type="button" disabled={busy} onClick={() => savePublishAt(null)}
              className="text-xs text-subtle hover:text-fg/90">
              Planung entfernen
            </button>
          )}
        </div>
        <p className="text-xs text-subtle">
          Beim Sichtbarschalten (oder zum geplanten Zeitpunkt) wird das Event auf Discord angekündigt und
          per Push gemeldet.
        </p>
      </div>
    );
  }

  if (state.errors.length === 0) return null;
  return (
    <div className="rounded-control border border-amber-500/30 bg-amber-500/5 px-4 py-3 space-y-2">
      <p className="text-sm text-amber-300 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" /> Veröffentlichung unvollständig
      </p>
      <ul className="text-xs text-muted space-y-0.5">
        {state.errors.map((e, i) => (
          <li key={i}>• {PUBLISH_STEP_LABELS[e.step] ?? e.step}: {e.message}</li>
        ))}
      </ul>
      <button type="button" disabled={busy} onClick={retry}
        className="flex items-center gap-1.5 text-xs text-amber-300 border border-amber-600/50 rounded-control px-3 py-1.5 hover:bg-warning-soft disabled:opacity-40 max-lg:min-h-10">
        <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} /> Erneut versuchen
      </button>
    </div>
  );
}
