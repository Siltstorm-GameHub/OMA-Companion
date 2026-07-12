"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import SeriesIcon from "@/components/SeriesIcon";
import {
  ChevronLeft, CheckCircle2, Trophy, Vote, ListOrdered,
  GripVertical, AlertTriangle, RotateCcw, Equal, Repeat, Plus,
} from "lucide-react";

type User = { id: string; name: string | null; username: string | null; image: string | null };
type PlacementReward = { place: number; coins: number; rankPoints: number };
type RewardsConfig = { participationCoins: number; placements: PlacementReward[] };

interface Props {
  seriesId: string;
  seriesName: string;
  seriesIcon?: string | null;
  statFields: string[];
  participants: User[];
  userStats: Record<string, Record<string, number>>;
  rewardsConfig: RewardsConfig;
  isReEdit: boolean;
  pollPhaseComplete: boolean;
  initialData: Record<string, unknown> | null;
}

const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";
const numCls   = "w-24 rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";
const MEDALS   = ["🥇", "🥈", "🥉"];

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

function computeGroups(order: string[], tiedAbove: Set<string>): string[][] {
  const groups: string[][] = [];
  for (const uid of order) {
    if (tiedAbove.has(uid) && groups.length > 0) groups[groups.length - 1].push(uid);
    else groups.push([uid]);
  }
  return groups;
}

function computePlacementMap(groups: string[][]): Map<string, number> {
  const map = new Map<string, number>();
  let place = 1;
  for (const group of groups) {
    for (const uid of group) map.set(uid, place);
    place += group.length;
  }
  return map;
}

