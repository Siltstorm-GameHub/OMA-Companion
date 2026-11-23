"use client";
import { useState, useEffect } from "react";
import { Glyph } from "@/components/ui/Glyph";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Target, Search, X } from "@/components/icons";
import CoinIcon from "@/components/CoinIcon";
import RankedAvatar from "@/components/RankedAvatar";
import { NumberInput } from "@/components/ui/NumberInput";

type UserLite = { id: string; username: string | null; name: string | null; image: string | null; rankPoints: number };
type Prediction = {
  predictedUserId: string;
  wager: number;
  resolved: boolean;
  correct: boolean | null;
  coinsAwarded: number;
  predictedUser: UserLite;
} | null;

const uname = (u?: UserLite | null) => u?.username ?? u?.name ?? "?";

/** "Fr., 20:00 (noch 3 Std.)" — bis wann getippt werden kann */
function deadlineLabel(iso: string): string {
  const d = new Date(iso);
  const ms = d.getTime() - Date.now();
  const when = d.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  if (ms <= 0) return when;
  const h = Math.floor(ms / 3_600_000);
  const rest = h >= 48 ? `noch ${Math.round(h / 24)} Tage` : h >= 1 ? `noch ${h} Std.` : `noch ${Math.max(1, Math.round(ms / 60_000))} Min.`;
  return `${when} Uhr (${rest})`;
}

/** Pott-Regeln zum Aufklappen */
function PotRules() {
  return (
    <details className="text-xs text-subtle">
      <summary className="cursor-pointer select-none hover:text-fg/90">So funktioniert der Pott</summary>
      <ul className="mt-1.5 space-y-1 list-disc pl-4">
        <li>Dein Einsatz wird sofort abgebucht. Ändern oder löschen geht bis zum Start, dann gibt es ihn zurück.</li>
        <li>Alle Einsätze bilden den Pott. Wer richtig liegt, teilt ihn, gestaffelt nach Einsatz: Je Mitspieler kannst du höchstens deinen eigenen Einsatz gewinnen.</li>
        <li>Liegst du als Einzige(r) richtig, bekommst du deinen Einsatz doppelt.</li>
        <li>Gleichstand auf Platz 1: Jeder Tipp auf einen der Erstplatzierten ist richtig.</li>
        <li>Kein Sieger, Event abgesagt oder dein Spieler hat nicht mitgespielt: Du bekommst deinen Einsatz zurück.</li>
      </ul>
    </details>
  );
}

