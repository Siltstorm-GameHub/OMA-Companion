"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Trophy, Star, TrendingUp, CheckCircle2, Vote, GripVertical, ListOrdered } from "lucide-react";

type User = { id: string; name: string | null; username: string | null; image: string | null };
type MatchEntry = { userId: string | null; statsJson: string | null };
type Match = { entries: MatchEntry[] };
type Tournament = { statFields: string | null; matches: Match[] };

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
  seriesId: string;
  registeredUsers: User[];
  tournament: Tournament | null;
  seriesStatConfig: SeriesStatConfig | null;
  isReEdit?: boolean;
  initialData?: Record<string, unknown>;
  initialFinalRanking?: string[];
  initialFinalRankingNote?: string;
  onClose: () => void;
}

const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";
const MEDALS = ["🥇", "🥈", "🥉"];

export default function EventCompletionModal({
  eventId, eventTitle, registeredUsers, tournament, seriesStatConfig,
  isReEdit, initialData, initialFinalRanking, initialFinalRankingNote, onClose,
}: Props) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const [mvpUserId, setMvpUserId] = useState<string>((initialData?.mvpUserId as string) ?? "");
  const [winnerStatField, setWinnerStatField] = useState<string>(seriesStatConfig?.defaultWinnerStatField ?? "");
  const [seriesWinnerTargetField, setSeriesWinnerTargetField] = useState<string>(seriesStatConfig?.defaultWinnerTargetField ?? "");
  const [hasPoll, setHasPoll] = useState(!!(initialData?.pollWinnerId));
  const [pollLabel, setPollLabel] = useState((initialData?.pollLabel as string) ?? "MVP");
  const [pollBonusPoints, setPollBonusPoints] = useState<number>((initialData?.pollBonusPoints as number) ?? 10);
  const [pollWinnerId, setPollWinnerId] = useState<string>((initialData?.pollWinnerId as string) ?? "");

  // Endplatzierung
  const [rankingOrder, setRankingOrder] = useState<string[]>(() => {
    if (initialFinalRanking?.length) return initialFinalRanking;
    return registeredUsers.map(u => u.id);
  });
  const [rankingNote, setRankingNote] = useState(initialFinalRankingNote ?? "");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  // Merken ob der User die Reihenfolge manuell verändert hat
  const [rankingManuallyEdited, setRankingManuallyEdited] = useState(!!initialFinalRanking?.length);

  // Schließen via Außenklick
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Per-User-Stats aus Tournament-Daten berechnen
  const userStats = (() => {
    const totals: Record<string, Record<string, number>> = {};
    if (!tournament) return totals;
    for (const match of tournament.matches) {
      for (const entry of match.entries) {
        if (!entry.userId || !entry.statsJson) continue;
        let parsed: Record<string, number> = {};
        try { parsed = JSON.parse(entry.statsJson); } catch { continue; }
        if (!totals[entry.userId]) totals[entry.userId] = {};
        for (const [f, v] of Object.entries(parsed)) {
          totals[entry.userId][f] = (totals[entry.userId][f] ?? 0) + Number(v);
        }
      }
    }
    return totals;
  })();

  // Verfügbare Stat-Felder aus dem Turnier
  const tournamentStatFields: string[] = (() => {
    if (!tournament?.statFields) return [];
    try { return JSON.parse(tournament.statFields) as string[]; } catch { return []; }
  })();

  // Verfügbare Series-Stat-Felder (Ziel für Gewinner)
  const seriesStatFields = (seriesStatConfig?.stats ?? []).map(s => s.field);

  // Auto-Sort wenn winnerStatField sich ändert (nur wenn nicht manuell bearbeitet)
  useEffect(() => {
    if (!winnerStatField || rankingManuallyEdited) return;
    setRankingOrder(prev =>
      [...prev].sort((a, b) => (userStats[b]?.[winnerStatField] ?? 0) - (userStats[a]?.[winnerStatField] ?? 0))
    );
  // userStats ist ein Inline-Objekt und ändert sich nicht — winnerStatField reicht als Dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnerStatField]);

  // Vorschau: wer würde mit dem aktuellen winnerStatField gewinnen?
  const previewWinner = (() => {
    if (!winnerStatField) return null;
    let best: string | null = null;
    let bestVal = -Infinity;
    for (const [uid, stats] of Object.entries(userStats)) {
      const v = stats[winnerStatField] ?? 0;
      if (v > bestVal) { bestVal = v; best = uid; }
    }
    return best;
  })();

  const userName = (u: User) => u.username ?? u.name ?? "?";

  async function handleConfirm() {
    setLoading(true);
    try {
      // 1. Series-Standings (MVP, Poll, Participations)
      const res = await fetch(`/api/admin/events/${eventId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mvpUserId:               mvpUserId || undefined,
          winnerStatField:         winnerStatField || undefined,
          seriesWinnerTargetField: seriesWinnerTargetField || undefined,
          pollWinnerId:            hasPoll && pollWinnerId ? pollWinnerId : undefined,
          pollLabel:               hasPoll && pollWinnerId ? pollLabel : undefined,
          pollBonusPoints:         hasPoll && pollWinnerId ? pollBonusPoints : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Fehler beim Abschließen");
        return;
      }

      // 2. Endplatzierung + Punkte (Turnier-System) — nur wenn Tournament vorhanden
      if (tournament && rankingOrder.length > 0) {
        const rankRes = await fetch(`/api/tournaments/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            finalRanking:     rankingOrder,
            finalRankingNote: rankingNote.trim() || null,
            ...(!isReEdit && { status: "finished" }),
          }),
        });
        if (!rankRes.ok) {
          toast.error("Fehler beim Speichern der Endplatzierung");
          return;
        }
      }

      toast.success(isReEdit
        ? `"${eventTitle}" aktualisiert`
        : `"${eventTitle}" abgeschlossen & Gesamttabelle aktualisiert`
      );
      router.refresh();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setRankingManuallyEdited(true);
    setRankingOrder(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }
  function moveDown(idx: number) {
    setRankingManuallyEdited(true);
    setRankingOrder(prev => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div ref={ref} className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold text-white">
              {isReEdit ? "Abschluss bearbeiten" : "Event abschließen"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          <p className="text-xs text-gray-500">
            {isReEdit
              ? "Nur MVP, Umfrage und Endplatzierung werden aktualisiert. Teilnahmen und Stats werden nicht nochmals gezählt."
              : <>Mit dem Abschließen werden die Teilnahmen und Stats dieses Events in die Gesamttabelle der Reihe übertragen. Status wird auf <span className="text-gray-300 font-medium">finished</span> gesetzt.</>
            }
          </p>

          {/* ── Gewinner-Stat ── */}
          {tournamentStatFields.length > 0 && seriesStatFields.length > 0 && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">Event-Gewinner</span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">
                    Wer hat den höchsten Wert in…
                  </label>
                  <select value={winnerStatField} onChange={e => setWinnerStatField(e.target.value)} className={inputCls}>
                    <option value="">– kein Gewinner-Stat –</option>
                    {tournamentStatFields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">
                    …bekommt +1 auf (Series-Stat)
                  </label>
                  <select value={seriesWinnerTargetField} onChange={e => setSeriesWinnerTargetField(e.target.value)} className={inputCls}>
                    <option value="">– nicht tracken –</option>
                    {seriesStatFields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              {previewWinner && winnerStatField && (
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>
                    Aktueller Gewinner: <strong>{userName(registeredUsers.find(u => u.id === previewWinner)!) ?? previewWinner.slice(0, 8)}</strong>
                    {" "}({userStats[previewWinner]?.[winnerStatField] ?? 0} {winnerStatField})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── MVP-Wahl ── */}
          {seriesStatConfig?.mvpStatField && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(20,184,166,0.05)", border: "1px solid rgba(20,184,166,0.15)" }}>
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-xs font-semibold text-teal-300">
                  MVP des Events
                  <span className="text-gray-500 font-normal ml-1">
                    (+1 auf „{seriesStatConfig.mvpStatField}" in der Gesamttabelle)
                  </span>
                </span>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="mvp"
                    value=""
                    checked={mvpUserId === ""}
                    onChange={() => setMvpUserId("")}
                    className="accent-teal-500"
                  />
                  <span className="text-sm text-gray-500 italic">Kein MVP</span>
                </label>
                {registeredUsers.map(u => (
                  <label key={u.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    mvpUserId === u.id ? "bg-teal-500/10 border border-teal-500/20" : "hover:bg-white/[0.03]"
                  }`}>
                    <input
                      type="radio"
                      name="mvp"
                      value={u.id}
                      checked={mvpUserId === u.id}
                      onChange={() => setMvpUserId(u.id)}
                      className="accent-teal-500 shrink-0"
                    />
                    {u.image
                      ? <img src={u.image} alt="" className="w-6 h-6 rounded-full shrink-0 object-cover" />
                      : <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-400 shrink-0">
                          {userName(u)[0]?.toUpperCase()}
                        </div>
                    }
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

          {/* ── Umfrage-Ergebnis ── */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)" }}>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasPoll}
                onChange={e => setHasPoll(e.target.checked)}
                className="accent-violet-500 w-4 h-4"
              />
              <Vote className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs font-semibold text-violet-300">Gab es eine Umfrage?</span>
            </label>

            {hasPoll && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">Bezeichnung</label>
                    <input
                      type="text"
                      value={pollLabel}
                      onChange={e => setPollLabel(e.target.value)}
                      placeholder="z.B. MVP, Trostpreis…"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">Bonuspunkte</label>
                    <input
                      type="number"
                      min={1}
                      value={pollBonusPoints}
                      onChange={e => setPollBonusPoints(Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">Gewinner der Umfrage</label>
                  <select value={pollWinnerId} onChange={e => setPollWinnerId(e.target.value)} className={inputCls}>
                    <option value="">– Person auswählen –</option>
                    {registeredUsers.map(u => (
                      <option key={u.id} value={u.id}>{userName(u)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ── Endplatzierung ── */}
          {tournament && registeredUsers.length > 0 && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <div className="flex items-center gap-2">
                <ListOrdered className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-blue-300">Endplatzierung</span>
                <span className="text-[10px] text-gray-600 ml-1">— ziehen oder Pfeile nutzen</span>
                {rankingManuallyEdited && winnerStatField && (
                  <button
                    onClick={() => {
                      setRankingManuallyEdited(false);
                      setRankingOrder(prev =>
                        [...prev].sort((a, b) => (userStats[b]?.[winnerStatField] ?? 0) - (userStats[a]?.[winnerStatField] ?? 0))
                      );
                    }}
                    className="ml-auto text-[10px] text-blue-400/60 hover:text-blue-300 transition-colors underline underline-offset-2"
                  >
                    Auto-Sortierung wiederherstellen
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {rankingOrder.map((uid, idx) => {
                  const u = registeredUsers.find(u => u.id === uid);
                  if (!u) return null;
                  const name = u.username ?? u.name ?? "?";
                  return (
                    <div key={uid}
                      draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragOver={e => { e.preventDefault(); }}
                      onDrop={() => {
                        if (dragIdx === null || dragIdx === idx) return;
                        setRankingManuallyEdited(true);
                        setRankingOrder(prev => {
                          const next = [...prev];
                          const [removed] = next.splice(dragIdx, 1);
                          next.splice(idx, 0, removed);
                          return next;
                        });
                        setDragIdx(null);
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] cursor-grab active:cursor-grabbing select-none">
                      <GripVertical className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                      <span className="text-sm w-5 text-center shrink-0">
                        {idx < 3 ? MEDALS[idx] : <span className="text-xs text-gray-500">{idx + 1}</span>}
                      </span>
                      {u.image
                        ? <img src={u.image} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                        : <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[9px] text-gray-400 shrink-0">{name[0].toUpperCase()}</div>}
                      <span className="text-xs text-white flex-1 truncate">{name}</span>
                      {winnerStatField && userStats[uid]?.[winnerStatField] != null && (
                        <span className="text-[10px] text-gray-500 tabular-nums shrink-0 mr-1">
                          {userStats[uid][winnerStatField]} {winnerStatField}
                        </span>
                      )}
                      <div className="flex gap-0.5 shrink-0">
                        <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-0.5 text-gray-600 hover:text-white disabled:opacity-20 transition-colors">▲</button>
                        <button onClick={() => moveDown(idx)} disabled={idx === rankingOrder.length - 1} className="p-0.5 text-gray-600 hover:text-white disabled:opacity-20 transition-colors">▼</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Notiz (optional, z.B. Disqualifikation)</label>
                <textarea
                  value={rankingNote}
                  onChange={e => setRankingNote(e.target.value)}
                  placeholder="z.B. Spieler X nachträglich disqualifiziert wegen …"
                  rows={2}
                  className={inputCls + " resize-none"}
                />
              </div>
            </div>
          )}

          {/* ── Zusammenfassung ── */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Wird übertragen</p>
            <ul className="space-y-1 text-xs text-gray-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                {registeredUsers.length} Teilnahme(n) → Gesamttabelle
              </li>
              {(seriesStatConfig?.stats ?? []).filter(s => {
                return Object.values(userStats).some(us => (us[s.field] ?? 0) > 0);
              }).map(s => (
                <li key={s.field} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  Stats „{s.field}" → werden summiert
                </li>
              ))}
              {winnerStatField && seriesWinnerTargetField && (
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Gewinner ({winnerStatField}) → +1 auf „{seriesWinnerTargetField}"
                </li>
              )}
              {mvpUserId && seriesStatConfig?.mvpStatField && (
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                  MVP {userName(registeredUsers.find(u => u.id === mvpUserId)!)} → +1 auf „{seriesStatConfig.mvpStatField}"
                </li>
              )}
              {hasPoll && pollWinnerId && pollLabel && (
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  Umfrage „{pollLabel}": {userName(registeredUsers.find(u => u.id === pollWinnerId)!)} → +{pollBonusPoints} Punkte
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
          <button onClick={onClose} disabled={loading}
            className="flex-1 text-sm border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white rounded-lg px-4 py-2 transition-colors disabled:opacity-50">
            Abbrechen
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 text-sm bg-teal-600 hover:bg-teal-500 text-white rounded-lg px-4 py-2 transition-colors disabled:opacity-50 font-medium">
            {loading ? "Wird gespeichert…" : isReEdit ? "Änderungen speichern" : "Abschließen & speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
