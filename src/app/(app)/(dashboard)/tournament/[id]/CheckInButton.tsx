"use client";
import { useEffect, useState } from "react";
import { Glyph } from "@/components/ui/Glyph";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2 } from "@/components/icons";
import { checkInOpensAt, checkInState } from "@/lib/checkin";
import { formatBerlinDateTime } from "@/lib/time";
import { useConfirm } from "@/components/admin/ConfirmDialog";

/**
 * "Bin bereit" vor Turnierstart für angemeldete Spieler (= Check-in, nur bei Event.checkInEnabled sichtbar).
 * Gleicher Weg wie der Status-Knopf in den Absprachen — beide setzen Check-in und "bereit"-Status.
 * Schaltet sich von selbst frei, sobald das Fenster aufgeht (ohne Neuladen der Seite).
 */
export default function CheckInButton({
  eventId, startAt, drawn, checkedIn: initialCheckedIn,
}: {
  eventId: string;
  startAt: string;
  /** Turnier bereits ausgelost (es gibt Matches) → Check-in geschlossen */
  drawn: boolean;
  checkedIn: boolean;
}) {
  const router = useRouter();
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [loading, setLoading] = useState(false);
  const [, setTick] = useState(0);
  const { confirm, ConfirmDialogElement } = useConfirm();
  const event = { checkInEnabled: true, startAt };
  const state = checkInState(event, drawn);
  const opensAt = checkInOpensAt(event).getTime();

  // Noch nicht offen: genau zum Öffnungszeitpunkt neu rendern (max. alle 60 s prüfen)
  useEffect(() => {
    if (state !== "not_yet_open") return;
    const id = setInterval(() => {
      setTick(t => t + 1);
      if (Date.now() >= opensAt) router.refresh();
    }, Math.min(60_000, Math.max(1_000, opensAt - Date.now())));
    return () => clearInterval(id);
  }, [state, opensAt, router]);

  async function toggle() {
    if (checkedIn && !(await confirm({
      title: "Bereit-Meldung zurücknehmen?",
      description: "Wer bei der Auslosung nicht bereit ist, kommt nicht in den Turnierbaum. Du kannst dich bis dahin wieder bereit melden.",
      confirmLabel: "Zurücknehmen",
      variant: "danger",
    }))) return;
    setLoading(true);
    const res = await fetch(`/api/events/${eventId}/checkin`, { method: checkedIn ? "DELETE" : "POST" });
    setLoading(false);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error ?? "Das hat nicht geklappt");
      router.refresh();
      return;
    }
    setCheckedIn(!checkedIn);
    toast.success(checkedIn ? "Bereit-Meldung zurückgenommen" : "Bereit gemeldet — viel Erfolg! 🎮");
    router.refresh();
  }

  if (state === "not_yet_open") {
    return (
      <span className="text-xs text-muted" title="Wer bei der Auslosung nicht bereit ist, kommt nicht in den Turnierbaum.">
        <Glyph name="clock" className="inline size-4 align-[-3px]" /> „Bin bereit“ ab {formatBerlinDateTime(new Date(opensAt), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} Uhr
      </span>
    );
  }
  if (state === "closed") {
    return (
      <span className={`text-xs ${checkedIn ? "text-primary-fg" : "text-subtle"}`}>
        {checkedIn ? "✓ Bereit" : "Bereit-Meldung geschlossen"}
      </span>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={toggle} disabled={loading}
        className={`flex min-h-10 items-center gap-1.5 text-sm font-bold rounded-control px-4 border transition-colors disabled:opacity-50 ${
          checkedIn
            ? "bg-primary-soft border-primary/40 text-primary-fg hover:border-primary/60"
            : "bg-warning border-warning text-canvas hover:brightness-110 animate-pulse"
        }`}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : checkedIn ? <Check className="w-4 h-4" /> : null}
        {checkedIn ? "Bereit (zurücknehmen)" : "Bin bereit"}
      </button>
      {!checkedIn && (
        <span className="text-xs text-muted">Bis zur Auslosung möglich. Wer nicht bereit ist, wird nicht ausgelost.</span>
      )}
      {ConfirmDialogElement}
    </div>
  );
}
