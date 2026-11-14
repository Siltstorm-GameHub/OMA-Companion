"use client";

// ============================================
// GameSwipe: Karten-Stapel der Spieleliste
// ============================================
// Rechts = Am Start · Links = Nicht meins · Hoch = Würde ich holen (auch per Knopf und Pfeiltasten).
// Antippen dreht die Karte um: Beschreibung, Steckbrief, wer am Start ist, Sterne, Angaben korrigieren.
// Rückgängig holt die letzte Karte zurück. Daten: GET/POST /api/games/swipe (lib/games/deck.ts).

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import GameCover from "@/components/GameCover";
import CorrectFieldsForm from "@/components/games/CorrectFieldsForm";
import { StarDisplay, StarRatingInput } from "@/components/games/StarRating";
import { CalendarPlus, Check, ChevronRight, Heart, Info, Pencil, RotateCcw, Users, X } from "@/components/icons";
import type { DeckCard } from "@/lib/games/deck";
import type { GameMatchInfo } from "@/lib/games/matches";
import { GAME_GENRES, GAME_MODES, GAME_PLATFORMS, SESSION_LENGTHS, formatPlayers, formatPrice, labelOf } from "@/lib/games/options";
import { MIN_RATINGS_FOR_AVERAGE, averageRating, formatRating } from "@/lib/games/rating";
import { SWIPE_LABELS, planRoundUrl, type SwipeStatus } from "@/lib/games/swipe";

const THRESHOLD = 100;
const FLY_MS = 220;

const keyOf = (c: DeckCard) => (c.kind === "game" ? `g:${c.id}` : `s:${c.steamAppId}`);

interface Done {
  card: DeckCard;
  /** Status vor der Entscheidung (für Rückgängig) */
  before: SwipeStatus | null;
  /** Steam-Trend, der durch "Am Start" aufgenommen wurde */
  adopted: { gameId: string; slug: string } | null;
}

interface MatchHit extends GameMatchInfo {
  gameName: string;
  gameSlug: string;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" });

function reasonLabel(c: DeckCard): string {
  if (c.kind === "steam") return c.trend === "top" ? "Steam · Gerade angesagt" : "Steam · Neu & angesagt";
  if (c.reason === "event" && c.nextEvent) return `Event am ${fmtDate(c.nextEvent.startAt)}`;
  if (c.reason === "popular") return "Beliebt in der Community";
  if (c.reason === "recheck") return "Noch aktuell?";
  return "Neu in der Spieleliste";
}

export default function SwipeDeck({
  initial, onShowList,
}: {
  /** Erster Stapel, serverseitig geladen (buildSwipeDeck) */
  initial: { cards: DeckCard[]; remaining: number };
  onShowList?: () => void;
}) {
  const [cards, setCards] = useState<DeckCard[]>(initial.cards);
  const [remaining, setRemaining] = useState(initial.remaining);
  const [history, setHistory] = useState<Done[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [drag, setDrag] = useState({ dx: 0, dy: 0 });
  const [dragging, setDragging] = useState(false);
  const [fly, setFly] = useState<SwipeStatus | null>(null);
  const [match, setMatch] = useState<MatchHit | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const fetching = useRef(false);

  const load = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const res = await fetch("/api/games/swipe", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Stapel konnte nicht geladen werden");
      setCards(cur => {
        const have = new Set(cur.map(keyOf));
        return [...cur, ...(data.cards as DeckCard[]).filter(c => !have.has(keyOf(c)))];
      });
      setRemaining(data.remaining);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Stapel konnte nicht geladen werden");
    } finally {
      fetching.current = false;
    }
  }, []);

  const top = cards[0] ?? null;

  const send = useCallback(async (card: DeckCard, status: SwipeStatus | null, gameId?: string) => {
    const body = card.kind === "game" || gameId ? { gameId: gameId ?? (card as { id: string }).id, status } : { steamAppId: card.steamAppId, status };
    const res = await fetch("/api/games/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen");
    return data as { status: SwipeStatus | null; gameId?: string; slug?: string | null; matches?: GameMatchInfo[] };
  }, []);

