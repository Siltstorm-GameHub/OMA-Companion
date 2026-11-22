"use client";
// Spielwahl eines Reihen-Termins (lib/game-vote): Mitglieder haken alle Kandidaten an, die sie spielen würden
// (Zustimmungswahl, jederzeit änderbar). Mit der ersten Stimme kann man sich gleich als Mitspieler anmelden
// ("Nur abstimmen" geht auch). Verwalter des Events stellen die Kandidaten zusammen und geben nach der Wahl
// Spiel, Regeln und Format frei — ergibt die Wahl kein Spiel, legen sie es hier fest.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import GameCover from "@/components/GameCover";
import { Button } from "@/components/ui/Button";
import { Check, Trash2, Trophy } from "@/components/icons";
import { useConfirm } from "@/components/admin/ConfirmDialog";
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

const COUNTS_HIDDEN_TEXT: Record<string, string> = {
  after_vote: "Zwischenstand nach deiner Stimme",
  after_end: "Zwischenstand nach dem Ende",
};

/** Mehrere Häkchen kurz hintereinander werden gesammelt und einmal gespeichert. */
const SAVE_DELAY_MS = 900;

async function call(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data;
}

export default function GameVoteSection({
  eventId, view, canManage, addable, rules, format, isRegistered, isSpectator = false,
}: {
  eventId: string;
  view: GameVoteView;
  /** Darf das Event verwalten (Mods, Ersteller, Reihen-Ersteller, Squad-Captains) */
  canManage: boolean;
  /** Spiele, die Verwalter hinzufügen bzw. (ohne Sieger) festlegen können */
  addable: { id: string; name: string }[];
  /** Aktuelle Regeln/Format des Events (Vorbelegung für die Freigabe) */
  rules: string | null;
  format: string | null;
  /** Schon als Mitspieler angemeldet? Dann entfällt die Frage "mitspielen oder nur abstimmen" */
  isRegistered: boolean;
  /** Als Zuschauer angemeldet: "auch als Mitspieler anmelden" ist dann nicht vorausgewählt */
  isSpectator?: boolean;
}) {
  const router = useRouter();
  const { confirm, ConfirmDialogElement } = useConfirm();
  const [mine, setMine] = useState<Set<string>>(new Set(view.myCandidateIds));
  const [saving, setSaving] = useState(false);
  const [addId, setAddId] = useState("");
  // Erste Stimme: gleich als Mitspieler anmelden? (Standard ja — wie bisher)
  const firstVote = view.myCandidateIds.length === 0;
  // Zuschauer werden nicht aus Versehen zu Spielern
  const [join, setJoin] = useState(!isSpectator);
  // Häkchen gesetzt, aber noch nicht gespeichert (gesammelt, siehe SAVE_DELAY_MS)
  const [pending, setPending] = useState(false);
  const savedRef = useRef<Set<string>>(new Set(view.myCandidateIds));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const winner = view.candidates.find(c => c.gameId === view.winnerGameId) ?? null;
  const open = view.status === "open";
  const noWinner = view.status === "closed" && !view.winnerGameId;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function save(next: Set<string>) {
    setSaving(true);
    try {
      const data = await call(`/api/events/${eventId}/game-vote`, {
        method: "PUT", body: JSON.stringify({ candidateIds: [...next], join: isRegistered || join }),
      });
      savedRef.current = new Set(next);
      toast.success(REGISTRATION_TOAST[data.registration] ?? "Stimme gespeichert");
      router.refresh();
    } catch (err) {
      setMine(new Set(savedRef.current));
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
      setPending(false);
    }
  }

  function toggle(candidateId: string) {
    if (!open || !view.canVote) return;
    const next = new Set(mine);
    if (next.has(candidateId)) next.delete(candidateId);
    else next.add(candidateId);
    setMine(next);
    setPending(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(next), SAVE_DELAY_MS);
  }

  async function manageAction(fn: () => Promise<unknown>, ok: string) {
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

  async function removeCandidate(c: GameVoteView["candidates"][number]) {
    const votes = c.approvals;
    if (!(await confirm({
      title: `${c.name} entfernen?`,
      // Bei ausgeblendetem Zwischenstand kennt die Seite die Zahl nicht — dann ohne Zahl
      description: view.countsHidden
        ? "Stimmen dafür fallen damit weg. Wer dafür gestimmt hat, bekommt eine Meldung."
        : votes > 0
          ? `${votes} ${votes === 1 ? "Stimme fällt" : "Stimmen fallen"} damit weg. Wer dafür gestimmt hat, bekommt eine Meldung.`
          : "Das Spiel steht dann nicht mehr zur Wahl.",
      confirmLabel: "Entfernen",
      variant: "danger",
    }))) return;
    manageAction(() => call(`/api/admin/game-votes/${view.id}/candidates?candidateId=${c.id}`, { method: "DELETE" }), "Kandidat entfernt");
  }

  return (
    <section id="spielwahl" className="glass rounded-2xl p-5 mb-5 space-y-4 scroll-mt-20">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-white">🗳️ Spielwahl</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {view.status === "prepared" && <>Die Abstimmung startet am {fmt(view.opensAt)} und läuft bis {fmt(view.closesAt)}. Stammspieler bekommen dann eine Meldung.</>}
            {view.status === "open" && <>Läuft bis {fmt(view.closesAt)} · {view.voterCount} {view.voterCount === 1 ? "hat" : "haben"} abgestimmt</>}
            {view.status === "closed" && (winner
              ? <>Gewählt: <span className="text-white font-semibold">{winner.name}</span> · {view.voterCount} {view.voterCount === 1 ? "hat" : "haben"} abgestimmt</>
              : <>Abstimmung beendet — die Wahl hat kein Spiel ergeben. Der Veranstalter legt es fest.</>)}
          </p>
          {view.status === "closed" && view.decidedByLabel && winner && (
            <p className="text-[11px] text-gray-500 mt-0.5">Entschieden durch: {view.decidedByLabel}</p>
          )}
        </div>
        {view.status === "closed" && view.rulesPending && (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-200">
            {noWinner ? "Spiel folgt" : "Regeln folgen"}
          </span>
        )}
      </div>

      {view.status === "prepared" && canManage && (
        <p className="text-[11px] text-sky-200/90 rounded-lg border border-sky-400/20 bg-sky-500/5 px-3 py-2">
          Noch nicht gestartet: Du kannst die Kandidaten bis dahin tauschen (unten hinzufügen bzw. 🗑 entfernen).
        </p>
      )}

      {open && (
        <div className="text-xs text-gray-400 space-y-1.5">
          <p>
            {view.canVote
              ? <>Hak <span className="text-white">alle Spiele</span> an, die du spielen würdest — du kannst deine Auswahl bis zum Ende ändern.</>
              : view.squadName
                ? <>Abstimmen dürfen nur Mitglieder von {view.squadName}.</>
                : <>Melde dich an, um abzustimmen.</>}
            {view.voteCoins > 0 && view.canVote && <> Fürs Abstimmen gibt es <span className="text-amber-300">+{view.voteCoins} Münzen</span>, wenn du zum Ende als Mitspieler angemeldet bist.</>}
          </p>
          {view.canVote && firstVote && !isRegistered && (
            <label className="flex items-center gap-2 cursor-pointer select-none text-gray-300">
              <input type="checkbox" checked={join} onChange={e => setJoin(e.target.checked)} className="rounded" />
              Mit meiner Stimme auch als Mitspieler anmelden
              {!join && <span className="text-gray-500">(nur abstimmen{isSpectator ? ", du bleibst Zuschauer" : ""})</span>}
            </label>
          )}
          {view.countsHidden && <p className="text-gray-500">{COUNTS_HIDDEN_TEXT[view.showCounts] ?? "Zwischenstand später"}.</p>}
        </div>
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
                isWinner ? "border-emerald-400/50 bg-emerald-500/10" : picked ? "border-teal-400/40 bg-teal-500/[0.07]" : "border-line bg-surface-2"
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
                      : c.priceLabel && <span className="text-[10px] px-1.5 py-0.5 rounded bg-line text-gray-300">{c.discountPercent > 0 ? `−${c.discountPercent} % · ` : ""}{c.priceLabel}</span>}
                </div>
                {c.fitLabel && <p className="text-[11px] text-gray-500 line-clamp-2">{c.fitLabel}</p>}
              </div>
              <div className="flex flex-col items-end justify-between gap-1 shrink-0">
                {open && view.canVote ? (
                  <button type="button" onClick={() => toggle(c.id)} aria-pressed={picked}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      picked ? "bg-teal-500 text-white" : "bg-line text-gray-300 hover:bg-line"
                    }`}>
                    {picked && <Check className="w-3.5 h-3.5" />} Würde ich spielen
                  </button>
                ) : <span />}
                {view.status !== "prepared" && !view.countsHidden && (
                  <span className="text-[11px] text-gray-500">{c.approvals} {c.approvals === 1 ? "Stimme" : "Stimmen"}</span>
                )}
                {canManage && view.status !== "closed" && (
                  <button type="button" title="Kandidat entfernen" disabled={saving} onClick={() => removeCandidate(c)}
                    className="p-1 rounded text-gray-600 hover:text-rose-300 disabled:opacity-40">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {open && view.canVote && (pending || saving) && (
        <p className="text-[11px] text-gray-500">Wird gespeichert …</p>
      )}

      {canManage && view.status !== "closed" && (
        <div className="flex gap-2 items-center flex-wrap border-t border-line pt-3">
          <span className="text-[11px] text-gray-500">Verwalten:</span>
          <select value={addId} onChange={e => setAddId(e.target.value)}
            className="flex-1 min-w-[180px] bg-line border border-line-strong rounded-lg px-2.5 py-1.5 text-sm text-white">
            <option value="">Spiel aus der Spieleliste hinzufügen …</option>
            {addable.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <Button size="sm" variant="ghost" disabled={!addId || saving}
            onClick={() => manageAction(() => call(`/api/admin/game-votes/${view.id}/candidates`, { method: "POST", body: JSON.stringify({ gameId: addId }) }).then(() => setAddId("")), "Kandidat hinzugefügt")}>
            Hinzufügen
          </Button>
        </div>
      )}

      {canManage && view.status === "closed" && view.rulesPending && (
        <RulesForm eventId={eventId} view={view} rules={rules} format={format} allGames={noWinner ? addable : null} />
      )}
      {ConfirmDialogElement}
    </section>
  );
}

function RulesForm({ eventId, view, rules, format, allGames }: {
  eventId: string; view: GameVoteView; rules: string | null; format: string | null;
  /** Ohne Sieger: alle passenden Spiele der Spieleliste zur Auswahl */
  allGames: { id: string; name: string }[] | null;
}) {
  const router = useRouter();
  const [gameId, setGameId] = useState(view.winnerGameId ?? view.candidates.find(c => c.place === 1)?.gameId ?? "");
  const [text, setText] = useState(rules ?? "");
  const [fmtValue, setFmtValue] = useState(format ?? "");
  const [saving, setSaving] = useState(false);
  // Knapper Ausgang: Platz 1 und 2 gleich viele Stimmen → bewusst prüfen
  const ranked = view.candidates.filter(c => c.place !== null).sort((a, b) => (a.place ?? 99) - (b.place ?? 99));
  const close = ranked.length > 1 && ranked[0].approvals === ranked[1].approvals;

  async function save() {
    setSaving(true);
    try {
      await call(`/api/events/${eventId}/game-vote/rules`, {
        method: "POST", body: JSON.stringify({ gameId, rules: text, ...(format ? { format: fmtValue } : {}) }),
      });
      toast.success(allGames ? "Spiel festgelegt und Regeln freigegeben" : "Spiel und Regeln freigegeben");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Freigabe fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full bg-line border border-line-strong rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-teal-500/40";
  return (
    <div className="border-t border-line pt-3 space-y-2.5">
      <p className="text-sm font-semibold text-white">{allGames ? "Spiel festlegen" : "Regeln festlegen"}</p>
      <p className="text-[11px] text-gray-500">
        {allGames
          ? "Die Wahl hat kein Spiel ergeben. Such eins aus der Spieleliste aus. "
          : "Vorbelegt mit den Regeln, die diese Reihe zuletzt für das Spiel hatte. "}
        Erst nach der Freigabe kann ausgelost werden; die Reihe merkt sich Regeln{format ? " und Format" : ""} für das nächste Mal.
      </p>
      {!allGames && view.decidedByLabel && (
        <p className={`text-[11px] rounded-lg px-2.5 py-1.5 ${close || view.decidedBy === "no_votes" ? "bg-amber-500/10 text-amber-200" : "bg-surface-2 text-gray-400"}`}>
          Ergebnis: {view.decidedByLabel}.{close ? " Knapp — du kannst auch ein anderes Spiel nehmen." : ""}
        </p>
      )}
      <label className="block text-xs text-gray-400 space-y-1">
        <span>Spiel</span>
        <select value={gameId} onChange={e => setGameId(e.target.value)} className={input}>
          {allGames ? (
            <>
              <option value="">Bitte wählen …</option>
              {allGames.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </>
          ) : ranked.map(c => (
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
      <Button size="sm" onClick={save} disabled={saving || !gameId}>{allGames ? "Spiel festlegen und freigeben" : "Spiel und Regeln freigeben"}</Button>
    </div>
  );
}
