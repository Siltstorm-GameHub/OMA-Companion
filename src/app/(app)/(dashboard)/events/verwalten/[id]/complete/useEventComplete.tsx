"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { parseAvgDirection, type AvgDirection } from "@/lib/avg-stats";
import { checkWinnerStat, rewardTotals } from "@/lib/event-complete-checks";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { confirmEventTiming, eventTimingWarning } from "@/lib/event-timing-warning";
import { noopSubscribe, PlacementReward, DominionChange, userName, computeGroups, sameGroups, computePlacementMap , type Props } from "./complete-shared";

/** Zustand, abgeleitete Werte und Aktionen von EventCompleteClient (aufgeteilt in Hook + Reiter-Komponenten). */
export function useEventComplete({
  eventId, eventTitle, eventStartAt, eventEndAt, seriesId, seriesName, seriesIcon,
  registeredUsers, spectatorUsers, allUsers, tournamentStatFields, winnerStatFieldOptions, defaultWinnerStatField,
  winnerStatSource = "auto", seriesWinnerStatField = null, userStats, format, userAvgScore, defaultAvgDirection = "high",
  seriesStatConfig, rewardsConfig, pollConfig, pollsConfig, pendingEventPolls, spectatorRewardJson,
  currentDominionStreaks,
  isAdmin, isMod, isReEdit, status, hasPlacement = true,
  initialData, initialFinalRanking, initialRankingGroups, initialFinalRankingNote,
  pendingSubmissions = 0, rewardHistory = null, rewardsCapped = false,
}: Props) {
  const router = useRouter();
  const isAvgFormat = format === "avg_stats";
  const { confirm, ConfirmDialogElement } = useConfirm();
  // Hinweis oben auf der Seite, solange noch gar nicht abgeschlossen wurde. Nur im Browser berechnet
  // (Server-Snapshot null), damit Server- und Client-Render nicht auseinanderlaufen; als String,
  // weil useSyncExternalStore einen stabilen Snapshot braucht.
  const timingWarningJson = useSyncExternalStore(
    noopSubscribe,
    () => isReEdit ? null : JSON.stringify(eventTimingWarning("complete", { startAt: eventStartAt, endAt: eventEndAt })),
    () => null,
  );
  const timingWarning = useMemo(
    () => (timingWarningJson ? JSON.parse(timingWarningJson) as ReturnType<typeof eventTimingWarning> : null),
    [timingWarningJson],
  );

  // Mode wird direkt vom Event-Status abgeleitet (nicht von completionData) — so zeigt die Seite
  // immer den richtigen Modus, auch wenn completionData z.B. durch eine manuelle Statusänderung
  // nicht mehr exakt zum Status passt.
  // Spielphase abgeschlossen, Umfragephase läuft noch: nur noch Umfrage + Endplatzierung editierbar.
  const isPollOnly = status === "umfrage" && isReEdit;
  // Event komplett abgeschlossen: reine Ergebnis-Übersicht, nur die Finale Platzierung bleibt änderbar.
  const isFinishedSummary = status === "finished" && isReEdit;
  // Event-Gewinner steht ab Abschluss der Spielphase fest und ist danach nicht mehr änderbar.
  const winnerLocked = isPollOnly || isFinishedSummary;

  // Läuft noch eine in-App-Umfrage (EventPoll), deren Abstimmungsfenster noch nicht vorbei ist?
  const openEventPolls = pendingEventPolls.filter(p => new Date(p.endAt) > new Date());
  // Im Poll-Only-Modus: schließt das Speichern hier die Umfragephase endgültig ab (Moderator/Admin können
  // noch offene Umfragen zwangsweise beenden; ohne offene Umfragen passiert das ohnehin automatisch)?
  const willFinalizePolls = isPollOnly && (isMod || openEventPolls.length === 0);

  /* ── Gewinner-Stat ── */
  // Gespeicherter Wert nur, wenn er noch eine wählbare Option ist (z.B. "Eventpunkte", die es bei
  // geänderter Reihen-Konfiguration nicht mehr gibt, oder ein umbenanntes Stat-Feld) — sonst bliebe die
  // Auswahl leer und die Platzierung unsortiert, obwohl die Reihe eine Voreinstellung hat.
  const [winnerStatField, setWinnerStatField] = useState<string>(() => {
    const options = winnerStatFieldOptions ?? tournamentStatFields;
    const saved = initialData?.winnerStatField as string | undefined;
    if (saved && options.includes(saved)) return saved;
    return defaultWinnerStatField ?? "";
  });
  const [avgDirection, setAvgDirection] = useState<AvgDirection>(
    parseAvgDirection(initialData?.avgWinnerDirection) ?? defaultAvgDirection
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
  // Als "manuell geändert" gilt eine gespeicherte Platzierung nur, wenn sie von der automatischen
  // Sortierung nach dem Gewinner-Stat abweicht — eine einfach bestätigte Auto-Sortierung bleibt "auto".
  const [rankingManuallyEdited, setRankingManuallyEdited] = useState(() => {
    if (!initialFinalRanking?.length) return false;
    // Seit dem Speichern des Flags: gespeicherte Entscheidung übernehmen. Ältere Abschlüsse: Vergleich
    // mit der Auto-Sortierung.
    if (typeof initialData?.rankingManual === "boolean") return initialData.rankingManual;
    if (!isAvgFormat && !winnerStatField) return true;
    const auto = computeAutoRanking(rankingOrder, winnerStatField, avgDirection);
    return !sameGroups(computeGroups(rankingOrder, tiedAbove), computeGroups(auto.sorted, auto.tied));
  });
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Verfolgt, ob in dieser Sitzung (nicht historisch) an Finaler Platzierung/Begründung/Disqualifikation
  // etwas geändert wurde — steuert den zusätzlichen "Nur Änderungen speichern"-Button während der
  // Umfragephase, mit dem Admins diese Änderungen sichern können, ohne die Umfragephase zu beenden.
  const [rankingDirty, setRankingDirty] = useState(false);

  /* ── Ausschluss (Disqualifikation) ── */
  // Ausgeschlossene User bleiben in Stats/Tabellen sichtbar, erhalten aber keine Münzen/Tabellenpunkte/
  // Rang-Punkte aus diesem Event und können nicht Event-Gewinner sein. Auch nachträglich (Re-Edit)
  // änderbar. Die Begründung trägt der Admin im bereits vorhandenen Notiz-Feld ein.
  const [excludedUsers, setExcludedUsers] = useState<Set<string>>(() =>
    new Set((initialData?.excludedUserIds as string[] | undefined) ?? [])
  );
  function toggleExcluded(uid: string) {
    setRankingDirty(true);
    setExcludedUsers(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  }

  // Auto-sort on first render if:
  // - no saved ranking exists yet, OR
  // - saved ranking was missing users (e.g. merged stub accounts) → re-sort to place them correctly
  const hasMissingUsers = (() => {
    if (!initialFinalRanking?.length) return false;
    const savedIds = new Set(initialFinalRanking);
    return registeredUsers.some(u => !savedIds.has(u.id));
  })();
  useEffect(() => {
    // Nicht manuell geänderte Platzierungen folgen immer den aktuellen Stats und Voreinstellungen
    if ((isAvgFormat || winnerStatField) && (!initialFinalRanking?.length || hasMissingUsers || !rankingManuallyEdited)) {
      autoSort(winnerStatField);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [loading, setLoading] = useState(false);

  /* ── Derived ── */
  const seriesStatFields = (seriesStatConfig?.stats ?? []).map(s => s.field);

  /* ── Dominion Bonus ── */
  const dominionCfg = seriesStatConfig?.dominionBonus;
  const dominionTriggerLabel = dominionCfg
    ? (dominionCfg.triggerStats?.length ? dominionCfg.triggerStats.join(", ") : (dominionCfg.triggerStat ?? ""))
    : "";
  // Ergebnis des letzten Abschlusses (Streak-Fortschritt/Bonus) — kommt erst nach dem ersten
  // Speichern dazu, da der Streak-Stand server-seitig (Reihen-Standings) geführt wird und hier
  // nicht vorab simulierbar ist.
  const dominionChanges = (initialData?.dominionChanges ?? null) as Record<string, DominionChange> | null;
  const dominionAwarded = dominionChanges
    ? Object.entries(dominionChanges).filter(([, c]) => c.bonusAwarded)
    : [];

  /* ── Anwesenheit (Spieler) ──
   * Wer angemeldet, aber nicht da war: keine Teilnahme-Belohnung, keine Platzierung, keine Tabellenpunkte —
   * und anders als bei einer Disqualifikation kein "Disqualifiziert" in der Anzeige. */
  const [absentPlayers, setAbsentPlayers] = useState<Set<string>>(() =>
    new Set((initialData?.absentPlayerIds as string[] | undefined) ?? [])
  );
  function toggleAbsent(uid: string) {
    setRankingDirty(true);
    setAbsentPlayers(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  }
  // Ohne Belohnung: disqualifiziert oder nicht da
  const unrewarded = useMemo(() => new Set([...excludedUsers, ...absentPlayers]), [excludedUsers, absentPlayers]);
  // Platzierung nur unter Anwesenden — Abwesende belegen keinen Platz
  const presentOrder = useMemo(() => rankingOrder.filter(id => !absentPlayers.has(id)), [rankingOrder, absentPlayers]);
  const rankingGroups = useMemo(() => computeGroups(presentOrder, tiedAbove), [presentOrder, tiedAbove]);
  const placementMap  = useMemo(() => computePlacementMap(rankingGroups), [rankingGroups]);

  // Sobald eine Finale Platzierung existiert (Standardfall: stat-auto-sortiert, kann aber manuell
  // überschrieben werden — z.B. Disqualifikation), gilt Platz 1 (bzw. bei Gleichstand alle Platz-1-
  // Spieler) als tatsächlicher Gewinner. Damit spiegelt die Anzeige eine manuelle Korrektur der
  // Platzierung sofort wider, statt weiterhin den rein stat-basierten (theoretischen) Sieger zu zeigen.
  // Ausgeschlossene (disqualifizierte) User zählen nie als Gewinner, auch wenn sie Platz 1 belegen —
  // ohne automatische Beförderung des nächsten Platzes (analog zum Server).
  const previewWinners = useMemo(() => {
    if (rankingGroups.length > 0) return rankingGroups[0].filter(id => !excludedUsers.has(id));
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
  }, [rankingGroups, excludedUsers, isAvgFormat, avgDirection, userAvgScore, winnerStatField, userStats]);

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

  // Teilnahme-/Zuschauer-Münzen: bei Events innerhalb einer Reihe seriesweit fix aus der
  // Reihentabellen-Konfiguration, sonst aus den Event-eigenen Belohnungen
  const effectiveParticipationCoins = seriesId ? (seriesStatConfig?.participationCoins ?? 0) : rewardsConfig.participationCoins;
  const effectiveSpectatorCoins = seriesId ? (seriesStatConfig?.spectatorParticipationCoins ?? 0) : (spectatorRewardJson?.coins ?? 0);

  // Platzierungs-Belohnung für dieses einzelne Event: bei Events innerhalb einer Reihe gibt es hier
  // höchstens die seriesweit konfigurierten Bonus-Münzen (keine Rang-Punkte) — die volle Belohnung
  // (Münzen + Rang-Punkte) kommt erst bei Abschluss der gesamten Reihe anhand der Endplatzierung.
  function getPlacementReward(place: number): PlacementReward | undefined {
    if (seriesId) {
      const coins = seriesStatConfig?.eventPlacementCoins?.find(p => p.place === place)?.coins ?? 0;
      const tablePoints = seriesStatConfig?.eventPlacementPoints?.find(p => p.place === place)?.points ?? 0;
      return coins > 0 || tablePoints > 0 ? { place, coins, rankPoints: 0, tablePoints } : undefined;
    }
    return rewardsConfig.placements.find(p => p.place === place);
  }

  /* ── Prüfung des Gewinner-Stats (Vergleich mit dem Stat der Reihe, fehlende Werte) ── */
  const winnerCheck = useMemo(
    () => checkWinnerStat(registeredUsers.map(u => u.id), userStats, winnerStatField, seriesWinnerStatField, excludedUsers),
    [registeredUsers, userStats, winnerStatField, seriesWinnerStatField, excludedUsers],
  );

  /* ── Summe der Belohnungen für die feste Zusammenfassung ── */
  const totals = rewardTotals({
    order: rankingOrder,
    placementOf: uid => placementMap.get(uid) ?? rankingOrder.indexOf(uid) + 1,
    rewardForPlace: getPlacementReward,
    excluded: unrewarded,
    participationCoins: effectiveParticipationCoins,
    spectatorsAttended: spectatorRewardJson ? spectatorAttended.size : 0,
    spectatorCoins: effectiveSpectatorCoins,
    spectatorRankPoints: spectatorRewardJson?.rankPoints ?? 0,
  });

  /* ── Ranking auto-sort with tie detection ── */
  function scoreOf(uid: string, field: string): number {
    return isAvgFormat ? (userAvgScore[uid] ?? 0) : (userStats[uid]?.[field] ?? 0);
  }
  // direction explizit übergebbar: direkt nach setAvgDirection() hält avgDirection noch den alten Wert
  function computeAutoRanking(order: string[], field: string, direction: AvgDirection) {
    const dirMul = isAvgFormat && direction === "low" ? 1 : -1;
    // avg_stats: Spieler ohne gespielte Runde (kein Ø) immer ans Ende — sonst würde ihre fiktive 0
    // bei "niedrigster Ø gewinnt" ganz oben landen.
    const unscored = (uid: string) => isAvgFormat && userAvgScore[uid] === undefined;
    const sorted = [...order].sort(
      (a, b) => (Number(unscored(a)) - Number(unscored(b))) || dirMul * (scoreOf(a, field) - scoreOf(b, field))
    );
    const newTied = new Set<string>();
    for (let i = 1; i < sorted.length; i++) {
      if (unscored(sorted[i]) === unscored(sorted[i - 1]) && scoreOf(sorted[i], field) === scoreOf(sorted[i - 1], field)) {
        newTied.add(sorted[i]);
      }
    }
    return { sorted, tied: newTied };
  }
  function autoSort(field = winnerStatField, direction = avgDirection) {
    if (!isAvgFormat && !field) return;
    const { sorted, tied } = computeAutoRanking(rankingOrder, field, direction);
    setTiedAbove(tied);
    setRankingOrder(sorted);
    setRankingManuallyEdited(false);
  }

  function toggleTied(uid: string) {
    setRankingManuallyEdited(true);
    setRankingDirty(true);
    setTiedAbove(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setRankingManuallyEdited(true);
    setRankingDirty(true);
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
    setRankingDirty(true);
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
  // keepPollOpen: erzwingt, dass eine noch laufende Umfragephase NICHT beendet wird — auch nicht für
  // Admins (die sie sonst beim Speichern automatisch mit abschließen). Damit können Änderungen an der
  // Finalen Platzierung/Begründung während der Umfragephase gesichert werden, ohne das Event dadurch
  // schon komplett abzuschließen.
  async function handleConfirm(pollOnly = false, keepPollOpen = false) {
    // Erster Abschluss vor Start bzw. vor eingetragenem Ende → Warnung (Korrekturen später nicht mehr)
    if (!isReEdit && !(await confirmEventTiming(confirm, "complete", { startAt: eventStartAt, endAt: eventEndAt }))) return;
    setLoading(true);

    try {
      const hasPollVotes = pollWinners.length > 0;
      const res = await fetch(`/api/admin/events/${eventId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mvpUserId:               mvpUserId || undefined,
          winnerStatField:         isAvgFormat ? undefined : (winnerStatField || undefined),
          rankingManual:           rankingManuallyEdited,
          avgWinnerDirection:      isAvgFormat ? avgDirection : undefined,
          seriesWinnerTargetField: seriesWinnerTargetField || undefined,
          // keepPollOpen: Legacy-Umfrage-Sieger bewusst nicht mitschicken — sonst würde das Übermitteln
          // von pollWinnerIds die Umfrage server-seitig sofort auflösen und das Event unabhängig vom
          // closeOpenPolls-Flag doch abschließen (siehe route.ts: legacyPollResolved).
          pollWinnerIds:           !pollOnly && !keepPollOpen && pollConfig.enabled && hasPollVotes ? pollWinners : undefined,
          pollLabel:               pollConfig.enabled ? pollConfig.question : undefined,
          pollBonusCoins:          pollConfig.enabled ? pollConfig.coins : undefined,
          pollBonusRankPoints:     pollConfig.enabled ? pollConfig.rankPoints : undefined,
          pollExcludedUserIds:     pollConfig.enabled && pollExcluded.size > 0 ? [...pollExcluded] : undefined,
          spectatorAttendedIds:    spectatorUsers.length > 0 ? [...spectatorAttended] : undefined,
          finalRanking:            !hasPlacement ? [] : presentOrder.length > 0 ? presentOrder : undefined,
          finalRankingGroups:      !hasPlacement ? [] : rankingGroups.length > 0 ? rankingGroups : undefined,
          finalRankingNote:        rankingNote || undefined,
          excludedUserIds:         excludedUsers.size > 0 ? [...excludedUsers] : undefined,
          // Leer schicken, damit "alle wieder da" eine frühere Abwesenheit aufhebt
          absentPlayerIds:         [...absentPlayers],
          // Beträge kommen auf dem Server aus der gespeicherten Konfiguration, nicht von hier
          closeOpenPolls:          keepPollOpen ? false : (isPollOnly ? isMod : undefined),
          keepPollOpen:            keepPollOpen || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Fehler beim Abschließen");
        return;
      }
      setRankingDirty(false);
      if (keepPollOpen) {
        toast.success(`Änderungen für "${eventTitle}" gespeichert – Umfrage läuft weiter`);
        router.refresh();
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
      router.push(`/events/verwalten/${eventId}`);
    } finally {
      setLoading(false);
    }
  }

  /* ── Render ── */
  const backHref = `/events/verwalten/${eventId}`;
  const pageTitle = isPollOnly ? "Umfrage abschließen" : isFinishedSummary ? "Ergebnisse" : "Event abschließen";
  const hasExtras = !!seriesStatConfig?.mvpStatField || !!dominionCfg?.enabled || (spectatorUsers.length > 0 && !!spectatorRewardJson);
  const hasPolls = pollsConfig.length > 0 || pendingEventPolls.length > 0 || (pollConfig.enabled && pollsConfig.length === 0);
  const firstStep = hasPlacement ? "Platzierung" : "Teilnehmer";
  const steps = [firstStep, ...(hasExtras ? ["Extras"] : []), ...(hasPolls ? ["Umfrage"] : [])];
  const stepNo = (name: string) => steps.indexOf(name) + 1;
  const noRanking = hasPlacement && !isFinishedSummary && !isPollOnly && registeredUsers.length > 0 && rankingOrder.length === 0;
  // Teilnahme-Rang-Punkte gibt es nur bei eigenständigen Events (in einer Reihe: Reihentabelle)
  const participationRankPts = seriesId ? 0 : (rewardsConfig.participationRankPts ?? 0);
  const mainLabel = loading
    ? "Wird gespeichert…"
    : willFinalizePolls ? "Umfrage beenden und Event abschließen"
    : isFinishedSummary ? "Ergebnisse bestätigen"
    : isPollOnly ? "Änderungen speichern"
    : pollPhasePending ? "Abschließen, Umfrage startet"
    : "Abschließen und Belohnungen vergeben";
  const winnerSourceText = winnerStatSource === "event" ? "aus den Einstellungen dieses Events"
    : winnerStatSource === "series" ? "aus den Einstellungen der Eventreihe" : "automatisch gewählt";
  const nameOf = (uid: string) => userName(registeredUsers.find(u => u.id === uid) ?? { id: uid, name: uid, username: null, image: null });

  // Was der Hauptknopf genau tut — ein Satz über dem Knopf (statt nur der wechselnden Beschriftung)
  const actionSummary = (() => {
    if (isPollOnly) {
      return willFinalizePolls
        ? "Beendet die Umfrage, vergibt die Umfrage-Belohnungen und schließt das Event ab."
        : "Speichert die Platzierung. Die Umfrage läuft weiter.";
    }
    const pay = [
      totals.coins > 0 && `${totals.coins.toLocaleString("de-DE")} Münzen`,
      totals.rankPoints > 0 && `${totals.rankPoints} Rang-Punkte`,
      totals.tablePoints > 0 && `${totals.tablePoints} Tabellenpunkte`,
    ].filter(Boolean).join(", ");
    if (isFinishedSummary) return "Rechnet neu und bucht nur Unterschiede nach oder zurück.";
    const who = `${totals.players} ${totals.players === 1 ? "Spieler" : "Spieler"}`;
    return [
      pay ? `Zahlt ${pay} an ${who} aus` : `Schließt ab für ${who}, ohne Belohnung`,
      pollPhasePending ? "die Umfrage startet danach" : "die Teilnehmer bekommen eine Meldung",
    ].join(", ") + ".";
  })();
  // Mitglieder können offene Umfragen nicht vorzeitig beenden — wann endet die letzte automatisch?
  const pollAutoEnd = openEventPolls.length > 0
    ? openEventPolls.map(p => p.endAt).sort().at(-1) ?? null
    : null;

  return { pendingSubmissions, rewardHistory, rewardsCapped, absentPlayers, toggleAbsent, unrewarded, presentOrder, actionSummary, pollAutoEnd, eventId, eventTitle, eventStartAt, eventEndAt, seriesId, seriesName, seriesIcon, registeredUsers, spectatorUsers, allUsers, tournamentStatFields, winnerStatFieldOptions, defaultWinnerStatField, winnerStatSource, seriesWinnerStatField, userStats, format, userAvgScore, defaultAvgDirection, seriesStatConfig, rewardsConfig, pollConfig, pollsConfig, pendingEventPolls, spectatorRewardJson, currentDominionStreaks, isAdmin, isMod, isReEdit, status, hasPlacement, initialData, initialFinalRanking, initialRankingGroups, initialFinalRankingNote, router, isAvgFormat, confirm, ConfirmDialogElement, timingWarningJson, timingWarning, isPollOnly, isFinishedSummary, winnerLocked, openEventPolls, willFinalizePolls, winnerStatField, setWinnerStatField, avgDirection, setAvgDirection, seriesWinnerTargetField, setSeriesWinnerTargetField, mvpUserId, setMvpUserId, pollExcluded, setPollExcluded, pollVotes, setPollVotes, spectatorAttended, setSpectatorAttended, rankingOrder, setRankingOrder, tiedAbove, setTiedAbove, rankingNote, setRankingNote, rankingManuallyEdited, setRankingManuallyEdited, dragIdx, setDragIdx, rankingDirty, setRankingDirty, excludedUsers, setExcludedUsers, toggleExcluded, hasMissingUsers, loading, setLoading, seriesStatFields, dominionCfg, dominionTriggerLabel, dominionChanges, dominionAwarded, rankingGroups, placementMap, previewWinners, pollEligible, pollWinners, canDeferPoll, pollPhasePending, effectiveParticipationCoins, effectiveSpectatorCoins, getPlacementReward, winnerCheck, totals, scoreOf, computeAutoRanking, autoSort, toggleTied, moveUp, moveDown, handleConfirm, backHref, pageTitle, hasExtras, hasPolls, firstStep, steps, stepNo, noRanking, participationRankPts, mainLabel, winnerSourceText, nameOf };
}

export type EventComplete = ReturnType<typeof useEventComplete>;
