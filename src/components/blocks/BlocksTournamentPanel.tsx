"use client";
// ============================================
// OMA Blocks — Live-Turnier auf der Event-Seite (Stand, Zugang zum Turnier-Raum, Turnierleitung)
// ============================================

import OmaWordmark from "@/components/OmaWordmark";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Play, Swords } from "@/components/icons";
import { groupLabel } from "@/lib/blocks/tournament-shared";
import TournamentStandings, { PHASE_LABEL, useTournamentState } from "./TournamentStandings";

/** canLead: darf das Turnier starten und Phasen beenden (wer das Event verwalten darf). */
export default function BlocksTournamentPanel({ eventId, viewerId, canLead }: { eventId: string; viewerId: string; canLead: boolean }) {
  const [state, reload] = useTournamentState(eventId, 10_000);
  const [busy, setBusy] = useState<"start" | "advance" | null>(null);

  const act = async (action: "start" | "advance") => {
    if (action === "advance" && !confirm("Laufende Phase jetzt mit dem aktuellen Stand beenden?")) return;
    setBusy(action);
    try {
      const res = await fetch(`/api/blocks/tournaments/${eventId}/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(data.error ?? "Aktion fehlgeschlagen.");
      else toast.success(action === "start" ? "Turnier gestartet — Gruppen sind ausgelost." : "Phase beendet.");
      await reload();
    } finally {
      setBusy(null);
    }
  };

  if (!state) {
    return <div className="glass rounded-card p-4 text-sm text-muted">Turnierstand wird geladen …</div>;
  }

  const { me, phase } = state;
  let myLine: string | null = null;
  if (phase === "pending") {
    myLine = me.eligible
      ? "Du bist dabei. Sobald die Turnierleitung startet, geht es in den Turnier-Raum."
      : state.checkInEnabled
        ? "Melde dich an und checke vor dem Start ein, um mitzuspielen."
        : "Melde dich als Spieler an, um mitzuspielen.";
  } else if (phase === "groups" && me.group !== null) {
    myLine = me.canPlay ? `Du spielst in ${groupLabel(me.group)}.` : `${groupLabel(me.group)} ist fertig — warte auf das Finale.`;
  } else if (phase === "final") {
    myLine = me.finalist ? (me.canPlay ? "Du bist im Finale!" : "Das Finale ist gespielt.") : "Das Finale läuft — schau zu, wie es ausgeht.";
  }

  return (
    <div className="glass rounded-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold text-violet-300 uppercase tracking-widest flex items-center gap-1">
            <Swords className="w-3.5 h-3.5" /> <OmaWordmark product="blocks" size="sm" className="normal-case" /> Live-Turnier
          </p>
          <p className="font-display text-lg font-bold text-fg">{PHASE_LABEL[phase]}</p>
          <p className="text-xs text-muted">
            Vorrunde {state.groupRounds} {state.groupRounds === 1 ? "Runde" : "Runden"} · Finale {state.finalRounds}{" "}
            {state.finalRounds === 1 ? "Runde" : "Runden"} · {state.eligibleCount} {state.checkInEnabled ? "eingecheckt" : "angemeldet"}
          </p>
        </div>
        {me.canPlay && (
          <Link
            href={`/games/blocks/turnier/${eventId}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-ink font-bold text-sm px-4 py-2"
          >
            <Play className="w-4 h-4" /> Zum Turnier-Raum
          </Link>
        )}
      </div>

      {myLine && <p className="text-sm text-fg/90">{myLine}</p>}

      {phase !== "pending" && <TournamentStandings state={state} viewerId={viewerId} />}

      {canLead && phase !== "done" && (
        <div className="rounded-control border border-coin/20 bg-amber-400/5 p-3 space-y-2">
          <p className="text-[10px] font-semibold text-coin uppercase tracking-widest">Turnierleitung</p>
          {phase === "pending" ? (
            <>
              <p className="text-xs text-muted">
                Lost alle {state.checkInEnabled ? "eingecheckten" : "angemeldeten"} Spieler ({state.eligibleCount}) zufällig auf Gruppen à max. 8 aus.
                Bei bis zu 8 Spielern geht es direkt ins Finale.
              </p>
              <Button size="sm" onClick={() => void act("start")} loading={busy === "start"} disabled={state.eligibleCount < 2}>
                Turnier starten
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted">
                Runden laufen automatisch. Hängt eine Gruppe (Spieler fehlen), kannst du die Phase mit dem aktuellen Stand beenden.
              </p>
              <Button size="sm" variant="outline" onClick={() => void act("advance")} loading={busy === "advance"}>
                {phase === "groups" ? "Vorrunde jetzt beenden → Finale" : "Finale jetzt beenden"}
              </Button>
            </>
          )}
        </div>
      )}
      {canLead && phase === "done" && (
        <p className="text-xs text-coin">
          Endstand ist übernommen — schließe das Event jetzt wie gewohnt ab, dann werden die Belohnungen ausgezahlt.
        </p>
      )}
    </div>
  );
}
