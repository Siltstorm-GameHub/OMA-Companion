"use client";
import { useState } from "react";
import { Check, Loader2 } from "@/components/icons";
import { CHECK_IN_MINUTES } from "@/lib/checkin";
import type { EventEdit } from "./useEventEdit";

/**
 * Check-in vor Turnierstart (Reiter "Turnier" und "Spielplan"): Schalter (gespeichert über die Leiste unten),
 * Zähler und — bei aktivem Check-in — wer noch nicht bereit ist, mit "Einchecken" direkt daneben.
 * Wer bei der Auslosung nicht eingecheckt ist, kommt nicht in den Turnierbaum.
 */
export default function CheckInPanel({ ctx, drawn }: { ctx: EventEdit; drawn: boolean }) {
  const { event, checkInEnabled, setCheckInEnabled, checkedInIds, registeredIds, setPlayerCheckIn, bracketRegisteredUsers, userName } = ctx;
  const [busy, setBusy] = useState<string | null>(null);
  const savedOn = !!event.checkInEnabled;
  const notReady = bracketRegisteredUsers.filter(u => !checkedInIds.has(u.id));

  async function checkIn(ids: string[]) {
    setBusy(ids.length > 1 ? "all" : ids[0]);
    for (const id of ids) await setPlayerCheckIn(id, true);
    setBusy(null);
  }

  return (
    <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-2">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={checkInEnabled}
          onChange={e => setCheckInEnabled(e.target.checked)}
          className="rounded shrink-0" />
        <span className="text-sm text-white">Check-in vor Turnierstart</span>
        {checkInEnabled && (
          <span className="text-xs text-gray-400 ml-auto">{checkedInIds.size}/{registeredIds.size} bereit</span>
        )}
      </label>
      <p className="text-xs text-gray-500">
        Spieler melden sich selbst auf der Eventseite („Bin bereit“). Das geht ab {CHECK_IN_MINUTES} Minuten vor dem
        Start bis zur Auslosung; die Spieler bekommen dazu eine Meldung. Ist der Check-in an, werden nur bereite Spieler
        ausgelost. Wer nicht bereit war, gilt beim Abschluss als nicht da. Gespeichert wird der Schalter über die Leiste unten.
      </p>
      {checkInEnabled !== savedOn && (
        <p className="text-xs text-amber-300">Noch nicht gespeichert, bis dahin gilt der alte Stand.</p>
      )}

      {savedOn && !drawn && notReady.length > 0 && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs text-amber-200 flex-1">
              {notReady.length} von {registeredIds.size} noch nicht bereit. Sie werden bei der Auslosung nicht berücksichtigt.
            </p>
            <button type="button" onClick={() => checkIn(notReady.map(u => u.id))} disabled={!!busy}
              className="text-xs px-2 py-1 rounded-md border border-line-strong text-gray-300 hover:bg-line disabled:opacity-50 shrink-0">
              {busy === "all" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Alle einchecken"}
            </button>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {notReady.map(u => (
              <li key={u.id}>
                <button type="button" onClick={() => checkIn([u.id])} disabled={!!busy}
                  title="Von Hand einchecken"
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-line border border-line text-gray-200 hover:border-teal-500/40 hover:text-teal-200 disabled:opacity-50">
                  {busy === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  {userName(u)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {savedOn && !drawn && notReady.length === 0 && registeredIds.size > 0 && (
        <p className="text-xs text-teal-300">Alle angemeldeten Spieler sind bereit.</p>
      )}
    </div>
  );
}