export default function EventWinnerPredictionWidget({
  eventId,
  locked,
  initialPrediction,
  minWager,
  maxWager,
  players = [],
  lockAt,
}: {
  eventId: string;
  locked: boolean;
  initialPrediction: Prediction;
  minWager: number;
  maxWager: number;
  /** Angemeldete Spieler — Schnellauswahl oben, statt nur Suche über alle Mitglieder */
  players?: UserLite[];
  /** Tipp-Schluss (= Event-Start) */
  lockAt?: string;
}) {
  const isPlayer = (id: string) => players.some(p => p.id === id);
  const [prediction, setPrediction] = useState<Prediction>(initialPrediction);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserLite[]>([]);
  const [selected, setSelected] = useState<UserLite | null>(null);
  const [wager, setWager] = useState(initialPrediction?.wager ?? minWager);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return; }
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function startEditing() {
    setSelected(prediction?.predictedUser ?? null);
    setWager(prediction?.wager ?? minWager);
    setEditing(true);
  }

  async function submit() {
    if (submitting || !selected) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, predictedUserId: selected.id, wager }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Tipp konnte nicht gespeichert werden"); return; }
      setPrediction({ predictedUserId: selected.id, wager, resolved: false, correct: null, coinsAwarded: 0, predictedUser: selected });
      setEditing(false);
      setQuery("");
      setResults([]);
      setSelected(null);
      toast.success(`Tipp gespeichert: ${uname(selected)} gewinnt — Einsatz ${wager} 🎯`);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  // Erstattet (kein Sieger, ungültiger Tipp): ausgewertet, aber weder richtig noch falsch
  if (prediction?.resolved && prediction.correct === null) {
    return (
      <div className="glass rounded-2xl p-4 flex items-center gap-3 border border-line">
        <Target className="w-4 h-4 text-subtle shrink-0" />
        <p className="flex-1 min-w-0 text-sm text-fg/90">
          Einsatz zurück: Dein Tipp auf {uname(prediction.predictedUser)} wurde nicht gewertet (kein Sieger oder der Spieler hat nicht mitgespielt).
        </p>
        <span className="flex items-center gap-1 text-sm font-semibold text-fg/90 shrink-0">±0 <CoinIcon size={14} /></span>
      </div>
    );
  }

  // Bereits ausgewertet
  if (prediction?.resolved) {
    if (prediction.correct) {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 }, colors: ["#f59e0b", "#fcd34d", "#ffffff"] });
    }
    return (
      <div className={`glass rounded-2xl p-4 flex items-center gap-3 ${
        prediction.correct ? "border border-success/30" : "border border-line"
      }`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          prediction.correct ? "bg-success-soft border border-success/30" : "bg-line border border-line-strong"
        }`}>
          <Target className={`w-4 h-4 ${prediction.correct ? "text-success" : "text-subtle"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-fg">
            <span className="inline-flex items-center gap-1.5"><Glyph name={prediction.correct ? "check" : "cross"} />{prediction.correct ? "Richtig getippt!" : "Leider daneben"}</span>
          </p>
          <p className="text-xs text-subtle">
            Du hast auf {uname(prediction.predictedUser)} getippt · Einsatz {prediction.wager} <CoinIcon size={10} className="inline" />
          </p>
        </div>
        {prediction.correct ? (
          <span className="flex items-center gap-1 text-sm font-semibold text-amber-400 shrink-0">
            +{prediction.coinsAwarded} <CoinIcon size={14} />
          </span>
        ) : (
          <span className="flex items-center gap-1 text-sm font-semibold text-subtle shrink-0">
            -{prediction.wager} <CoinIcon size={14} />
          </span>
        )}
      </div>
    );
  }

  // Ausstehend (Tipp abgegeben, Event noch nicht beendet)
  if (prediction && !editing) {
    return (
      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        <div className="size-10 rounded-control bg-primary-soft flex items-center justify-center shrink-0">
          <Target className="size-5 text-primary-fg" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-fg">Du tippst auf <span className="font-semibold">{uname(prediction.predictedUser)}</span></p>
          <p className="text-xs text-subtle flex items-center gap-1 flex-wrap">
            Einsatz: {prediction.wager} <CoinIcon size={10} />
            {!locked && lockAt && <span>· ändern bis {deadlineLabel(lockAt)}</span>}
          </p>
          {players.length > 0 && !isPlayer(prediction.predictedUserId) && (
            <p className="text-xs text-amber-300">{uname(prediction.predictedUser)} ist nicht (mehr) angemeldet. Ohne Teilnahme bekommst du den Einsatz zurück.</p>
          )}
        </div>
        {!locked && (
          <button onClick={startEditing} className="text-xs text-subtle hover:text-fg transition-colors shrink-0">
            Ändern
          </button>
        )}
      </div>
    );
  }

  if (locked) {
    return prediction ? null : (
      <div className="glass rounded-2xl p-4 text-center text-sm text-subtle">
        Tipp-Abgabe für dieses Event ist gesperrt.
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Target className="size-5 text-primary-fg shrink-0" />
        <p className="text-base font-extrabold text-fg">Wer gewinnt dieses Event?</p>
        {lockAt && !editing && <span className="ml-auto text-xs text-subtle">Tippen bis {deadlineLabel(lockAt)}</span>}
        {editing && (
          <button onClick={() => { setEditing(false); setSelected(null); }} className="ml-auto text-subtle hover:text-fg">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {selected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-control bg-primary-soft/60 border border-primary/25">
            <RankedAvatar userId={selected.id} src={selected.image} alt={uname(selected)} size={24} className="w-6 h-6" />
            <span className="flex-1 text-sm text-fg">{uname(selected)}</span>
            <button onClick={() => setSelected(null)} className="text-subtle hover:text-fg">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <label className="block">
            <span className="text-xs text-subtle">Einsatz ({minWager}–{maxWager} Münzen)</span>
            <NumberInput
              min={minWager}
              max={maxWager}
              value={wager}
              onChange={e => setWager(Math.max(minWager, Math.min(maxWager, parseInt(e.target.value, 10) || minWager)))}
              className="mt-1 w-full min-h-10 px-3 rounded-control bg-surface-2 border border-line text-fg text-sm focus:outline-none focus:border-primary"
            />
          </label>

          {players.length > 0 && !isPlayer(selected.id) && (
            <p className="text-xs text-amber-300">{uname(selected)} ist bisher nicht angemeldet. Ohne Teilnahme bekommst du den Einsatz beim Abschluss zurück.</p>
          )}
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full min-h-11 rounded-control bg-primary hover:bg-primary-hover disabled:opacity-40 text-primary-ink text-sm font-bold transition-colors"
          >
            {submitting ? "Speichert…" : "Tipp abgeben"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
        {players.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {players.map(u => (
              <button key={u.id} type="button" onClick={() => setSelected(u)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2 py-1 text-xs text-fg hover:border-primary/40 hover:bg-primary-soft max-lg:min-h-10">
                <RankedAvatar userId={u.id} src={u.image} alt={uname(u)} size={18} className="w-[18px] h-[18px]" />
                {uname(u)}
              </button>
            ))}
          </div>
        )}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={players.length > 0 ? "Oder anderes Mitglied suchen…" : "Mitglied suchen…"}
            className="w-full pl-9 pr-3 py-2 rounded-control bg-surface-2 border border-line text-fg text-sm focus:outline-none focus:border-primary"
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full glass-heavy rounded-card overflow-hidden border border-line-strong">
              {results.map(u => (
                <button key={u.id} onClick={() => { setSelected(u); setResults([]); setQuery(""); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-line text-left">
                  <RankedAvatar userId={u.id} src={u.image} alt={uname(u)} size={24} className="w-6 h-6" />
                  <span className="text-sm text-fg">{uname(u)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
      )}
      <PotRules />
    </div>
  );
}
