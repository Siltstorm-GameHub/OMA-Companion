"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2 } from "@/components/icons";
import { checkInOpensAt, checkInState } from "@/lib/checkin";
import { formatBerlinDateTime } from "@/lib/time";

/** Check-in vor Turnierstart für angemeldete Spieler (nur bei Event.checkInEnabled sichtbar). */
export default function CheckInButton({
  eventId, startAt, checkInMinutes, drawn, checkedIn: initialCheckedIn,
}: {
  eventId: string;
  startAt: string;
  checkInMinutes: number;
  /** Turnier bereits ausgelost (es gibt Matches) → Check-in geschlossen */
  drawn: boolean;
  checkedIn: boolean;
}) {
  const router = useRouter();
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [loading, setLoading] = useState(false);
  const event = { checkInEnabled: true, checkInMinutes, startAt };
  const state = checkInState(event, drawn);

  async function toggle() {
    setLoading(true);
    const res = await fetch(`/api/events/${eventId}/checkin`, { method: checkedIn ? "DELETE" : "POST" });
    setLoading(false);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error ?? "Check-in fehlgeschlagen");
      router.refresh();
      return;
    }
    setCheckedIn(!checkedIn);
    toast.success(checkedIn ? "Ausgecheckt" : "Eingecheckt — viel Erfolg! 🎮");
    router.refresh();
  }

  if (state === "not_yet_open") {
    return (
      <span className="text-xs text-gray-400">
        ⏳ Check-in ab {formatBerlinDateTime(checkInOpensAt(event), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} Uhr
      </span>
    );
  }
  if (state === "closed") {
    return (
      <span className={`text-xs ${checkedIn ? "text-teal-300" : "text-gray-500"}`}>
        {checkedIn ? "✓ Eingecheckt" : "Check-in geschlossen"}
      </span>
    );
  }
  return (
    <button type="button" onClick={toggle} disabled={loading}
      className={`flex items-center gap-1.5 text-sm font-semibold rounded-xl px-4 py-2 border transition-colors disabled:opacity-50 ${
        checkedIn
          ? "bg-teal-500/15 border-teal-500/40 text-teal-300 hover:bg-teal-500/25"
          : "bg-amber-500 border-amber-400 text-gray-950 hover:bg-amber-400 animate-pulse"
      }`}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : checkedIn ? <Check className="w-4 h-4" /> : null}
      {checkedIn ? "Eingecheckt (auschecken)" : "Jetzt einchecken"}
    </button>
  );
}
