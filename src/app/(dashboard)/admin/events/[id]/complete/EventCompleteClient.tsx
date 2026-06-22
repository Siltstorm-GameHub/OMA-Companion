"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  ChevronLeft, Repeat, CheckCircle2, Trophy, Star, Vote,
  ListOrdered, GripVertical, Coins, AlertTriangle, RotateCcw, Equal,
} from "lucide-react";

/* ── Types ── */
type User = { id: string; name: string | null; username: string | null; image: string | null };
type PlacementReward = { place: number; coins: number; rankPoints: number };
type RewardsConfig = { participationCoins: number; placements: PlacementReward[] };
type PollConfig = { enabled: boolean; question: string; coins: number; rankPoints: number };
type SeriesStatConfig = {
  participationPoints: number;
  stats: { field: string; pointsPer: number }[];
  mvpStatField?: string;
  defaultWinnerStatField?: string;
  defaultWinnerTargetField?: string;
};

interface Props {
  eventId: string;
  eventTitle: string;
  seriesId: string | null;
  seriesName: string | null;
  registeredUsers: User[];
  tournamentStatFields: string[];
  userStats: Record<string, Record<string, number>>;
  seriesStatConfig: SeriesStatConfig | null;
  rewardsConfig: RewardsConfig;
  pollConfig: PollConfig;
  isReEdit: boolean;
  gamePhaseComplete: boolean;
  pollPhaseComplete: boolean;
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
  eventId, eventTitle, seriesId, seriesName,
  registeredUsers, tournamentStatFields, userStats,
  seriesStatConfig, rewardsConfig, pollConfig,
  isReEdit, gamePhaseComplete, pollPhaseComplete,
  initialData, initialFinalRanking, initialRankingGroups, initialFinalRankingNote,
}: Props) {
  const router = useRouter();

  // Mode: poll-only when game phase is confirmed but poll is still open
  const isPollOnly = isReEdit && gamePhaseComplete && !pollPhaseComplete;

  /* ── Gewinner-Stat ── */
  const [winnerStatField, setWinnerStatField] = useState<string>(
    (initialData?.winnerStatField as string) ?? seriesStatConfig?.defaultWinnerStatField ?? ""
  );
  const [seriesWinnerTargetField, setSeriesWinnerTargetField] = useState<string>(
    (initialData?.seriesWinnerTargetField as string) ?? seriesStatConfig?.defaultWinnerTargetField ?? ""
  );

  /* ── MVP ── */
  const [mvpUserId, setMvpUserId] = useState<string>(
    (initialData?.mvpUserId as string) ?? ""
  );

  /* ── Poll ── */
  const [pollExcluded, setPollExcluded] = useState<Set<string>>(() => new Set());
  const [pollVotes, setPollVotes] = useState<Record<string, number>>(() => {
    if (!isReEdit || !initialData) return {};
    const old: Record<string, number> = {};
    const winners: string[] = (initialData.pollWinnerIds as string[] | undefined) ??
      (initialData.pollWinnerId ? [initialData.pollWinnerId as string] : []);
    for (const id of winners) old[id] = 1;
    return old;
  });

  /* ── Ranking ── */
  // Flat order (derived from initial groups if provided)
  const [rankingOrder, setRankingOrder] = useState<string[]>(() => {
    if (initialFinalRanking?.length) return initialFinalRanking;
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

  const [loading, setLoading] = useState(false);

  /* ── Derived ── */
  const seriesStatFields = (seriesStatConfig?.stats ?? []).map(s => s.field);

  const previewWinner = useMemo(() => {
    if (!winnerStatField) return null;
    let best: string | null = null;
    let bestVal = -Infinity;
    for (const [uid, stats] of Object.entries(userStats)) {
      const v = stats[winnerStatField] ?? 0;
      if (v > bestVal) { bestVal = v; best = uid; }
    }
    return best;
  }, [winnerStatField, userStats]);

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

  const rankingGroups = useMemo(() => computeGroups(rankingOrder, tiedAbove), [rankingOrder, tiedAbove]);
  const placementMap  = useMemo(() => computePlacementMap(rankingGroups), [rankingGroups]);

  /* ── Ranking auto-sort with tie detection ── */
  function autoSort(field = winnerStatField) {
    if (!field) return;
    const sorted = [...rankingOrder].sort(
      (a, b) => (userStats[b]?.[field] ?? 0) - (userStats[a]?.[field] ?? 0)
    );
    const newTied = new Set<string>();
    for (let i = 1; i < sorted.length; i++) {
      if ((userStats[sorted[i]]?.[field] ?? 0) === (userStats[sorted[i - 1]]?.[field] ?? 0)) {
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
          winnerStatField:         winnerStatField || undefined,
          seriesWinnerTargetField: seriesWinnerTargetField || undefined,
          pollWinnerIds:           !pollOnly && pollConfig.enabled && hasPollVotes ? pollWinners : undefined,
          pollLabel:               pollConfig.enabled ? pollConfig.question : undefined,
          pollBonusCoins:          pollConfig.enabled ? pollConfig.coins : undefined,
          pollBonusRankPoints:     pollConfig.enabled ? pollConfig.rankPoints : undefined,
          finalRanking:            rankingOrder.length > 0 ? rankingOrder : undefined,
          finalRankingGroups:      rankingGroups.length > 0 ? rankingGroups : undefined,
          finalRankingNote:        rankingNote || undefined,
          participationCoins:      rewardsConfig.participationCoins,
          placements:              rewardsConfig.placements,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Fehler beim Abschließen");
        return;
      }
      if (pollOnly) {
        toast.success(`Spielphase abgeschlossen – Umfrage kann später nachgetragen werden`);
      } else if (isPollOnly) {
        toast.success(`Umfrage für "${eventTitle}" abgeschlossen`);
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
            <Repeat className="w-3.5 h-3.5 text-teal-500" />
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
          {isPollOnly ? "Umfrage nachtragen" : isReEdit ? "Abschluss bearbeiten" : "Event abschließen"}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-teal-400" />
        <h1 className="text-lg font-bold text-white">
          {isPollOnly ? "Umfrage nachtragen" : isReEdit ? "Abschluss bearbeiten" : "Event abschließen"}
        </h1>
      </div>

      {/* Status banners */}
      {isPollOnly && (
        <div className="flex items-start gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-xs text-violet-300">
          <Vote className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Die <strong>Spielphase ist bereits abgeschlossen</strong> – Teilnahmen und die Gesamttabelle wurden bereits aktualisiert.
            Alle Felder können weiterhin bearbeitet werden. Umfrageergebnisse hier nachtragen.
          </span>
        </div>
      )}
      {isReEdit && !isPollOnly && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Nur MVP und Poll-Sieger werden aktualisiert (inkl. Rückbuchung der alten Belohnungen).
            Teilnahmen, Platzierungen und Stat-Einträge in der Gesamttabelle bleiben unverändert.
          </span>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

        {/* ── Left column ── */}
        <div className="space-y-4">

          {/* Gewinner-Stat */}
          {tournamentStatFields.length > 0 && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">Event-Gewinner</span>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Welches Stat-Feld bestimmt den Gewinner?</label>
                <select
                  value={winnerStatField}
                  onChange={e => {
                    setWinnerStatField(e.target.value);
                    if (!rankingManuallyEdited && e.target.value) autoSort(e.target.value);
                  }}
                  className={inputCls}
                >
                  <option value="">– kein Gewinner-Stat –</option>
                  {tournamentStatFields.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              {seriesStatFields.length > 0 && (
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">…Sieg in Gesamttabelle tracken als</label>
                  <select value={seriesWinnerTargetField} onChange={e => setSeriesWinnerTargetField(e.target.value)} className={inputCls}>
                    <option value="">– nicht tracken –</option>
                    {seriesStatFields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              )}
              {previewWinner && winnerStatField && (
                <p className="text-xs text-amber-400 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 shrink-0" />
                  Aktueller Gewinner:{" "}
                  <strong>{userName(registeredUsers.find(u => u.id === previewWinner) ?? { id: "", name: previewWinner, username: null, image: null })}</strong>
                  {" "}({userStats[previewWinner]?.[winnerStatField] ?? 0} {winnerStatField})
                </p>
              )}
            </div>
          )}

          {/* MVP */}
          {seriesStatConfig?.mvpStatField && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(20,184,166,0.05)", border: "1px solid rgba(20,184,166,0.15)" }}>
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-xs font-semibold text-teal-300">
                  MVP{" "}
                  <span className="font-normal text-gray-500">(+1 auf „{seriesStatConfig.mvpStatField}" in Gesamttabelle)</span>
                </span>
              </div>
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
            </div>
          )}

          {/* Poll */}
          {pollConfig.enabled && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)" }}>
              <div className="flex items-center gap-2">
                <Vote className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-semibold text-violet-300">
                  Poll: „{pollConfig.question}"
                </span>
                {isPollOnly && <span className="text-[10px] text-violet-400/60 ml-auto">ausstehend</span>}
              </div>

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

              {pollWinners.length > 0 && (
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
                        <span className="text-xs text-gray-500">({pollVotes[id] ?? 0} Stimmen)</span>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-gray-500 mt-1">
                    Belohnung: {pollConfig.coins > 0 ? `${pollConfig.coins} Münzen` : ""}
                    {pollConfig.coins > 0 && pollConfig.rankPoints > 0 ? " + " : ""}
                    {pollConfig.rankPoints > 0 ? `${pollConfig.rankPoints} Punkte` : ""}
                  </p>
                </div>
              )}

              {pollEligible.length === 0 && (
                <p className="text-xs text-gray-600 italic">Alle Teilnehmer ausgeschlossen.</p>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
              {isPollOnly ? "Wird vergeben (Umfrage)" : isReEdit ? "Wird aktualisiert" : "Wird vergeben"}
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
            ) : isReEdit ? (
              <ul className="space-y-1 text-xs text-gray-400">
                {mvpUserId && seriesStatConfig?.mvpStatField && (
                  <li className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-teal-400 shrink-0" />
                    MVP → {userName(registeredUsers.find(u => u.id === mvpUserId) ?? { id: "", name: mvpUserId, username: null, image: null })} (+1 „{seriesStatConfig.mvpStatField}")
                  </li>
                )}
                {pollConfig.enabled && pollWinners.length > 0 && (
                  <li className="flex items-center gap-2">
                    <Vote className="w-3 h-3 text-violet-400 shrink-0" />
                    Poll-Sieger neu: {pollWinners.map(id => userName(registeredUsers.find(u => u.id === id) ?? { id: "", name: id, username: null, image: null })).join(", ")}
                    {" "}({pollConfig.coins > 0 ? `${pollConfig.coins} Münzen` : ""}{pollConfig.coins > 0 && pollConfig.rankPoints > 0 ? " + " : ""}{pollConfig.rankPoints > 0 ? `${pollConfig.rankPoints} Punkte` : ""})
                  </li>
                )}
                {!mvpUserId && !(pollConfig.enabled && pollWinners.length > 0) && (
                  <li className="text-gray-600 italic">Keine Änderungen zu übernehmen.</li>
                )}
              </ul>
            ) : (
              <ul className="space-y-1 text-xs text-gray-400">
                {rewardsConfig.participationCoins > 0 && (
                  <li className="flex items-center gap-2">
                    <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                    Alle {registeredUsers.length} Teilnehmer: {rewardsConfig.participationCoins} Münzen
                  </li>
                )}
                {rankingGroups.map((group, gi) => {
                  const place = placementMap.get(group[0]) ?? gi + 1;
                  const reward = rewardsConfig.placements.find(p => p.place === place);
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
                : isPollOnly
                ? "Änderungen & Umfrage speichern"
                : isReEdit
                ? "Änderungen speichern"
                : "Abschließen & Belohnungen vergeben"}
            </button>
            {/* Secondary: confirm game phase without poll */}
            {!isReEdit && pollConfig.enabled && pollWinners.length === 0 && (
              <button
                onClick={() => handleConfirm(true)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium text-gray-400 border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:text-gray-200 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Spielphase abschließen – Umfrage später nachtragen
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
              {!rankingManuallyEdited && winnerStatField && (
                <span className="text-[10px] text-gray-600">— auto-sortiert nach „{winnerStatField}"</span>
              )}
              {rankingManuallyEdited && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400">
                  <AlertTriangle className="w-3 h-3" /> manuell geändert
                </span>
              )}
              {rankingManuallyEdited && winnerStatField && (
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
                {tiedAbove.size} Gleichstand{tiedAbove.size > 1 ? "s" : ""} – beide erhalten dieselbe Platzierungsbelohnung
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
                  const reward = rewardsConfig.placements.find(p => p.place === place);
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
                        <GripVertical className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
                        <span className="text-sm w-6 text-center shrink-0">
                          {place <= 3
                            ? <span>{MEDALS[place - 1]}</span>
                            : <span className="text-xs text-gray-500">{place}</span>
                          }
                        </span>
                        <Avatar u={u} size={5} />
                        <span className="text-xs text-white flex-1 truncate">{userName(u)}</span>
                        {winnerStatField && userStats[uid]?.[winnerStatField] != null && (
                          <span className="text-[10px] text-gray-500 tabular-nums shrink-0">
                            {userStats[uid][winnerStatField]} {winnerStatField}
                          </span>
                        )}
                        {reward && (reward.coins > 0 || reward.rankPoints > 0) && (
                          <span className="text-[10px] text-gray-600 tabular-nums shrink-0 ml-1">
                            {reward.coins > 0 && <span className="text-amber-600">{reward.coins}M</span>}
                            {reward.coins > 0 && reward.rankPoints > 0 && " "}
                            {reward.rankPoints > 0 && <span className="text-purple-600">{reward.rankPoints}P</span>}
                          </span>
                        )}
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