  const decide = useCallback((status: SwipeStatus) => {
    const card = cards[0];
    if (!card || fly) return;
    setFly(status);
    // Nachladen, bevor der Stapel leer ist (der Server lässt Entschiedenes weg)
    const refill = cards.length - 1 < 5 && remaining - 1 > cards.length - 1;
    setTimeout(async () => {
      setCards(cur => cur.slice(1));
      setRemaining(r => Math.max(0, r - 1));
      setFly(null);
      setDrag({ dx: 0, dy: 0 });
      setFlipped(false);
      const before = card.kind === "game" ? card.myStatus : null;
      try {
        const data = await send(card, status);
        const adopted = card.kind === "steam" && data.gameId && data.slug ? { gameId: data.gameId, slug: data.slug } : null;
        setHistory(h => [...h.slice(-19), { card, before, adopted }]);
        const hit = (data.matches ?? []).find(m => m.isNew);
        if (hit) {
          const slug = card.kind === "game" ? card.slug : adopted?.slug ?? "";
          setMatch({ ...hit, gameName: card.name, gameSlug: slug });
        }
        if (adopted) toast.success(`${card.name} ist jetzt in der Spieleliste`);
        if (refill) load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
        setCards(cur => [card, ...cur]);
        setRemaining(r => r + 1);
      }
    }, FLY_MS);
  }, [cards, fly, send, remaining, load]);

  const undo = useCallback(async () => {
    const last = history[history.length - 1];
    if (!last || fly) return;
    setHistory(h => h.slice(0, -1));
    setCards(cur => [last.card, ...cur.filter(c => keyOf(c) !== keyOf(last.card))]);
    setRemaining(r => r + 1);
    setFlipped(false);
    try {
      await send(last.card, last.before, last.adopted?.gameId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rückgängig fehlgeschlagen");
    }
  }, [history, fly, send]);

  // Tastatur: ← Nicht meins, → Am Start, ↑ Würde ich holen, Z/Rücktaste Rückgängig, I/Leertaste umdrehen
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (match) return;
      if (e.key === "ArrowRight") { e.preventDefault(); decide("in"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); decide("out"); }
      else if (e.key === "ArrowUp") { e.preventDefault(); decide("wish"); }
      else if (e.key === "Backspace" || e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      else if (e.key.toLowerCase() === "i" || e.key === " ") { e.preventDefault(); setFlipped(f => !f); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo, match]);

  // Ziehen (Maus und Touch)
  function onPointerDown(e: React.PointerEvent) {
    if (flipped || fly) return;
    start.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) moved.current = true;
    setDrag({ dx, dy: Math.min(dy, 40) });
  }
  function onPointerUp() {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    const { dx, dy } = drag;
    if (!moved.current) { setFlipped(true); return; }
    if (dy < -THRESHOLD && Math.abs(dy) > Math.abs(dx)) decide("wish");
    else if (dx > THRESHOLD) decide("in");
    else if (dx < -THRESHOLD) decide("out");
    else setDrag({ dx: 0, dy: 0 });
  }

  const hint: SwipeStatus | null =
    fly ?? (drag.dy < -50 && Math.abs(drag.dy) > Math.abs(drag.dx) ? "wish" : drag.dx > 50 ? "in" : drag.dx < -50 ? "out" : null);
  const transform = fly
    ? fly === "in" ? "translate(140%, 0) rotate(18deg)" : fly === "out" ? "translate(-140%, 0) rotate(-18deg)" : "translate(0, -140%)"
    : `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx / 18}deg)`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
        <span>{remaining > 0 ? `Noch ${remaining} ${remaining === 1 ? "Spiel" : "Spiele"} zu entscheiden` : "Alles entschieden"}</span>
        <span className="hidden sm:inline">← nicht meins · ↑ würde ich holen · → am Start · I Details · Z rückgängig</span>
      </div>

