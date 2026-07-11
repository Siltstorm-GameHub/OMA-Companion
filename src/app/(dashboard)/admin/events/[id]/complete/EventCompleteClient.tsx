"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import SeriesIcon from "@/components/SeriesIcon";
import LivePollsPanel from "./LivePollsPanel";
import {
  ChevronLeft, CheckCircle2, Trophy, Vote,
  ListOrdered, GripVertical, Coins, AlertTriangle, RotateCcw, Equal, Lock,
} from "lucide-react";

/* ── Types ── */
type User = { id: string; name: string | null; username: string | null; image: string | null };
type PlacementReward = { place: number; coins: number; rankPoints: number };
type RewardsConfig = { participationCoins: number; placements: PlacementReward[] };
type PollConfig = { enabled: boolean; question: string; coins: number; rankPoints: number };
type MultiPollConfig = { label: string; question: string; coins: number; rankPoints: number; type: "player" | "spectator" };
type SeriesStatConfig = {
  participationPoints: number;
  participationCoins?: number;
  spectatorParticipationCoins?: number;
  stats: { field: string; pointsPer: number }[];
  mvpStatField?: string;
  defaultWinnerStatField?: string;
  defaultWinnerTargetField?: string;
  eventPlacementCoins?: { place: number; coins: number }[];
};

interface Props {
  eventId: string;
  eventTitle: string;
  seriesId: string | null;
  seriesName: string | null;
  seriesIcon?: string | null;
  registeredUsers: User[];
  spectatorUsers: User[];
  /** Alle User der Plattform — für Umfragen mit voterEligibility "all" im Live-Umfragen-Panel */
  allUsers: User[];
  tournamentStatFields: string[];
  userStats: Record<string, Record<string, number>>;
  format: string | null;
  /** Kombinierter Ø-Wert pro Runde (über alle Stat-Felder) je Spieler — nur bei format "avg_stats" */
  userAvgScore: Record<string, number>;
  seriesStatConfig: SeriesStatConfig | null;
  rewardsConfig: RewardsConfig;
  pollConfig: PollConfig;
  pollsConfig: MultiPollConfig[];
  pendingEventPolls: { label: string; endAt: string }[];
  spectatorRewardJson: { coins: number; rankPoints: number } | null;
  isAdmin: boolean;
  isReEdit: boolean;
  /** Event-Status aus der DB — bestimmt maßgeblich den Anzeigemodus (aktiv/umfrage/finished),
   * unabhängig davon ob completionData konsistent gepflegt wurde (z.B. nach manueller Statusänderung). */
  status: string;
  initialData: Record<string, unknown> | null;
  initialFinalRanking: string[] | null;
  initialRankingGroups: string[][] | null;
  initialFinalRankingNote: string | null;
}

const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";
const MEDALS = ["🥇", "🥈", "🥉"];

function userName(u: User) { return u.username ?? u.name ?? "?"; }

