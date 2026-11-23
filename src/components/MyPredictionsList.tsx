"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2 } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { Glyph } from "@/components/ui/Glyph";
import { buttonClasses } from "@/components/ui/button-styles";
import CoinIcon from "@/components/CoinIcon";
import { formatBerlinDate } from "@/lib/time";

type UserLite = { id: string; username: string | null; name: string | null; image: string | null };

export type MyPrediction = {
  eventId: string;
  eventTitle: string;
  eventStartAt: string;
  predictedUser: UserLite;
  wager: number;
  resolved: boolean;
  correct: boolean | null;
  coinsAwarded: number;
};

const uname = (u: UserLite) => u.username ?? u.name ?? "?";

export default function MyPredictionsList({ initialPredictions }: { initialPredictions: MyPrediction[] }) {
  const [predictions, setPredictions] = useState(initialPredictions);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(eventId: string) {
    if (deletingId) return;
    const target = predictions.find(x => x.eventId === eventId);
    setDeletingId(eventId);
    const prev = predictions;
    setPredictions(p => p.filter(x => x.eventId !== eventId));
    try {
      const res = await fetch("/api/predictions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPredictions(prev);
        toast.error(data.error ?? "Löschen fehlgeschlagen");
        return;
      }
      toast.success(target && !target.resolved ? "Vorhersage gelöscht — Einsatz zurückerstattet" : "Vorhersage gelöscht");
    } catch {
      setPredictions(prev);
      toast.error("Netzwerkfehler");
    } finally {
      setDeletingId(null);
    }
  }

  const open = predictions.filter(p => !p.resolved);
  const done = predictions.filter(p => p.resolved);
  const won = done.filter(p => p.correct).length;

  const row = (p: MyPrediction) => (
    <li key={p.eventId} className="flex items-center gap-3 py-2.5">
      <Link href={`/tournament/${p.eventId}`} className="flex-1 min-w-0 flex items-center gap-3 group">
        <span className={`grid size-10 shrink-0 place-items-center rounded-control ${
          !p.resolved ? "bg-surface-3 text-muted" : p.correct ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
        }`}>
          <Glyph name={!p.resolved ? "clock" : p.correct ? "check" : "cross"} className="size-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-fg truncate group-hover:text-primary-fg transition-colors">{p.eventTitle}</span>
          <span className="block text-xs text-subtle truncate">
            Tipp: <span className="font-semibold text-muted">{uname(p.predictedUser)}</span>
            {" · "}{formatBerlinDate(p.eventStartAt, { weekday: "short", day: "numeric", month: "numeric" })}
          </span>
        </span>
        <span className="shrink-0 text-right">
          {p.resolved ? (
            p.correct
              ? <span className="flex items-center gap-1 text-sm font-bold text-coin tabular-nums">+{p.coinsAwarded} <CoinIcon size={13} /></span>
              : <span className="flex items-center gap-1 text-sm font-bold text-subtle tabular-nums">−{p.wager} <CoinIcon size={13} /></span>
          ) : (
            <span className="flex items-center gap-1 text-sm font-semibold text-muted tabular-nums">{p.wager} <CoinIcon size={13} /></span>
          )}
          <span className="block text-xs text-subtle">{p.resolved ? (p.correct ? "richtig" : "daneben") : "Einsatz"}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => handleDelete(p.eventId)}
        disabled={deletingId === p.eventId}
        aria-label={p.resolved ? "Vorhersage löschen" : "Vorhersage löschen, Einsatz zurück"}
        title={p.resolved ? "Vorhersage löschen" : "Vorhersage löschen, Einsatz zurück"}
        className="grid size-10 lg:size-8 shrink-0 place-items-center rounded-control text-subtle hover:bg-danger-soft hover:text-danger transition-colors disabled:opacity-40"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );

  return (
    <Card aria-label="Deine Vorhersagen">
      <h2 className="flex items-center gap-2 text-base font-extrabold text-fg">
        Deine Vorhersagen
        {predictions.length > 0 && <span className="rounded-full bg-surface-3 px-2 text-xs font-bold leading-5 tabular-nums text-muted">{predictions.length}</span>}
      </h2>
      {predictions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="grid size-10 place-items-center rounded-control bg-primary-soft text-primary-fg"><Glyph name="target" className="size-5" /></span>
          <div>
            <p className="text-sm font-bold text-fg">Noch keine Vorhersagen</p>
            <p className="mt-1 text-sm text-muted">Tipp auf einer Event-Seite, wer gewinnt.</p>
          </div>
          <Link href="/events" className={buttonClasses("primary", "md")}>Events ansehen</Link>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-subtle">Offen</p>
              <ul className="divide-y divide-line">{open.map(row)}</ul>
            </>
          )}
          {done.length > 0 && (
            <>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-subtle">
                Ausgewertet <span className="font-semibold normal-case tracking-normal">· {won} von {done.length} richtig</span>
              </p>
              <ul className="divide-y divide-line">{done.map(row)}</ul>
            </>
          )}
        </>
      )}
    </Card>
  );
}