export default function SeriesCompleteClient({
  seriesId, seriesName, seriesIcon, statFields, participants, userStats, rewardsConfig,
  isReEdit, pollPhaseComplete, initialData,
}: Props) {
  const router = useRouter();

  const isPollOnly = isReEdit && !pollPhaseComplete;

  /* ── Ranking ── */
  const [rankingOrder, setRankingOrder] = useState<string[]>(() => {
    if (initialData?.finalRanking) {
      const saved = initialData.finalRanking as string[];
      const valid = saved.filter(id => participants.some(p => p.id === id));
      const missing = participants.map(p => p.id).filter(id => !valid.includes(id));
      return [...valid, ...missing];
    }
    return participants.map(p => p.id);
  });
  const [tiedAbove, setTiedAbove] = useState<Set<string>>(() => {
    const tied = new Set<string>();
    if (initialData?.finalRankingGroups) {
      for (const group of initialData.finalRankingGroups as string[][]) {
        for (let i = 1; i < group.length; i++) tied.add(group[i]);
      }
    }
    return tied;
  });
  const [rankingManuallyEdited, setRankingManuallyEdited] = useState(!!initialData?.finalRanking);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Auto-sort by totalPoints on first render if no saved ranking
  useEffect(() => {
    if (!initialData?.finalRanking) autoSort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Poll ── */
  const [pollEnabled, setPollEnabled]     = useState(!!initialData?.pollLabel || false);
  const [pollQuestion, setPollQuestion]   = useState((initialData?.pollLabel as string) ?? "");
  const [pollCoins, setPollCoins]         = useState((initialData?.pollBonusCoins as number) ?? 0);
  const [pollRankPts, setPollRankPts]     = useState((initialData?.pollBonusRankPoints as number) ?? 0);
  const [pollExcluded, setPollExcluded]   = useState<Set<string>>(() => new Set(initialData?.pollExcludedUserIds as string[] ?? []));
  const [pollVotes, setPollVotes]         = useState<Record<string, number>>(() => {
    if (!initialData) return {};
    const old: Record<string, number> = {};
    const winners = (initialData.pollWinnerIds as string[] | undefined) ?? [];
    for (const id of winners) old[id] = 1;
    return old;
  });

  /* ── Neue Saison ── */
  const [startNewSeason, setStartNewSeason] = useState(!isReEdit);

  const [loading, setLoading] = useState(false);

  /* ── Derived ── */
  const rankingGroups  = useMemo(() => computeGroups(rankingOrder, tiedAbove), [rankingOrder, tiedAbove]);
  const placementMap   = useMemo(() => computePlacementMap(rankingGroups), [rankingGroups]);
  const pollEligible   = useMemo(() => participants.filter(u => !pollExcluded.has(u.id)), [participants, pollExcluded]);
  const pollWinners    = useMemo(() => {
    if (!pollEligible.length) return [];
    const maxVotes = Math.max(...pollEligible.map(u => pollVotes[u.id] ?? 0));
    if (maxVotes <= 0) return [];
    return pollEligible.filter(u => (pollVotes[u.id] ?? 0) === maxVotes).map(u => u.id);
  }, [pollEligible, pollVotes]);

  /* ── Ranking helpers ── */
  function autoSort() {
    const sorted = [...rankingOrder].sort(
      (a, b) => (userStats[b]?.totalPoints ?? 0) - (userStats[a]?.totalPoints ?? 0)
    );
    const newTied = new Set<string>();
    for (let i = 1; i < sorted.length; i++) {
      if ((userStats[sorted[i]]?.totalPoints ?? 0) === (userStats[sorted[i - 1]]?.totalPoints ?? 0)) {
        newTied.add(sorted[i]);
      }
    }
    setTiedAbove(newTied);
    setRankingOrder(sorted);
    setRankingManuallyEdited(false);
  }

  function toggleTied(uid: string) {
    setRankingManuallyEdited(true);
    setTiedAbove(prev => { const s = new Set(prev); s.has(uid) ? s.delete(uid) : s.add(uid); return s; });
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setRankingManuallyEdited(true);
    setRankingOrder(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      setTiedAbove(t => { const s = new Set(t); s.delete(next[idx]); s.delete(next[idx - 1]); return s; });
      return next;
    });
  }

  function moveDown(idx: number) {
    setRankingManuallyEdited(true);
    setRankingOrder(prev => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      setTiedAbove(t => { const s = new Set(t); s.delete(next[idx]); s.delete(next[idx + 1]); return s; });
      return next;
    });
  }

  function onDragStart(idx: number) { setDragIdx(idx); }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setRankingManuallyEdited(true);
    setRankingOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  }

  /* ── Submit ── */
  async function handleConfirm(pollOnly = false) {
    setLoading(true);
    try {
      const hasPollVotes = pollWinners.length > 0;
      const res = await fetch(`/api/admin/series/${seriesId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalRanking:        rankingOrder,
          finalRankingGroups:  rankingGroups,
          pollWinnerIds:       !pollOnly && pollEnabled && hasPollVotes ? pollWinners : undefined,
          pollLabel:           pollEnabled ? pollQuestion.trim() || undefined : undefined,
          pollBonusCoins:      pollEnabled ? pollCoins : undefined,
          pollBonusRankPoints: pollEnabled ? pollRankPts : undefined,
          pollExcludedUserIds: pollEnabled && pollExcluded.size > 0 ? [...pollExcluded] : undefined,
          startNewSeason:      !isReEdit && startNewSeason ? true : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Fehler beim Abschließen");
        return;
      }
      const data = await res.json() as { startNewSeason?: boolean };
      if (pollOnly) {
        toast.success("Saison abgeschlossen – Abstimmung kann später nachgetragen werden");
      } else if (isPollOnly) {
        toast.success(`Abstimmung für „${seriesName}" abgeschlossen`);
      } else {
        toast.success(isReEdit ? `„${seriesName}" aktualisiert` : `„${seriesName}" erfolgreich abgeschlossen`);
      }
      router.push(
        !pollOnly && data.startNewSeason
          ? `/admin/series/${seriesId}/new-season`
          : `/admin/series/${seriesId}`
      );
    } finally {
      setLoading(false);
    }
  }

  /* ── Render ── */
  return (
    <div className="space-y-4 p-5 sm:p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/admin/series/${seriesId}`} className="flex items-center gap-1 hover:text-gray-300 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <SeriesIcon name={seriesIcon} className="w-3.5 h-3.5" />
          {seriesName}
        </Link>
        <span>/</span>
        <span className="text-gray-300">
          {isPollOnly ? "Abstimmung nachtragen" : isReEdit ? "Abschluss bearbeiten" : "Eventreihe abschließen"}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-teal-400" />
        <h1 className="text-lg font-bold text-white">
          {isPollOnly ? "Abstimmung nachtragen" : isReEdit ? "Abschluss bearbeiten" : "Eventreihe abschließen"}
        </h1>
        <span className="text-sm text-gray-500">· {seriesName}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

        {/* ── Left: Ranking + Poll ── */}
        <div className="space-y-4">

          {/* Gesamtplatzierung */}
          {!isPollOnly && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <ListOrdered className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-xs font-semibold text-blue-300">Gesamtplatzierung</span>
                <span className="text-[10px] text-gray-600">— auto-sortiert nach Gesamtpunkten</span>
                {rankingManuallyEdited && (
                  <>
                    <span className="flex items-center gap-1 text-[10px] text-amber-400">
                      <AlertTriangle className="w-3 h-3" /> manuell geändert
                    </span>
                    <button onClick={autoSort}
                      className="ml-auto flex items-center gap-1 text-[10px] text-blue-400/60 hover:text-blue-300 transition-colors">
                      <RotateCcw className="w-3 h-3" /> Zurücksetzen
                    </button>
                  </>
                )}
              </div>

              {/* Ties info */}
              {tiedAbove.size > 0 && (
                <p className="text-[10px] text-blue-400/60 flex items-center gap-1">
                  <Equal className="w-3 h-3" />
                  {tiedAbove.size} Gleichstand – beide erhalten dieselbe Platzierung
                </p>
              )}

              <p className="text-[10px] text-gray-600">
                Anhand dieser Endplatzierung werden die unter „Belohnungen (Endplatzierung der Eventreihe)" konfigurierten Münzen &amp; Rang-Punkte vergeben.
              </p>

              <div className="space-y-1">
                {rankingOrder.map((uid, idx) => {
                  const u = participants.find(p => p.id === uid);
                  if (!u) return null;
                  const place    = placementMap.get(uid) ?? idx + 1;
                  const isTied   = tiedAbove.has(uid);
                  const pts      = userStats[uid]?.totalPoints ?? 0;
                  const medal    = MEDALS[place - 1] ?? null;
                  const reward   = rewardsConfig.placements.find(p => p.place === place);

                  return (
                    <div
                      key={uid}
                      draggable
                      onDragStart={() => onDragStart(idx)}
                      onDragOver={e => onDragOver(e, idx)}
                      onDragEnd={() => setDragIdx(null)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border transition-colors cursor-grab active:cursor-grabbing ${
                        isTied ? "border-blue-500/30 bg-blue-500/[0.04]" : "border-white/[0.05]"
                      } ${dragIdx === idx ? "opacity-50" : ""}`}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                      <span className="text-xs font-bold text-gray-500 w-5 text-center shrink-0">
                        {medal ?? `${place}.`}
                      </span>
                      <Avatar u={u} size={6} />
                      <span className="flex-1 text-sm text-white truncate">{userName(u)}</span>
                      {/* Stats */}
                      <span className="text-[10px] text-teal-400 font-semibold tabular-nums">
                        {pts} Pkt.
                      </span>
                      {statFields.map(f => {
                        const v = userStats[uid]?.[f];
                        if (!v) return null;
                        return <span key={f} className="text-[10px] text-gray-500 tabular-nums">{f}: {v}</span>;
                      })}
                      {/* Endplatzierungs-Belohnung */}
                      {reward && (reward.coins > 0 || reward.rankPoints > 0) && (
                        <span className="flex items-center gap-1.5 shrink-0">
                          {reward.coins > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-400 tabular-nums">
                              +{reward.coins} <CoinIcon size={11} />
                            </span>
                          )}
                          {reward.rankPoints > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-teal-400 tabular-nums">
                              +{reward.rankPoints} <RankPointsIcon size={11} />
                            </span>
                          )}
                        </span>
                      )}
                      {/* Tied toggle */}
                      {idx > 0 && (
                        <button
                          type="button"
                          title={isTied ? "Gleichstand aufheben" : "Gleichstand mit vorherigem Platz"}
                          onClick={() => toggleTied(uid)}
                          className={`flex items-center shrink-0 p-1 rounded transition-colors ${
                            isTied ? "text-blue-400 hover:text-blue-300" : "text-gray-600 hover:text-gray-400"
                          }`}
                        >
                          <Equal className="w-3 h-3" />
                        </button>
                      )}
                      {/* Move buttons */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0}
                          className="text-[8px] text-gray-600 hover:text-gray-300 disabled:opacity-20 leading-none px-0.5">▲</button>
                        <button type="button" onClick={() => moveDown(idx)} disabled={idx === rankingOrder.length - 1}
                          className="text-[8px] text-gray-600 hover:text-gray-300 disabled:opacity-20 leading-none px-0.5">▼</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Poll */}
          {!isReEdit && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)" }}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={pollEnabled} onChange={e => setPollEnabled(e.target.checked)}
                  className="rounded accent-violet-500" />
                <Vote className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-semibold text-violet-300">Abstimmung zum Abschluss</span>
              </label>

              {pollEnabled && (
                <div className="space-y-3 mt-1">
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Abstimmungsthema</label>
                    <input type="text" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                      placeholder="z.B. MVP der Saison, Trostpreis, …" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 flex items-center gap-1"><RankPointsIcon size={11} /> Punkte Gewinner</label>
                      <input type="number" min={0} value={pollRankPts} onChange={e => setPollRankPts(Number(e.target.value))} className={numCls} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 flex items-center gap-1"><CoinIcon size={11} /> Münzen Gewinner</label>
                      <input type="number" min={0} value={pollCoins} onChange={e => setPollCoins(Number(e.target.value))} className={numCls} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Poll: Kandidaten ausschließen + Ergebnis eintragen (isPollOnly oder pollEnabled) */}
          {(isPollOnly || pollEnabled) && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)" }}>
              {isPollOnly && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Vote className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-semibold text-violet-300">Abstimmungsergebnis nachtragen</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Thema</label>
                    <input type="text" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                      placeholder="Abstimmungsthema" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 flex items-center gap-1"><RankPointsIcon size={11} /> Punkte Gewinner</label>
                      <input type="number" min={0} value={pollRankPts} onChange={e => setPollRankPts(Number(e.target.value))} className={numCls} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 flex items-center gap-1"><CoinIcon size={11} /> Münzen Gewinner</label>
                      <input type="number" min={0} value={pollCoins} onChange={e => setPollCoins(Number(e.target.value))} className={numCls} />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">
                  Kandidaten ({pollEligible.length}/{participants.length}) — klicken zum Ausschließen
                </p>
                <div className="flex flex-wrap gap-2">
                  {participants.map(u => {
                    const excluded = pollExcluded.has(u.id);
                    return (
                      <button key={u.id} type="button"
                        onClick={() => setPollExcluded(prev => { const s = new Set(prev); s.has(u.id) ? s.delete(u.id) : s.add(u.id); return s; })}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                          excluded
                            ? "bg-red-500/10 border-red-500/20 text-red-400 line-through opacity-50"
                            : "bg-violet-500/10 border-violet-500/15 text-violet-300 hover:border-red-500/30 hover:text-red-400"
                        }`}
                      >
                        <Avatar u={u} size={4} /> {userName(u)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Ergebnis eintragen (Stimmen)</p>
                {pollEligible.map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <Avatar u={u} size={5} />
                    <span className="flex-1 text-sm text-white">{userName(u)}</span>
                    <input
                      type="number" min={0}
                      value={pollVotes[u.id] ?? 0}
                      onChange={e => setPollVotes(prev => ({ ...prev, [u.id]: Number(e.target.value) }))}
                      className="w-20 rounded-lg px-3 py-1.5 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-violet-500/50 transition-colors tabular-nums"
                    />
                  </div>
                ))}
              </div>

              {pollWinners.length > 0 && (
                <div className="rounded-lg px-3 py-2 bg-violet-500/10 border border-violet-500/20">
                  <p className="text-[10px] text-violet-400 font-medium">
                    Gewinner: {pollWinners.map(id => {
                      const u = participants.find(p => p.id === id);
                      return u ? userName(u) : id;
                    }).join(", ")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Neue Saison + Übersicht ── */}
        <div className="space-y-4">

          {/* Neue Saison (nur beim ersten Abschluss) */}
          {!isReEdit && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(20,184,166,0.05)", border: "1px solid rgba(20,184,166,0.15)" }}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={startNewSeason} onChange={e => setStartNewSeason(e.target.checked)}
                  className="rounded accent-teal-500" />
                <Repeat className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-xs font-semibold text-teal-300">Neue Saison starten</span>
              </label>
              {startNewSeason && (
                <p className="text-[10px] text-gray-600">
                  Nach dem Abschluss öffnet sich der Saison-Assistent: dort kannst du Name, Spiel, Format,
                  Punktesystem, Belohnungen sowie Start- und Enddatum der neuen Saison prüfen und anpassen,
                  bevor sie angelegt wird.
                </p>
              )}
            </div>
          )}

          {/* Gesamtsieger-Vorschau */}
          {!isPollOnly && rankingOrder.length > 0 && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)" }}>
              <div className="flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">Gesamtsieger</span>
              </div>
              {(() => {
                const topGroup = rankingGroups[0] ?? [];
                return (
                  <div className="flex flex-wrap gap-2">
                    {topGroup.map(uid => {
                      const u = participants.find(p => p.id === uid);
                      if (!u) return null;
                      return (
                        <div key={uid} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <Avatar u={u} size={5} />
                          <span className="text-sm text-amber-200 font-semibold">{userName(u)}</span>
                          <span className="text-[10px] text-amber-400/70 tabular-nums">
                            {userStats[uid]?.totalPoints ?? 0} Pkt.
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => handleConfirm(false)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-600 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? "Wird gespeichert…"
                : isPollOnly ? "Abstimmung & Änderungen speichern"
                : isReEdit ? "Änderungen speichern"
                : "Eventreihe abschließen & archivieren"}
            </button>

            {!isReEdit && pollEnabled && pollWinners.length === 0 && (
              <button
                onClick={() => handleConfirm(true)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium text-gray-400 border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:text-gray-200 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Abschließen – Abstimmungsergebnis später nachtragen
              </button>
            )}
          </div>

          {/* Hinweis neue Saison */}
          {!isReEdit && startNewSeason && (
            <div className="rounded-lg px-3 py-2 bg-white/[0.02] border border-white/[0.05]">
              <p className="text-[10px] text-gray-500 flex items-start gap-1.5">
                <Plus className="w-3 h-3 shrink-0 mt-0.5 text-teal-500" />
                Nach dem Abschluss wirst du zum Saison-Assistenten weitergeleitet, um die neue Saison einzurichten.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