function Avatar({ u, size = 6 }: { u: User; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full shrink-0`;
  if (u.image) return <img src={u.image} alt="" className={`${cls} object-cover`} />;
  return (
    <div className={`${cls} bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-400`}>
      {userName(u)[0]?.toUpperCase()}
    </div>
  );
}

/** Build ranked groups from a flat order + set of users tied with the entry above them */
function computeGroups(order: string[], tiedAbove: Set<string>): string[][] {
  const groups: string[][] = [];
  for (const uid of order) {
    if (tiedAbove.has(uid) && groups.length > 0) {
      groups[groups.length - 1].push(uid);
    } else {
      groups.push([uid]);
    }
  }
  return groups;
}

/** Standard competition ranking: tied users share a placement, next group skips */
function computePlacementMap(groups: string[][]): Map<string, number> {
  const map = new Map<string, number>();
  let place = 1;
  for (const group of groups) {
    for (const uid of group) map.set(uid, place);
    place += group.length;
  }
  return map;
}

export default function EventCompleteClient({
  eventId, eventTitle, seriesId, seriesName, seriesIcon,
  registeredUsers, spectatorUsers, allUsers, tournamentStatFields, userStats, format, userAvgScore,
  seriesStatConfig, rewardsConfig, pollConfig, pollsConfig, pendingEventPolls, spectatorRewardJson,
  isAdmin, isReEdit, status,
  initialData, initialFinalRanking, initialRankingGroups, initialFinalRankingNote,
}: Props) {
  const router = useRouter();
  const isAvgFormat = format === "avg_stats";

  // Mode wird direkt vom Event-Status abgeleitet (nicht von completionData) — so zeigt die Seite
  // immer den richtigen Modus, auch wenn completionData z.B. durch eine manuelle Statusänderung
  // nicht mehr exakt zum Status passt.
  // Spielphase abgeschlossen, Umfragephase läuft noch: nur noch Umfrage + Endplatzierung editierbar.
  const isPollOnly = status === "umfrage";
  // Event komplett abgeschlossen: reine Ergebnis-Übersicht, nur die Finale Platzierung bleibt änderbar.
  const isFinishedSummary = status === "finished";
  // Event-Gewinner steht ab Abschluss der Spielphase fest und ist danach nicht mehr änderbar.
  const winnerLocked = isPollOnly || isFinishedSummary;

  // Läuft noch eine in-App-Umfrage (EventPoll), deren Abstimmungsfenster noch nicht vorbei ist?
  const openEventPolls = pendingEventPolls.filter(p => new Date(p.endAt) > new Date());
  // Im Poll-Only-Modus: schließt das Speichern hier die Umfragephase endgültig ab (Admin kann noch
  // offene Umfragen zwangsweise beenden; ohne offene Umfragen passiert das ohnehin automatisch)?
  const willFinalizePolls = isPollOnly && (isAdmin || openEventPolls.length === 0);

  /* ── Gewinner-Stat ── */
  const [winnerStatField, setWinnerStatField] = useState<string>(
    (initialData?.winnerStatField as string) ?? seriesStatConfig?.defaultWinnerStatField ?? ""
  );
  const [avgDirection, setAvgDirection] = useState<"high" | "low">(
    (initialData?.avgWinnerDirection as "high" | "low") ?? "high"
  );
  const [seriesWinnerTargetField, setSeriesWinnerTargetField] = useState<string>(
    (initialData?.seriesWinnerTargetField as string) ?? seriesStatConfig?.defaultWinnerTargetField ?? ""
  );

  /* ── MVP ── */
  const [mvpUserId, setMvpUserId] = useState<string>(
    (initialData?.mvpUserId as string) ?? ""
  );

  /* ── Poll (legacy single) ── */
  const [pollExcluded, setPollExcluded] = useState<Set<string>>(() =>
    new Set((initialData?.pollExcludedUserIds as string[] | undefined) ?? [])
  );
  const [pollVotes, setPollVotes] = useState<Record<string, number>>(() => {
    if (!isReEdit || !initialData) return {};
    const old: Record<string, number> = {};
    const winners: string[] = (initialData.pollWinnerIds as string[] | undefined) ??
      (initialData.pollWinnerId ? [initialData.pollWinnerId as string] : []);
    for (const id of winners) old[id] = 1;
    return old;
  });

  /* ── Zuschauer-Anwesenheit ── */
  const [spectatorAttended, setSpectatorAttended] = useState<Set<string>>(() => {
    // Re-Edit: die tatsächlich erfasste Anwesenheit übernehmen, nicht wieder alle vorauswählen
    if (isReEdit && initialData?.spectatorAttendedIds) {
      return new Set(initialData.spectatorAttendedIds as string[]);
    }
    return new Set(spectatorUsers.map(u => u.id)); // Erstabschluss: alle als anwesend vorauswählen
  });

  /* ── Ranking ── */
  // Flat order (derived from initial groups if provided).
  // IDs in finalRankingJson that no longer exist (e.g. merged stub accounts) are dropped;
  // registered users missing from the saved ranking are appended at the end.
  const [rankingOrder, setRankingOrder] = useState<string[]>(() => {
    const registeredIds = new Set(registeredUsers.map(u => u.id));
    if (initialFinalRanking?.length) {
      const valid = initialFinalRanking.filter(id => registeredIds.has(id));
      const missing = registeredUsers.map(u => u.id).filter(id => !valid.includes(id));
      return [...valid, ...missing];
    }
    return registeredUsers.map(u => u.id);
  });
  const [tiedAbove, setTiedAbove] = useState<Set<string>>(() => {
    // Reconstruct tied set from initialRankingGroups
    const tied = new Set<string>();
    if (initialRankingGroups) {
      for (const group of initialRankingGroups) {
        for (let i = 1; i < group.length; i++) tied.add(group[i]);
      }
    }
    return tied;
  });
  const [rankingNote, setRankingNote] = useState(initialFinalRankingNote ?? "");
  const [rankingManuallyEdited, setRankingManuallyEdited] = useState(!!initialFinalRanking?.length);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Auto-sort on first render if:
  // - no saved ranking exists yet, OR
  // - saved ranking was missing users (e.g. merged stub accounts) → re-sort to place them correctly
  const hasMissingUsers = (() => {
    if (!initialFinalRanking?.length) return false;
    const savedIds = new Set(initialFinalRanking);
    return registeredUsers.some(u => !savedIds.has(u.id));
  })();
  useEffect(() => {
    if ((isAvgFormat || winnerStatField) && (!initialFinalRanking?.length || hasMissingUsers)) {
      autoSort(winnerStatField);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [loading, setLoading] = useState(false);

  /* ── Derived ── */
  const seriesStatFields = (seriesStatConfig?.stats ?? []).map(s => s.field);

  const previewWinners = useMemo(() => {
    if (isAvgFormat) {
      let bestVal: number | null = null;
      let best: string[] = [];
      for (const [uid, v] of Object.entries(userAvgScore)) {
        const better = bestVal === null || (avgDirection === "high" ? v > bestVal : v < bestVal);
        if (better) { bestVal = v; best = [uid]; }
        else if (v === bestVal) { best.push(uid); }
      }
      return best;
    }
    if (!winnerStatField) return [];
    let bestVal = -Infinity;
    let best: string[] = [];
    for (const [uid, stats] of Object.entries(userStats)) {
      const v = stats[winnerStatField] ?? 0;
      if (v > bestVal) { bestVal = v; best = [uid]; }
      else if (v === bestVal && bestVal > -Infinity) { best.push(uid); }
    }
    return best;
  }, [isAvgFormat, avgDirection, userAvgScore, winnerStatField, userStats]);

  const pollEligible = useMemo(
    () => registeredUsers.filter(u => !pollExcluded.has(u.id)),
    [registeredUsers, pollExcluded]
  );

  const pollWinners = useMemo(() => {
    if (!pollEligible.length) return [];
    const maxVotes = Math.max(...pollEligible.map(u => pollVotes[u.id] ?? 0));
    if (maxVotes <= 0) return [];
    return pollEligible.filter(u => (pollVotes[u.id] ?? 0) === maxVotes).map(u => u.id);
  }, [pollEligible, pollVotes]);

  // Muss der Sieger einer (manuell einzutragenden) Umfrage jetzt noch nicht feststehen?
  const canDeferPoll = !isReEdit && pollConfig.enabled && pollWinners.length === 0;
  // Bleibt das Event nach diesem Speichern in der Umfragephase (Status "umfrage")?
  const pollPhasePending = canDeferPoll || (!isReEdit && openEventPolls.length > 0);

  const rankingGroups = useMemo(() => computeGroups(rankingOrder, tiedAbove), [rankingOrder, tiedAbove]);
  const placementMap  = useMemo(() => computePlacementMap(rankingGroups), [rankingGroups]);

  // Teilnahme-/Zuschauer-Münzen: bei Events innerhalb einer Reihe seriesweit fix aus der
  // Gesamttabellen-Konfiguration, sonst aus den Event-eigenen Belohnungen
  const effectiveParticipationCoins = seriesId ? (seriesStatConfig?.participationCoins ?? 0) : rewardsConfig.participationCoins;
  const effectiveSpectatorCoins = seriesId ? (seriesStatConfig?.spectatorParticipationCoins ?? 0) : (spectatorRewardJson?.coins ?? 0);

  // Platzierungs-Belohnung für dieses einzelne Event: bei Events innerhalb einer Reihe gibt es hier
  // höchstens die seriesweit konfigurierten Bonus-Münzen (keine Rang-Punkte) — die volle Belohnung
  // (Münzen + Rang-Punkte) kommt erst bei Abschluss der gesamten Reihe anhand der Endplatzierung.
  function getPlacementReward(place: number): PlacementReward | undefined {
    if (seriesId) {
      const r = seriesStatConfig?.eventPlacementCoins?.find(p => p.place === place);
      return r && r.coins > 0 ? { place, coins: r.coins, rankPoints: 0 } : undefined;
    }
    return rewardsConfig.placements.find(p => p.place === place);
  }

  /* ── Ranking auto-sort with tie detection ── */
  function scoreOf(uid: string, field: string): number {
    return isAvgFormat ? (userAvgScore[uid] ?? 0) : (userStats[uid]?.[field] ?? 0);
  }
  function autoSort(field = winnerStatField) {
    if (!isAvgFormat && !field) return;
    const dirMul = isAvgFormat && avgDirection === "low" ? 1 : -1;
    const sorted = [...rankingOrder].sort(
      (a, b) => dirMul * (scoreOf(a, field) - scoreOf(b, field))
    );
    const newTied = new Set<string>();
    for (let i = 1; i < sorted.length; i++) {
      if (scoreOf(sorted[i], field) === scoreOf(sorted[i - 1], field)) {
        newTied.add(sorted[i]);
      }
    }
    setTiedAbove(newTied);
    setRankingOrder(sorted);
    setRankingManuallyEdited(false);
  }

  function toggleTied(uid: string) {
    setRankingManuallyEdited(true);
    setTiedAbove(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setRankingManuallyEdited(true);
    setRankingOrder(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      // Moving up: the uid at idx was tied with idx-1 → no longer relevant; clear both ties
      const uid = next[idx];      // was at idx-1, now at idx
      const moved = next[idx - 1]; // was at idx, now at idx-1
      setTiedAbove(t => {
        const s = new Set(t);
        s.delete(uid); s.delete(moved);
        return s;
      });
      return next;
    });
  }
  function moveDown(idx: number) {
    setRankingManuallyEdited(true);
    setRankingOrder(prev => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      const uid = next[idx];
      const moved = next[idx + 1];
      setTiedAbove(t => {
        const s = new Set(t);
        s.delete(uid); s.delete(moved);
        return s;
      });
      return next;
    });
  }

  /* ── Submit ── */
  async function handleConfirm(pollOnly = false) {
    setLoading(true);

    try {
      const hasPollVotes = pollWinners.length > 0;
      const res = await fetch(`/api/admin/events/${eventId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mvpUserId:               mvpUserId || undefined,
          winnerStatField:         isAvgFormat ? undefined : (winnerStatField || undefined),
          avgWinnerDirection:      isAvgFormat ? avgDirection : undefined,
          seriesWinnerTargetField: seriesWinnerTargetField || undefined,
          pollWinnerIds:           !pollOnly && pollConfig.enabled && hasPollVotes ? pollWinners : undefined,
          pollLabel:               pollConfig.enabled ? pollConfig.question : undefined,
          pollBonusCoins:          pollConfig.enabled ? pollConfig.coins : undefined,
          pollBonusRankPoints:     pollConfig.enabled ? pollConfig.rankPoints : undefined,
          pollExcludedUserIds:     pollConfig.enabled && pollExcluded.size > 0 ? [...pollExcluded] : undefined,
          spectatorAttendedIds:    spectatorUsers.length > 0 ? [...spectatorAttended] : undefined,
          finalRanking:            rankingOrder.length > 0 ? rankingOrder : undefined,
          finalRankingGroups:      rankingGroups.length > 0 ? rankingGroups : undefined,
          finalRankingNote:        rankingNote || undefined,
          participationCoins:      seriesId ? undefined : rewardsConfig.participationCoins,
          placements:              rewardsConfig.placements,
          closeOpenPolls:          isPollOnly ? isAdmin : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Fehler beim Abschließen");
        return;
      }
      if (pollOnly || (!isReEdit && pollPhasePending)) {
        toast.success(`Spielphase abgeschlossen – Umfrage läuft, Punkte kommen nach deren Abschluss dazu`);
      } else if (willFinalizePolls) {
        toast.success(`"${eventTitle}" vollständig abgeschlossen – Umfrage-Belohnungen vergeben`);
      } else if (isPollOnly) {
        toast.success(`Änderungen für "${eventTitle}" gespeichert – Umfrage läuft noch weiter`);
      } else if (isFinishedSummary) {
        toast.success(`"${eventTitle}" bestätigt`);
      } else {
        toast.success(isReEdit ? `"${eventTitle}" aktualisiert` : `"${eventTitle}" abgeschlossen`);
      }
      router.push(`/admin/events/${eventId}`);
    } finally {
      setLoading(false);
    }
  }

  /* ── Render ── */
  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {seriesId ? (
          <Link href={`/admin/series/${seriesId}`} className="flex items-center gap-1 hover:text-gray-300 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <SeriesIcon name={seriesIcon} className="w-3.5 h-3.5" />
            {seriesName}
          </Link>
        ) : (
          <Link href="/admin/events" className="flex items-center gap-1 hover:text-gray-300 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Standalone Events
          </Link>
        )}
        <span>/</span>
        <Link href={`/admin/events/${eventId}`} className="hover:text-gray-300 transition-colors truncate max-w-[160px]">
          {eventTitle}
        </Link>
        <span>/</span>
        <span className="text-gray-300">
          {isPollOnly ? "Umfrage nachtragen" : isFinishedSummary ? "Ergebnisse" : "Event abschließen"}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-teal-400" />
        <h1 className="text-lg font-bold text-white">
          {isPollOnly ? "Umfrage nachtragen" : isFinishedSummary ? "Ergebnisse" : "Event abschließen"}
        </h1>
      </div>

      {/* Status banners */}
      {isPollOnly && (
        <div className="flex items-start gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-xs text-violet-300">
          <Vote className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Die <strong>Spielphase ist bereits abgeschlossen</strong> – Teilnahmen, Gesamttabelle und der Event-Gewinner
            wurden bereits festgelegt und sind nicht mehr änderbar. Umfrageergebnisse unten einsehen bzw. Stimmen
            nachtragen und Finale Platzierung bei Bedarf anpassen (z.B. Disqualifikation). Beim Speichern wird
            {isAdmin ? " die Umfragephase beendet und das Event komplett abgeschlossen." : " die Umfragephase abgeschlossen, sobald alle Umfragen abgelaufen sind."}
          </span>
        </div>
      )}
      {isFinishedSummary && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Dieses Event ist abgeschlossen. Unten eine Übersicht der vergebenen Belohnungen — nur die Finale
            Platzierung kann bei Bedarf noch angepasst werden (z.B. bei nachträglicher Disqualifikation).
          </span>
        </div>
      )}
      {openEventPolls.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300">
          <Vote className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {openEventPolls.length === 1 ? "Es läuft noch eine Umfrage" : "Es laufen noch Umfragen"} auf der Event-Seite: {" "}
            {openEventPolls.map(p => `„${p.label}" bis ${new Date(p.endAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })}`).join(", ")}.
            {" "}{isPollOnly && isAdmin
              ? "Als Admin wird sie beim Speichern hier trotzdem sofort zwangsweise beendet und mit abgeschlossen."
              : <>Der Status bleibt auf <strong>„Umfrage"</strong>, die zusätzlichen Ligapunkte des Umfrage-Siegers werden erst nach Ablauf vergeben — einfach nach Fristende hier erneut speichern.</>}
          </span>
        </div>
      )}

      {(isPollOnly || isFinishedSummary) && (
        <LivePollsPanel
          eventId={eventId}
          isAdmin={isAdmin}
          readOnly={isFinishedSummary}
          registeredUsers={registeredUsers}
          spectatorUsers={spectatorUsers}
          allUsers={allUsers}
        />
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

        {/* ── Left column ── */}
        <div className="space-y-4">

          {/* Gewinner-Stat */}
          {(tournamentStatFields.length > 0 || isAvgFormat) && (
            <div className={`rounded-xl p-4 space-y-3 ${winnerLocked ? "opacity-70" : ""}`} style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">Event-Gewinner</span>
                {winnerLocked && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-500 ml-auto">
                    <Lock className="w-3 h-3" /> gesperrt
                  </span>
                )}
              </div>
              {winnerLocked && (
                <p className="text-[10px] text-gray-600 -mt-1">
                  Wurde beim Abschluss der Spielphase festgelegt und ist nicht mehr änderbar.
                </p>
              )}
              {isAvgFormat ? (
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">Wer gewinnt beim Durchschnittswert?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "high", label: "Höchster Ø gewinnt" },
                      { value: "low",  label: "Niedrigster Ø gewinnt" },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={winnerLocked}
                        onClick={() => {
                          setAvgDirection(opt.value);
                          if (!rankingManuallyEdited) autoSort();
                        }}
                        className={`rounded-lg px-3 py-2 text-xs font-medium border transition-colors disabled:cursor-not-allowed ${
                          avgDirection === opt.value
                            ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                            : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">
                    Bewertet wird der kombinierte Durchschnitt pro Runde über alle Stat-Felder (nicht die Summe).
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">Welches Stat-Feld bestimmt den Gewinner?</label>
                  <select
                    value={winnerStatField}
                    disabled={winnerLocked}
                    onChange={e => {
                      setWinnerStatField(e.target.value);
                      if (!rankingManuallyEdited && e.target.value) autoSort(e.target.value);
                    }}
                    className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <option value="">– kein Gewinner-Stat –</option>
                    {tournamentStatFields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              )}
              {seriesStatFields.length > 0 && (
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">…Sieg in Gesamttabelle tracken als</label>
                  <select
                    value={seriesWinnerTargetField}
                    disabled={winnerLocked}
                    onChange={e => setSeriesWinnerTargetField(e.target.value)}
                    className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <option value="">– nicht tracken –</option>
                    {seriesStatFields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              )}
              {previewWinners.length > 0 && (isAvgFormat || winnerStatField) && (
                <div className="flex flex-col gap-0.5">
                  <p className="text-[10px] text-gray-500">{previewWinners.length > 1 ? "Aktuelle Gewinner (Gleichstand):" : "Aktueller Gewinner:"}</p>
                  {previewWinners.map(uid => {
                    const u = registeredUsers.find(u => u.id === uid);
                    return (
                      <p key={uid} className="text-xs text-amber-400 flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 shrink-0" />
                        <strong>{u ? userName(u) : uid}</strong>
                        {" "}({isAvgFormat ? `Ø ${(userAvgScore[uid] ?? 0).toFixed(2)}` : `${userStats[uid]?.[winnerStatField] ?? 0} ${winnerStatField}`})
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MVP */}
          {seriesStatConfig?.mvpStatField && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(20,184,166,0.05)", border: "1px solid rgba(20,184,166,0.15)" }}>
              <div className="flex items-center gap-2">
                <RankPointsIcon size={14} />
                <span className="text-xs font-semibold text-teal-300">
                  MVP{" "}
                  <span className="font-normal text-gray-500">(+1 auf „{seriesStatConfig.mvpStatField}" in Gesamttabelle)</span>
                </span>
              </div>
              {isFinishedSummary ? (
                mvpUserId ? (
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
                    <Avatar u={registeredUsers.find(u => u.id === mvpUserId) ?? { id: mvpUserId, name: mvpUserId, username: null, image: null }} size={6} />
                    <span className="text-sm text-white flex-1 truncate">{userName(registeredUsers.find(u => u.id === mvpUserId) ?? { id: mvpUserId, name: mvpUserId, username: null, image: null })}</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Kein MVP</p>
                )
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors">
                    <input type="radio" name="mvp" value="" checked={mvpUserId === ""} onChange={() => setMvpUserId("")} className="accent-teal-500" />
                    <span className="text-sm text-gray-500 italic">Kein MVP</span>
                  </label>
                  {registeredUsers.map(u => (
                    <label key={u.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      mvpUserId === u.id ? "bg-teal-500/10 border border-teal-500/20" : "hover:bg-white/[0.03]"
                    }`}>
                      <input type="radio" name="mvp" value={u.id} checked={mvpUserId === u.id} onChange={() => setMvpUserId(u.id)} className="accent-teal-500 shrink-0" />
                      <Avatar u={u} size={6} />
                      <span className="text-sm text-white flex-1 truncate">{userName(u)}</span>
                      {winnerStatField && userStats[u.id]?.[winnerStatField] != null && (
                        <span className="text-xs text-gray-500 tabular-nums shrink-0">
                          {userStats[u.id][winnerStatField]} {winnerStatField}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Poll (legacy – nur wenn kein pollsConfig vorhanden) */}
          {pollConfig.enabled && pollsConfig.length === 0 && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)" }}>
              <div className="flex items-center gap-2">
                <Vote className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-semibold text-violet-300">
                  Poll: „{pollConfig.question}"
                </span>
                {isPollOnly && <span className="text-[10px] text-violet-400/60 ml-auto">ausstehend</span>}
              </div>

              {!isFinishedSummary && (
                <>
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1.5">Aus Abstimmung ausschließen:</p>
                    <div className="flex flex-wrap gap-2">
                      {registeredUsers.map(u => (
                        <label key={u.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs cursor-pointer transition-colors select-none ${
                          pollExcluded.has(u.id)
                            ? "bg-red-900/30 border border-red-700/40 text-red-300"
                            : "bg-white/[0.03] border border-white/[0.08] text-gray-400 hover:border-white/20"
                        }`}>
                          <input
                            type="checkbox"
                            checked={pollExcluded.has(u.id)}
                            onChange={e => {
                              setPollExcluded(prev => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(u.id); else next.delete(u.id);
                                return next;
                              });
                            }}
                            className="accent-red-500 w-3 h-3"
                          />
                          {userName(u)}
                        </label>
                      ))}
                    </div>
                  </div>

                  {pollEligible.length > 0 && (
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1.5">Stimmen eintragen:</p>
                      <div className="space-y-1.5">
                        {pollEligible.map(u => (
                          <div key={u.id} className="flex items-center gap-3">
                            <Avatar u={u} size={5} />
                            <span className="flex-1 text-sm text-white truncate">{userName(u)}</span>
                            <input
                              type="number"
                              min={0}
                              value={pollVotes[u.id] ?? 0}
                              onChange={e => setPollVotes(prev => ({ ...prev, [u.id]: Math.max(0, Number(e.target.value)) }))}
                              className="w-16 rounded-lg px-2 py-1.5 text-sm text-white text-center bg-gray-800 border border-gray-700 focus:border-violet-500/50 outline-none transition-colors"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pollEligible.length === 0 && (
                    <p className="text-xs text-gray-600 italic">Alle Teilnehmer ausgeschlossen.</p>
                  )}
                </>
              )}

              {pollWinners.length > 0 ? (
                <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-2 space-y-1">
                  <p className="text-[11px] text-violet-400 font-semibold">
                    {pollWinners.length === 1 ? "Gewinner" : `Unentschieden – alle ${pollWinners.length} gewinnen`}
                  </p>
                  {pollWinners.map(id => {
                    const u = registeredUsers.find(u => u.id === id);
                    if (!u) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 text-sm text-white">
                        <Avatar u={u} size={5} />
                        {userName(u)}
                        {!isFinishedSummary && <span className="text-xs text-gray-500">({pollVotes[id] ?? 0} Stimmen)</span>}
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-gray-500 mt-1">
                    Belohnung: {pollConfig.coins > 0 ? `${pollConfig.coins} Münzen` : ""}
                    {pollConfig.coins > 0 && pollConfig.rankPoints > 0 ? " + " : ""}
                    {pollConfig.rankPoints > 0 ? `${pollConfig.rankPoints} Punkte` : ""}
                  </p>
                </div>
              ) : isFinishedSummary ? (
                <p className="text-xs text-gray-600 italic">Kein Sieger.</p>
              ) : null}
            </div>
          )}

          {/* Zuschauer-Anwesenheit */}
          {spectatorUsers.length > 0 && spectatorRewardJson && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(20,184,166,0.05)", border: "1px solid rgba(20,184,166,0.15)" }}>
              <p className="text-xs font-semibold text-teal-300">
                👁️ Zuschauer-Anwesenheit
                <span className="font-normal text-gray-500 ml-1">({effectiveSpectatorCoins} Münzen{spectatorRewardJson.rankPoints > 0 ? ` + ${spectatorRewardJson.rankPoints} RP` : ""} für Anwesende)</span>
              </p>
              {isFinishedSummary ? (
                <div className="space-y-1">
                  {spectatorUsers.filter(u => spectatorAttended.has(u.id)).map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
                      <Avatar u={u} size={5} />
                      <span className="text-sm text-white flex-1 truncate">{userName(u)}</span>
                    </div>
                  ))}
                  {spectatorUsers.every(u => !spectatorAttended.has(u.id)) && (
                    <p className="text-sm text-gray-500 italic">Niemand anwesend.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {spectatorUsers.map(u => (
                    <label key={u.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      spectatorAttended.has(u.id) ? "bg-teal-500/10 border border-teal-500/20" : "bg-white/[0.03] border border-transparent hover:border-white/[0.08]"
                    }`}>
                      <input type="checkbox" checked={spectatorAttended.has(u.id)}
                        onChange={e => setSpectatorAttended(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(u.id); else next.delete(u.id);
                          return next;
                        })}
                        className="accent-teal-500 shrink-0" />
                      <Avatar u={u} size={5} />
                      <span className="text-sm text-white flex-1 truncate">{userName(u)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary (bei isFinishedSummary ausgeblendet — Info steht direkt in den Karten oben
              sowie in der Finale-Platzierung-Spalte) */}
          {!isFinishedSummary && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                {isPollOnly ? "Wird vergeben (Umfrage)" : "Wird vergeben"}
              </p>
              {isPollOnly ? (
                <ul className="space-y-1 text-xs text-gray-400">
                  {pollWinners.length > 0 ? (
                    <li className="flex items-center gap-2">
                      <Vote className="w-3 h-3 text-violet-400 shrink-0" />
                      Poll-Sieger: {pollWinners.map(id => userName(registeredUsers.find(u => u.id === id) ?? { id: "", name: id, username: null, image: null })).join(", ")}
                      {" "}({pollConfig.coins > 0 ? `${pollConfig.coins} Münzen` : ""}{pollConfig.coins > 0 && pollConfig.rankPoints > 0 ? " + " : ""}{pollConfig.rankPoints > 0 ? `${pollConfig.rankPoints} Punkte` : ""})
                    </li>
                  ) : (
                    <li className="text-gray-600 italic">Stimmen eingeben um Gewinner zu bestimmen.</li>
                  )}
                </ul>
              ) : (
                <ul className="space-y-1 text-xs text-gray-400">
                  {effectiveParticipationCoins > 0 && (
                    <li className="flex items-center gap-2">
                      <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                      Alle {registeredUsers.length} Teilnehmer: {effectiveParticipationCoins} Münzen
                    </li>
                  )}
                  {rankingGroups.map((group, gi) => {
                    const place = placementMap.get(group[0]) ?? gi + 1;
                    const reward = getPlacementReward(place);
                    if (!reward || (reward.coins === 0 && reward.rankPoints === 0)) return null;
                    const names = group.map(id => userName(registeredUsers.find(u => u.id === id) ?? { id: "", name: id, username: null, image: null }));
                    return (
                      <li key={gi} className="flex items-center gap-2">
                        <span className="shrink-0">{MEDALS[place - 1] ?? `${place}.`}</span>
                        {names.join(" & ")}:{" "}
                        {reward.coins > 0 ? `${reward.coins} Münzen` : ""}
                        {reward.coins > 0 && reward.rankPoints > 0 ? " + " : ""}
                        {reward.rankPoints > 0 ? `${reward.rankPoints} Punkte` : ""}
                      </li>
                    );
                  })}
                  {seriesId && (
                    <li className="flex items-center gap-2 text-gray-500 italic">
                      <ListOrdered className="w-3 h-3 shrink-0" />
                      Endplatzierung der Eventreihe (Punkte + weitere Münzen): erst bei Abschluss der gesamten Eventreihe
                    </li>
                  )}
                  {pollConfig.enabled && (
                    <li className="flex items-center gap-2">
                      <Vote className="w-3 h-3 text-violet-400 shrink-0" />
                      Poll-Sieger:{" "}
                      {pollConfig.coins > 0 ? `${pollConfig.coins} Münzen` : ""}
                      {pollConfig.coins > 0 && pollConfig.rankPoints > 0 ? " + " : ""}
                      {pollConfig.rankPoints > 0 ? `${pollConfig.rankPoints} Punkte` : ""}
                      {pollConfig.coins === 0 && pollConfig.rankPoints === 0 ? "keine Belohnung" : ""}
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}

          {/* Confirm buttons */}
          <div className="space-y-2">
            <button
              onClick={() => handleConfirm(false)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-600 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading
                ? "Wird gespeichert…"
                : willFinalizePolls
                ? "Umfragephase abschließen & Event beenden"
                : isFinishedSummary
                ? "Ergebnisse bestätigen"
                : isPollOnly
                ? "Änderungen speichern"
                : pollPhasePending
                ? "Spielphase abschließen – Umfrage startet"
                : "Abschließen & Belohnungen vergeben"}
            </button>
            {/* Secondary: confirm game phase now, decide poll winner later */}
            {canDeferPoll && (
              <button
                onClick={() => handleConfirm(true)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium text-gray-400 border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:text-gray-200 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Nur Spielphase abschließen, Umfrage-Sieger später eintragen
              </button>
            )}
          </div>
        </div>

        {/* ── Right column: Finale Platzierung ── */}
        <div className="space-y-3">
          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <ListOrdered className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-xs font-semibold text-blue-300">Finale Platzierung</span>
              {!rankingManuallyEdited && (isAvgFormat || winnerStatField) && (
                <span className="text-[10px] text-gray-600">
                  — auto-sortiert nach „{isAvgFormat ? `Ø (${avgDirection === "high" ? "höchster" : "niedrigster"} gewinnt)` : winnerStatField}"
                </span>
              )}
              {rankingManuallyEdited && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400">
                  <AlertTriangle className="w-3 h-3" /> manuell geändert
                </span>
              )}
              {rankingManuallyEdited && (isAvgFormat || winnerStatField) && (
                <button
                  onClick={() => autoSort()}
                  className="ml-auto flex items-center gap-1 text-[10px] text-blue-400/60 hover:text-blue-300 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Auto-Sortierung zurücksetzen
                </button>
              )}
            </div>

            {tiedAbove.size > 0 && (
              <p className="text-[10px] text-blue-400/60 flex items-center gap-1">
                <Equal className="w-3 h-3" />
                {tiedAbove.size} Gleichstand{tiedAbove.size > 1 ? "s" : ""} – beide erhalten dieselbe Platzierung
              </p>
            )}

            {seriesId && (
              <p className="text-[10px] text-gray-600">
                Fließt in die Gesamttabelle der Reihe ein. Die volle Platzierungs-Belohnung („Belohnungen
                (Endplatzierung der Eventreihe)") wird erst bei Abschluss der gesamten Eventreihe anhand der
                finalen Gesamtplatzierung vergeben — zusätzliche, seriesweit konfigurierte Platzierungs-Münzen
                für dieses einzelne Event (falls eingestellt) werden direkt hier vergeben.
              </p>
            )}

            <p className="text-[10px] text-gray-600">Drag & Drop oder Pfeile nutzen · <Equal className="w-3 h-3 inline" /> = Gleichstand</p>

            {registeredUsers.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">Keine Teilnehmer registriert.</p>
            ) : (
              <div className="space-y-1">
                {rankingOrder.map((uid, idx) => {
                  const u = registeredUsers.find(u => u.id === uid);
                  if (!u) return null;
                  const place = placementMap.get(uid) ?? idx + 1;
                  const reward = getPlacementReward(place);
                  const isTied = tiedAbove.has(uid);

                  return (
                    <div key={uid}>
                      {/* Tied-with-above indicator */}
                      {isTied && (
                        <div className="flex items-center gap-1 py-0.5 px-8">
                          <div className="flex-1 border-t border-blue-500/20 border-dashed" />
                          <Equal className="w-3 h-3 text-blue-400/40" />
                          <div className="flex-1 border-t border-blue-500/20 border-dashed" />
                        </div>
                      )}
                      <div
                        draggable
                        onDragStart={() => setDragIdx(idx)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => {
                          if (dragIdx === null || dragIdx === idx) return;
                          setRankingManuallyEdited(true);
                          setRankingOrder(prev => {
                            const next = [...prev];
                            const [removed] = next.splice(dragIdx, 1);
                            next.splice(idx, 0, removed);
                            return next;
                          });
                          // Clear ties for moved elements
                          setTiedAbove(t => {
                            const s = new Set(t);
                            s.delete(uid);
                            if (rankingOrder[dragIdx]) s.delete(rankingOrder[dragIdx]);
                            return s;
                          });
                          setDragIdx(null);
                        }}
                        className={`flex items-center gap-2 px-2 py-2 rounded-lg bg-white/[0.03] border transition-colors select-none ${
                          isTied ? "border-blue-500/20 bg-blue-500/5" : "border-white/[0.05]"
                        } cursor-grab active:cursor-grabbing`}
                      >
                        <GripVertical className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                        <span className="text-sm w-6 text-center shrink-0">
                          {place <= 3
                            ? <span>{MEDALS[place - 1]}</span>
                            : <span className="text-xs text-gray-500">{place}</span>
                          }
                        </span>
                        <Avatar u={u} size={5} />
                        <span className="text-xs text-white flex-1 truncate">{userName(u)}</span>
                        {isAvgFormat && userAvgScore[uid] != null && (
                          <span className="text-[10px] text-gray-500 tabular-nums shrink-0">
                            Ø {userAvgScore[uid].toFixed(2)}
                          </span>
                        )}
                        {!isAvgFormat && winnerStatField && userStats[uid]?.[winnerStatField] != null && (
                          <span className="text-[10px] text-gray-500 tabular-nums shrink-0">
                            {userStats[uid][winnerStatField]} {winnerStatField}
                          </span>
                        )}
                        <span className="flex flex-col items-end shrink-0 ml-1 gap-0">
                          {effectiveParticipationCoins > 0 && (
                            <span className="text-[10px] text-amber-400 tabular-nums leading-tight">
                              +{(reward?.coins ?? 0) + effectiveParticipationCoins} <CoinIcon size={11} />
                            </span>
                          )}
                          {reward && reward.rankPoints > 0 && (
                            <span className="text-[10px] text-teal-400 tabular-nums leading-tight">
                              +{reward.rankPoints} <RankPointsIcon size={11} />
                            </span>
                          )}
                        </span>
                        <div className="flex gap-0.5 shrink-0">
                            {/* Tie toggle (only for non-first rows) */}
                            {idx > 0 && (
                              <button
                                onClick={() => toggleTied(uid)}
                                title={isTied ? "Gleichstand aufheben" : "Gleichstand mit Platz darüber"}
                                className={`p-0.5 transition-colors ${isTied ? "text-blue-400" : "text-gray-600 hover:text-blue-400"}`}
                              >
                                <Equal className="w-3 h-3" />
                              </button>
                            )}
                            <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-0.5 text-gray-600 hover:text-white disabled:opacity-20 transition-colors">▲</button>
                            <button onClick={() => moveDown(idx)} disabled={idx === rankingOrder.length - 1} className="p-0.5 text-gray-600 hover:text-white disabled:opacity-20 transition-colors">▼</button>
                          </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ranking note */}
            <div>
                <label className="text-[11px] text-gray-500 block mb-1">
                  Begründung / Notiz (optional)
                </label>
                <textarea
                  value={rankingNote}
                  onChange={e => setRankingNote(e.target.value)}
                  placeholder="z.B. Spieler X nachträglich disqualifiziert wegen …"
                  rows={2}
                  className={`${inputCls} resize-none ${rankingManuallyEdited && rankingNote ? "border-amber-600/50" : ""}`}
                />
                {rankingManuallyEdited && !rankingNote && (
                  <p className="text-[10px] text-amber-500/70 mt-1">
                    Empfohlen: Begründung für manuelle Änderung eintragen.
                  </p>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