      {/* Stapel */}
      <div className="relative h-[520px] max-w-sm mx-auto select-none">
        {!top && (
          <div className="absolute inset-0 rounded-3xl border border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center text-center p-6 gap-3">
            <span className="text-4xl" aria-hidden>🎉</span>
            <p className="font-display text-lg font-bold text-white">Alles durch!</p>
            <p className="text-xs text-gray-400">Neue Steam-Trends kommen täglich dazu. Bis dahin: schau, wer bei deinen Spielen am Start ist.</p>
            {onShowList && (
              <button type="button" onClick={onShowList} className="text-sm font-semibold text-teal-300 hover:text-teal-200">
                Zur Liste →
              </button>
            )}
          </div>
        )}
        {cards.slice(0, 3).reverse().map((c, i, arr) => {
          const depth = arr.length - 1 - i; // 0 = oberste Karte
          const isTop = depth === 0;
          return (
            <div
              key={keyOf(c)}
              className="absolute inset-0 rounded-3xl overflow-hidden border border-white/10 bg-[#141418] shadow-2xl"
              style={{
                transform: isTop ? transform : `translateY(${depth * 10}px) scale(${1 - depth * 0.04})`,
                transition: isTop && !dragging ? `transform ${FLY_MS}ms ease-out` : undefined,
                zIndex: 10 - depth,
                touchAction: isTop && !flipped ? "none" : "pan-y",
                cursor: isTop && !flipped ? "grab" : undefined,
              }}
              onPointerDown={isTop ? onPointerDown : undefined}
              onPointerMove={isTop ? onPointerMove : undefined}
              onPointerUp={isTop ? onPointerUp : undefined}
              onPointerCancel={isTop ? () => { start.current = null; setDragging(false); setDrag({ dx: 0, dy: 0 }); } : undefined}
            >
              {isTop && flipped ? (
                <CardBack card={c} onClose={() => setFlipped(false)} onRated={rating => setCards(cur => cur.map((x, k) => (k === 0 && x.kind === "game" ? { ...x, myRating: rating } : x)))} />
              ) : (
                <CardFront card={c} hint={isTop ? hint : null} />
              )}
            </div>
          );
        })}
      </div>

      {/* Knöpfe */}
      <div className="flex items-center justify-center gap-3">
        <RoundButton label="Rückgängig" onClick={undo} disabled={history.length === 0} small>
          <RotateCcw className="w-4 h-4" />
        </RoundButton>
        <RoundButton label={SWIPE_LABELS.out} onClick={() => decide("out")} disabled={!top} tone="out">
          <X className="w-6 h-6" />
        </RoundButton>
        <RoundButton label={SWIPE_LABELS.wish} onClick={() => decide("wish")} disabled={!top} tone="wish">
          <Heart className="w-5 h-5" />
        </RoundButton>
        <RoundButton label={SWIPE_LABELS.in} onClick={() => decide("in")} disabled={!top} tone="in">
          <Check className="w-6 h-6" />
        </RoundButton>
        <RoundButton label="Details" onClick={() => setFlipped(f => !f)} disabled={!top} small>
          <Info className="w-4 h-4" />
        </RoundButton>
      </div>

