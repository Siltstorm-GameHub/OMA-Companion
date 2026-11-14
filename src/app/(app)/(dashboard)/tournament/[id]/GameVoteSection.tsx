"use client";

// Spielwahl eines Reihen-Termins (lib/game-vote): Mitglieder haken alle Kandidaten an, die sie spielen würden
// (Zustimmungswahl, jederzeit änderbar). Die erste Stimme meldet als Mitspieler an. Mods stellen die
// Kandidaten zusammen und geben nach der Wahl Spiel, Regeln und Format frei.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import GameCover from "@/components/GameCover";
import { Button } from "@/components/ui/Button";
import { Check, Trash2, Trophy } from "@/components/icons";
import type { GameVoteView } from "@/lib/game-vote/service";
import { SERIES_FORMAT_OPTIONS } from "@/lib/tournament-formats";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

const REGISTRATION_TOAST: Record<string, string | null> = {
  registered: "Stimme gespeichert — du bist jetzt als Mitspieler angemeldet",
  already: "Stimme gespeichert",
  none: "Stimme gespeichert",
  full: "Stimme gespeichert — das Event ist voll, angemeldet bist du nicht",
  locked: "Stimme gespeichert — die Anmeldung ist gesperrt, angemeldet bist du nicht",
  squad: "Stimme gespeichert",
  closed: "Stimme gespeichert — die Anmeldung ist geschlossen",
};

async function call(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data;
}

