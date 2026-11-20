"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OpenEventsAction, computeGroups, computePlacementMap , type Props } from "./series-complete-shared";

/** Zustand, abgeleitete Werte und Aktionen von SeriesCompleteClient (aufgeteilt in Hook + Reiter-Komponenten). */
export function useSeriesComplete({
  seriesId, seriesName, seriesIcon, statFields, participants, userStats, rewardsConfig,
  isReEdit, pollPhaseComplete, initialData, openEvents, playedOpenEvents = [], isTournamentSeries,
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

  /* ── Offene Termine ── */
  const [openEventsAction, setOpenEventsAction] = useState<OpenEventsAction>("move");

  /* ── Zusammenfassung vor dem Bestätigen ── */
  const [confirmPollOnly, setConfirmPollOnly] = useState<boolean | null>(null);

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

  // Wer bekommt was — dieselbe Regel wie die Abschluss-Route (Gleichstand = gleicher Platz)
  function payoutPreview(pollOnly: boolean) {
    const rows: { uid: string; place: number | null; coins: number; rankPoints: number; poll: boolean }[] = [];
    // Auch beim Nachtragen der Abstimmung wird die Endplatzierung (unverändert) neu gebucht
    for (const group of rankingGroups) {
      const place = placementMap.get(group[0]) ?? 0;
      const reward = rewardsConfig.placements.find(p => p.place === place);
      if (!reward || (reward.coins <= 0 && reward.rankPoints <= 0)) continue;
      for (const uid of group) rows.push({ uid, place, coins: Math.max(0, reward.coins), rankPoints: Math.max(0, reward.rankPoints), poll: false });
    }
    if (!pollOnly && pollEnabled && pollWinners.length > 0) {
      for (const uid of pollWinners) {
        const existing = rows.find(r => r.uid === uid);
        if (existing) { existing.coins += Math.max(0, pollCoins); existing.rankPoints += Math.max(0, pollRankPts); existing.poll = true; }
        else rows.push({ uid, place: null, coins: Math.max(0, pollCoins), rankPoints: Math.max(0, pollRankPts), poll: true });
      }
    }
    return rows;
  }

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

  // "Verschieben" setzt eine neue Saison voraus — ohne sie bleiben die Termine in dieser Saison
  const effectiveOpenEventsAction: OpenEventsAction = openEventsAction === "move" && !startNewSeason ? "keep" : openEventsAction;

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
          openEvents:          openEvents.length > 0 ? effectiveOpenEventsAction : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Fehler beim Abschließen");
        setConfirmPollOnly(null);
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
          ? `/events/verwalten/reihen/${seriesId}/new-season`
          : `/events/verwalten/reihen/${seriesId}`
      );
    } finally {
      setLoading(false);
    }
  }

  return { seriesId, seriesName, seriesIcon, statFields, participants, userStats, rewardsConfig, isReEdit, pollPhaseComplete, initialData, openEvents, playedOpenEvents, isTournamentSeries, router, isPollOnly, rankingOrder, setRankingOrder, tiedAbove, setTiedAbove, rankingManuallyEdited, setRankingManuallyEdited, dragIdx, setDragIdx, pollEnabled, setPollEnabled, pollQuestion, setPollQuestion, pollCoins, setPollCoins, pollRankPts, setPollRankPts, pollExcluded, setPollExcluded, pollVotes, setPollVotes, startNewSeason, setStartNewSeason, openEventsAction, setOpenEventsAction, confirmPollOnly, setConfirmPollOnly, loading, setLoading, rankingGroups, placementMap, pollEligible, pollWinners, payoutPreview, autoSort, toggleTied, moveUp, moveDown, onDragStart, onDragOver, effectiveOpenEventsAction, handleConfirm };
}

export type SeriesComplete = ReturnType<typeof useSeriesComplete>;