      {/* Match */}
      {match && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setMatch(null)}>
          <div className="w-full max-w-sm rounded-3xl border border-emerald-400/40 p-6 text-center space-y-4"
            style={{ background: "linear-gradient(160deg, rgba(16,185,129,0.25), #121216 65%)" }}
            onClick={e => e.stopPropagation()}>
            <p className="text-4xl" aria-hidden>🎮</p>
            <p className="font-display text-2xl font-black text-white">Match!</p>
            <p className="text-sm text-gray-300">
              {match.count} aus <span className="text-white font-semibold">{match.squadName}</span> sind bei{" "}
              <span className="text-white font-semibold">{match.gameName}</span> am Start.
            </p>
            <p className="text-xs text-gray-400">Mit dir: {match.others.map(o => o.name).join(", ")}</p>
            <div className="flex flex-col gap-2">
              {match.gameSlug && (
                <Link href={planRoundUrl(match.gameSlug, match.squadId)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white">
                  <CalendarPlus className="w-4 h-4" /> Runde planen
                </Link>
              )}
              <button type="button" onClick={() => setMatch(null)} className="text-sm text-gray-400 hover:text-white py-1">Weiter swipen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoundButton({
  label, onClick, disabled, children, tone, small,
}: {
  label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode; tone?: SwipeStatus; small?: boolean;
}) {
  const color = tone === "in"
    ? "text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/15"
    : tone === "wish"
      ? "text-rose-300 border-rose-400/40 hover:bg-rose-500/15"
      : tone === "out"
        ? "text-gray-300 border-white/20 hover:bg-white/[0.08]"
        : "text-gray-400 border-white/10 hover:bg-white/[0.06]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-full border flex items-center justify-center transition-colors disabled:opacity-30 bg-white/[0.03] ${color} ${small ? "w-10 h-10" : "w-14 h-14"}`}
    >
      {children}
    </button>
  );
}

const STAMP: Record<SwipeStatus, { text: string; cls: string }> = {
  in: { text: "AM START", cls: "text-emerald-300 border-emerald-300 -rotate-12 left-4" },
  out: { text: "NICHT MEINS", cls: "text-gray-200 border-gray-200 rotate-12 right-4" },
  wish: { text: "WÜRDE ICH HOLEN", cls: "text-rose-300 border-rose-300 left-1/2 -translate-x-1/2" },
};

function CardFront({ card, hint }: { card: DeckCard; hint: SwipeStatus | null }) {
  const f = card.fields;
  const players = formatPlayers(f.minPlayers, f.maxPlayers);
  const avg = card.kind === "game" && card.ratingCount >= MIN_RATINGS_FOR_AVERAGE ? averageRating(card.ratingSum, card.ratingCount) : null;
  const price = formatPrice(card.priceCents, card.priceCurrency);
  return (
    <div className="h-full flex flex-col">
      <div className="relative">
        <GameCover game={card.name} coverUrl={card.coverUrl} className="w-full aspect-[16/9]" rounded="rounded-none" fallbackVariant="plain" />
        <span className="absolute top-3 left-3 rounded-full bg-black/70 border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white">
          {reasonLabel(card)}
        </span>
        {card.discountPercent > 0 && (
          <span className="absolute top-3 right-3 rounded-md bg-rose-600 px-1.5 py-0.5 text-[11px] font-black text-white">−{card.discountPercent} %</span>
        )}
        {hint && (
          <span className={`absolute top-1/2 -translate-y-1/2 border-4 rounded-xl px-3 py-1 font-display text-2xl font-black tracking-wider bg-black/40 ${STAMP[hint].cls}`}>
            {STAMP[hint].text}
          </span>
        )}
      </div>
      <div className="flex-1 p-4 flex flex-col gap-2.5 min-h-0">
        <p className="font-display text-xl font-black text-white leading-tight line-clamp-2">{card.name}</p>
        <div className="flex flex-wrap gap-1.5">
          {f.genres.slice(0, 3).map(g => (
            <span key={g} className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-300">{GAME_GENRES[g]}</span>
          ))}
          {f.modes.map(m => (
            <span key={m} className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-200">{GAME_MODES[m]}</span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          {players && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {players}</span>}
          {avg !== null && <span className="flex items-center gap-1"><StarDisplay value={avg} className="w-3 h-3" /> {formatRating(avg)}</span>}
          {f.isFree === true ? <span>Kostenlos</span> : price && <span>{price}</span>}
        </div>
        {f.description && <p className="text-xs text-gray-400 line-clamp-3">{f.description}</p>}
        <div className="mt-auto flex items-center gap-2 min-h-[28px]">
          {card.kind === "game" && card.inPeople.length > 0 ? (
            <>
              <span className="flex -space-x-2">
                {card.inPeople.slice(0, 5).map(p => (
                  <PersonAvatar key={p.id} name={p.name} image={p.image} />
                ))}
              </span>
              <span className="text-[11px] text-emerald-300">{card.inCount} am Start</span>
            </>
          ) : (
            <span className="text-[11px] text-gray-500">{card.kind === "steam" ? "Noch nicht in unserer Liste — sag „Am Start“, dann kommt es rein" : "Noch niemand am Start"}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function PersonAvatar({ name, image }: { name: string; image: string | null }) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={name} title={name} className="w-7 h-7 rounded-full ring-2 ring-[#141418] object-cover" />
  ) : (
    <span title={name} className="w-7 h-7 rounded-full ring-2 ring-[#141418] bg-white/10 flex items-center justify-center text-[10px] text-gray-300">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function CardBack({ card, onClose, onRated }: { card: DeckCard; onClose: () => void; onRated: (rating: number | null) => void }) {
  const [correcting, setCorrecting] = useState(false);
  const [fields, setFields] = useState(card.fields);
  const [rating, setRating] = useState(card.kind === "game" ? card.myRating : null);
  const [saving, setSaving] = useState(false);
  const players = formatPlayers(fields.minPlayers, fields.maxPlayers);

  async function rate(next: number | null) {
    if (card.kind !== "game") return;
    const prev = rating;
    setRating(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(card.slug)}/reaction`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen");
      onRated(next);
      toast.success(next ? "Bewertung gespeichert" : "Bewertung entfernt");
    } catch (err) {
      setRating(prev);
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/[0.06]">
        <p className="font-display text-base font-bold text-white truncate">{card.name}</p>
        <button type="button" onClick={onClose} className="text-xs font-semibold text-teal-300 hover:text-teal-200 shrink-0">Zurück zur Karte</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {correcting && card.kind === "game" ? (
          <CorrectFieldsForm slug={card.slug} current={fields} onDone={saved => { if (saved) setFields(saved); setCorrecting(false); }} />
        ) : (
          <>
            {fields.description && <p className="text-gray-300 leading-relaxed">{fields.description}</p>}
            <dl className="grid grid-cols-2 gap-2">
              <Fact label="Spieler">{players ?? "unbekannt"}</Fact>
              <Fact label="Rundenlänge">{labelOf(SESSION_LENGTHS, fields.sessionLength) ?? "unbekannt"}</Fact>
              <Fact label="Plattformen">
                {fields.platforms.map(p => GAME_PLATFORMS[p]).join(", ") || "unbekannt"}
                {fields.crossplay && <span className="text-teal-300"> · Crossplay</span>}
              </Fact>
              <Fact label="Spielmodus">{fields.modes.map(m => GAME_MODES[m]).join(", ") || "unbekannt"}</Fact>
            </dl>

            {card.kind === "game" && card.nextEvent && (
              <Link href={`/tournament/${card.nextEvent.id}`} className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-400/30 px-3 py-2 text-amber-100">
                <CalendarPlus className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{card.nextEvent.title} · {fmtDate(card.nextEvent.startAt)}</span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </Link>
            )}

            {card.kind === "game" && card.inPeople.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-gray-500">Am Start ({card.inCount})</p>
                <div className="flex flex-wrap gap-1.5">
                  {card.inPeople.map(p => (
                    <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-white/[0.04] pr-2.5">
                      <PersonAvatar name={p.name} image={p.image} />
                      <span className="text-gray-200">{p.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {card.kind === "game" ? (
              <>
                <div className="space-y-1">
                  <p className="text-gray-500">{rating ? "Deine Bewertung" : "Schon gespielt? Bewerte es"}</p>
                  <StarRatingInput value={rating} onChange={rate} disabled={saving} size="md" />
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button type="button" onClick={() => setCorrecting(true)} className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white">
                    <Pencil className="w-3.5 h-3.5" /> Angaben korrigieren
                  </button>
                  <Link href={`/spiele/${card.slug}`} className="inline-flex items-center gap-0.5 font-semibold text-teal-300 hover:text-teal-200">
                    Zur Spielseite <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-gray-500">
                Steht noch nicht in unserer Spieleliste. Sag „Am Start“, dann nehmen wir es auf — danach kannst du es bewerten und
                Angaben ergänzen.{" "}
                <a href={`https://store.steampowered.com/app/${card.steamAppId}/`} target="_blank" rel="noreferrer" className="text-teal-300 hover:text-teal-200">
                  Auf Steam ansehen
                </a>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="text-white mt-0.5">{children}</dd>
    </div>
  );
}