export default function GameVoteSection({
  eventId, view, isMod, addable, rules, format,
}: {
  eventId: string;
  view: GameVoteView;
  isMod: boolean;
  /** Spiele, die Mods noch hinzufügen können */
  addable: { id: string; name: string }[];
  /** Aktuelle Regeln/Format des Events (Vorbelegung für die Freigabe) */
  rules: string | null;
  format: string | null;
}) {
  const router = useRouter();
  const [mine, setMine] = useState<Set<string>>(new Set(view.myCandidateIds));
  const [saving, setSaving] = useState(false);
  const [addId, setAddId] = useState("");
  const winner = view.candidates.find(c => c.gameId === view.winnerGameId) ?? null;
  const open = view.status === "open";

  async function toggle(candidateId: string) {
    if (!open || !view.canVote || saving) return;
    const next = new Set(mine);
    if (next.has(candidateId)) next.delete(candidateId);
    else next.add(candidateId);
    const prev = mine;
    setMine(next);
    setSaving(true);
    try {
      const data = await call(`/api/events/${eventId}/game-vote`, { method: "PUT", body: JSON.stringify({ candidateIds: [...next] }) });
      toast.success(REGISTRATION_TOAST[data.registration] ?? "Stimme gespeichert");
      router.refresh();
    } catch (err) {
      setMine(prev);
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  async function modAction(fn: () => Promise<unknown>, ok: string) {
    setSaving(true);
    try {
      await fn();
      toast.success(ok);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass rounded-2xl p-5 mb-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-white">🗳️ Spielwahl</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {view.status === "prepared" && <>Die Abstimmung startet am {fmt(view.opensAt)} und läuft bis {fmt(view.closesAt)}.</>}
            {view.status === "open" && <>Läuft bis {fmt(view.closesAt)} · {view.voterCount} {view.voterCount === 1 ? "Stimme" : "Stimmen"} bisher</>}
            {view.status === "closed" && (winner
              ? <>Gewählt: <span className="text-white font-semibold">{winner.name}</span> · {view.voterCount} haben abgestimmt</>
              : <>Abstimmung beendet — das Team trägt das Spiel ein.</>)}
          </p>
        </div>
        {view.status === "closed" && view.rulesPending && (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-200">Regeln folgen</span>
        )}
      </div>

      {open && (
        <p className="text-xs text-gray-400">
          {view.canVote
            ? <>Hak <span className="text-white">alle Spiele</span> an, die du spielen würdest — du kannst deine Auswahl bis zum Ende ändern. Deine erste Stimme meldet dich als Mitspieler an.</>
            : view.squadName
              ? <>Abstimmen dürfen nur Mitglieder von {view.squadName}.</>
              : <>Melde dich an, um abzustimmen.</>}
          {view.voteCoins > 0 && view.canVote && <> Fürs Abstimmen gibt es <span className="text-amber-300">+{view.voteCoins} Münzen</span>, wenn du zum Ende noch angemeldet bist.</>}
        </p>
      )}

      {view.buyHint && winner && (
        <div className="rounded-xl bg-teal-500/10 border border-teal-400/25 px-3 py-2.5 text-xs text-teal-100">
          🛒 <span className="font-semibold">So kommst du an {winner.name}:</span> {view.buyHint}{" "}
          <Link href={`/spiele/${winner.slug}`} className="underline underline-offset-2">Zur Spielseite</Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {view.candidates.map(c => {
          const picked = mine.has(c.id);
          const isWinner = c.gameId === view.winnerGameId;
          return (
            <div key={c.id}
              className={`flex gap-3 rounded-xl border p-2.5 transition-colors ${
                isWinner ? "border-emerald-400/50 bg-emerald-500/10" : picked ? "border-teal-400/40 bg-teal-500/[0.07]" : "border-white/[0.07] bg-white/[0.02]"
              }`}>
              <GameCover game={c.name} coverUrl={c.coverUrl} className="w-24 aspect-[16/9] shrink-0" rounded="rounded-lg" fallbackVariant="plain" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  {c.place !== null && view.status === "closed" && (
                    <span className={`text-[11px] font-bold ${c.place === 1 ? "text-emerald-300" : "text-gray-500"}`}>{c.place}.</span>
                  )}
                  <Link href={`/spiele/${c.slug}`} className="text-sm font-semibold text-white truncate hover:underline">{c.name}</Link>
                  {isWinner && <Trophy className="w-3.5 h-3.5 text-emerald-300 shrink-0" />}
                </div>
                <div className="flex flex-wrap gap-1">
                  {c.origin === "carryover" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-200">Knapp verpasst</span>}
                  {c.isFree === true
                    ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-lime-400/10 text-lime-200">Kostenlos</span>
                    : c.subscriptionLabels.length > 0
                      ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-lime-400/10 text-lime-200">{c.subscriptionLabels.join(" / ")}</span>
                      : c.priceLabel && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-300">{c.discountPercent > 0 ? `−${c.discountPercent} % · ` : ""}{c.priceLabel}</span>}
                </div>
                {c.fitLabel && <p className="text-[11px] text-gray-500 line-clamp-2">{c.fitLabel}</p>}
              </div>
              <div className="flex flex-col items-end justify-between gap-1 shrink-0">
                {open && view.canVote ? (
                  <button type="button" onClick={() => toggle(c.id)} disabled={saving} aria-pressed={picked}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                      picked ? "bg-teal-500 text-white" : "bg-white/[0.06] text-gray-300 hover:bg-white/[0.1]"
                    }`}>
                    <Check className="w-3.5 h-3.5" /> {picked ? "Dabei" : "Bin dabei"}
                  </button>
                ) : <span />}
                {view.status !== "prepared" && (
                  <span className="text-[11px] text-gray-500">{c.approvals} {c.approvals === 1 ? "Stimme" : "Stimmen"}</span>
                )}
                {isMod && view.status !== "closed" && (
                  <button type="button" title="Kandidat entfernen" disabled={saving}
                    onClick={() => modAction(() => call(`/api/admin/game-votes/${view.id}/candidates?candidateId=${c.id}`, { method: "DELETE" }), "Kandidat entfernt")}
                    className="p-1 rounded text-gray-600 hover:text-rose-300 disabled:opacity-40">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isMod && view.status !== "closed" && (
        <div className="flex gap-2 items-center flex-wrap border-t border-white/[0.06] pt-3">
          <span className="text-[11px] text-gray-500">Mod:</span>
          <select value={addId} onChange={e => setAddId(e.target.value)}
            className="flex-1 min-w-[180px] bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white">
            <option value="">Spiel aus der Spieleliste hinzufügen …</option>
            {addable.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <Button size="sm" variant="ghost" disabled={!addId || saving}
            onClick={() => modAction(() => call(`/api/admin/game-votes/${view.id}/candidates`, { method: "POST", body: JSON.stringify({ gameId: addId }) }).then(() => setAddId("")), "Kandidat hinzugefügt")}>
            Hinzufügen
          </Button>
        </div>
      )}

      {isMod && view.status === "closed" && view.rulesPending && (
        <RulesForm eventId={eventId} view={view} rules={rules} format={format} />
      )}
    </section>
  );
}

function RulesForm({ eventId, view, rules, format }: { eventId: string; view: GameVoteView; rules: string | null; format: string | null }) {
  const router = useRouter();
  const [gameId, setGameId] = useState(view.winnerGameId ?? view.candidates.find(c => c.place === 1)?.gameId ?? "");
  const [text, setText] = useState(rules ?? "");
  const [fmtValue, setFmtValue] = useState(format ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await call(`/api/events/${eventId}/game-vote/rules`, {
        method: "POST", body: JSON.stringify({ gameId, rules: text, ...(format ? { format: fmtValue } : {}) }),
      });
      toast.success("Spiel und Regeln freigegeben");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Freigabe fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-teal-500/40";
  return (
    <div className="border-t border-white/[0.06] pt-3 space-y-2.5">
      <p className="text-sm font-semibold text-white">Regeln festlegen</p>
      <p className="text-[11px] text-gray-500">
        Vorbelegt mit den Regeln, die diese Reihe zuletzt für das Spiel hatte. Erst nach der Freigabe kann ausgelost werden;
        die Reihe merkt sich Regeln{format ? " und Format" : ""} für das nächste Mal.
      </p>
      <label className="block text-xs text-gray-400 space-y-1">
        <span>Spiel</span>
        <select value={gameId} onChange={e => setGameId(e.target.value)} className={input}>
          {view.candidates.filter(c => c.place !== null).map(c => (
            <option key={c.gameId} value={c.gameId}>{c.place}. {c.name} ({c.approvals} Stimmen)</option>
          ))}
        </select>
      </label>
      {format && (
        <label className="block text-xs text-gray-400 space-y-1">
          <span>Format</span>
          <select value={fmtValue} onChange={e => setFmtValue(e.target.value)} className={input}>
            {SERIES_FORMAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      )}
      <label className="block text-xs text-gray-400 space-y-1">
        <span>Regelwerk</span>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={5} className={input} placeholder="Regeln für dieses Spiel …" />
      </label>
      <Button size="sm" onClick={save} disabled={saving || !gameId}>Spiel und Regeln freigeben</Button>
    </div>
  );
}
