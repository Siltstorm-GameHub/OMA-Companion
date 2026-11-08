"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, Eye, Loader2, RotateCcw, X } from "@/components/icons";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { ResetPreview, ResetSchedule } from "@/lib/reset-selective";

/** Eine Reihe mit all ihren Saisons (gemeinsame groupId) — wird immer komplett bewahrt. */
export type SeriesGroupOption = {
  key: string;
  name: string;
  seriesIds: string[];
  seasonCount: number;
  eventCount: number;
  active: boolean;
};

function formatDate(ymd: string) {
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}

function tomorrowBerlin(): string {
  const t = new Date(Date.now() + 86_400_000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(t); // YYYY-MM-DD
}

export default function ResetSelectiveButton({ groups, schedule }: { groups: SeriesGroupOption[]; schedule: ResetSchedule | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<ResetPreview | null>(null);
  const [date, setDate] = useState(schedule?.status === "scheduled" ? schedule.scheduledFor : "");
  const [keepKeys, setKeepKeys] = useState<Set<string>>(() => {
    if (schedule?.status !== "scheduled") return new Set();
    const ids = new Set(schedule.keepSeriesIds);
    return new Set(groups.filter(g => g.seriesIds.some(id => ids.has(id))).map(g => g.key));
  });

  const keepSeriesIds = groups.filter(g => keepKeys.has(g.key)).flatMap(g => g.seriesIds);
  const minDate = tomorrowBerlin();
  const keptGroupNames = schedule
    ? groups.filter(g => g.seriesIds.some(id => schedule.keepSeriesIds.includes(id))).map(g => g.name)
    : [];

  function toggle(key: string) {
    setPreview(null);
    setKeepKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/reset-selective", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Fehler");
    return data;
  }

  async function handlePreview() {
    setPreviewing(true);
    try {
      const data = await post({ action: "preview", keepSeriesIds });
      setPreview(data.preview as ResetPreview);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Netzwerkfehler");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSchedule() {
    setLoading(true);
    try {
      await post({ action: "schedule", keepSeriesIds, date });
      toast.success(`Reset für den ${formatDate(date)} geplant`);
      setConfirmOpen(false);
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reset-selective", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      toast.success("Geplanter Reset abgebrochen");
      setCancelOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass card-shine rounded-2xl p-4 border border-red-500/15">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <RotateCcw className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Selektiver Reset (Neustart)</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Läuft in der Nacht des gewählten Datums (ca. 4 Uhr). Ausgewählte Eventreihen laufen mit allen Saisons,
            Tabellen und Statistiken weiter, ihre Rang-Punkte bleiben. Alle anderen Events, die bis dahin begonnen
            haben, werden gelöscht; spätere Termine bleiben. Münzen, Punktehistorie, Pokale, LuL, Quests,
            Tipps, Minigames, Shop-Inventar, Ansehen und Voice-/Nachrichten-Zähler werden zurückgesetzt.
            Erhalten bleiben Clips, Ideen-Board, Posts, Berichte und Squads.
          </p>

          {schedule?.status === "scheduled" && (
            <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <p className="font-semibold flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" /> Geplant für den {formatDate(schedule.scheduledFor)}, ca. 4 Uhr
              </p>
              <p className="mt-1 text-amber-200/80">
                Bewahrt: {keptGroupNames.length ? keptGroupNames.join(", ") : "keine Reihe"}
              </p>
              <p className="mt-1 text-amber-200/80">Vorher unbedingt ein Datenbank-Backup ziehen.</p>
            </div>
          )}
          {schedule?.status === "running" && (
            <p className="mt-3 text-xs text-amber-300 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reset läuft gerade …
            </p>
          )}
          {schedule?.status === "done" && schedule.result && (
            <p className="mt-3 text-xs text-emerald-400">
              Reset am {formatDate(schedule.scheduledFor)} ausgeführt: {schedule.result.deletedEventCount} Events und{" "}
              {schedule.result.deletedSeriesCount} Reihen gelöscht, {schedule.result.keptSeriesCount} Reihen bewahrt,{" "}
              {schedule.result.usersWithRankPoints} User mit Rang-Punkten.
            </p>
          )}
          {schedule?.status === "failed" && (
            <p className="mt-3 text-xs text-red-400">
              Reset am {formatDate(schedule.scheduledFor)} fehlgeschlagen, es wurde nichts geändert: {schedule.error}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setOpen(true)}
              disabled={schedule?.status === "running"}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/20 hover:border-red-500/30 transition-colors font-medium disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {schedule?.status === "scheduled" ? "Planung ändern" : "Reset planen"}
            </button>
            {schedule?.status === "scheduled" && (
              <button
                onClick={() => setCancelOpen(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Abbrechen
              </button>
            )}
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Selektiven Reset planen" size="md">
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-300">Datum (Reset läuft in der Nacht, ca. 4 Uhr)</span>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={e => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
            />
          </label>

          <div>
            <p className="text-xs text-gray-500 mb-2">
              Wähle die Eventreihen, die <strong className="text-gray-300">fortgeführt</strong> werden. Alle Saisons einer
              Reihe bleiben gemeinsam erhalten.
            </p>
            {groups.length === 0 ? (
              <p className="text-sm text-gray-600">Keine Eventreihen vorhanden.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {groups.map(g => (
                  <label key={g.key}
                    className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 cursor-pointer hover:border-white/15 transition-colors">
                    <input type="checkbox" checked={keepKeys.has(g.key)} onChange={() => toggle(g.key)}
                      className="rounded accent-teal-500 shrink-0" />
                    <span className="flex-1 min-w-0 text-sm text-gray-200 truncate">{g.name}</span>
                    {g.seasonCount > 1 && <span className="text-[10px] text-gray-500 shrink-0">{g.seasonCount} Saisons</span>}
                    <span className="text-[10px] text-gray-600 shrink-0">{g.eventCount} Events</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${
                      g.active ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" : "text-gray-500 border-white/10"
                    }`}>{g.active ? "aktiv" : "archiviert"}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {preview && (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-xs text-gray-300 space-y-2">
              <p className="font-semibold text-white">Vorschau (Stand jetzt)</p>
              <ul className="space-y-0.5 text-gray-400">
                <li>{preview.keptSeriesCount} Reihen/Saisons bewahrt</li>
                <li>{preview.deletedEventCount} Events und {preview.deletedSeriesCount} Reihen werden gelöscht</li>
                <li>{preview.keptFutureEventCount} künftige Events außerhalb der Auswahl bleiben</li>
                <li>{preview.usersWithRankPoints} User behalten zusammen {preview.totalRankPoints.toLocaleString("de-DE")} Rang-Punkte</li>
              </ul>
              {preview.resetSeries.length > 0 && (
                <p className="text-gray-400">
                  Laufen mit leerer Tabelle weiter (haben künftige Termine):{" "}
                  {preview.resetSeries.map(s => s.name).join(", ")}
                </p>
              )}
              {preview.topUsers.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1">Rang-Punkte nach dem Reset (Top {preview.topUsers.length}):</p>
                  <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                    {preview.topUsers.map((u, i) => (
                      <li key={u.userId} className="flex justify-between gap-2">
                        <span className="truncate">{i + 1}. {u.name}</span>
                        <span className="tabular-nums text-gray-400">{u.rankPoints.toLocaleString("de-DE")}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
            <button onClick={handlePreview} disabled={previewing}
              className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/20 transition-colors disabled:opacity-50">
              {previewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
              Vorschau
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!date || date < minDate}
              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Planen ({keepKeys.size} Reihe{keepKeys.size === 1 ? "" : "n"} bewahren)
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={date ? `Reset für den ${formatDate(date)} planen` : "Reset planen"}
        description={
          `In der Nacht des ${date ? formatDate(date) : "—"} (ca. 4 Uhr) werden alle Events außerhalb der ${keepKeys.size} ` +
          `ausgewählten Reihen gelöscht, die bis dahin begonnen haben, und Münzen, Punktehistorie, Pokale, LuL, Quests, ` +
          `Tipps, Minigames, Shop-Inventar, Ansehen sowie Voice-/Nachrichten-Zähler aller User zurückgesetzt.\n\n` +
          `Bis dahin kannst du die Planung ändern oder abbrechen. Danach ist es nicht rückgängig zu machen — ` +
          `zieh vorher ein Datenbank-Backup.`
        }
        confirmLabel="Reset planen"
        variant="danger"
        typedConfirmText="ZURÜCKSETZEN"
        loading={loading}
        onConfirm={handleSchedule}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Geplanten Reset abbrechen?"
        description="Der Reset wird nicht ausgeführt. Du kannst ihn jederzeit neu planen."
        confirmLabel="Reset abbrechen"
        loading={loading}
        onConfirm={handleCancel}
      />
    </div>
  );
}
