"use client";
import { parseCycleConfig, type CycleConfig } from "@/lib/series-cycles-config";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock } from "@/components/icons";
import { type StatRow } from "@/components/admin/StatRowsEditor";
import { deriveEventStatFields } from "@/lib/series-stat-fields";
import { TURNIERPUNKTE_STAT } from "@/lib/series-event-points";
import { calcNextDate, type RecurrenceType, type MonthlyMode } from "@/lib/recurrence";
import { resolveSeriesColor } from "@/lib/series-icons";
import { toDatetimeLocalBerlin, fromDatetimeLocalBerlin, formatBerlinDate } from "@/lib/time";
import { parseStatAliases, parseTournamentTemplate, type StatAliases, type TournamentTemplate } from "@/lib/series-seasons";
import { SeriesEvent, SettingsTabKey, PlacementReward, PollConfig, parseRewards, parsePollConfigs, Section, type SeriesDetailProps } from "./series-shared";

/** Zustand, abgeleitete Werte und Aktionen von SeriesDetailClient (aufgeteilt in Hook + Reiter-Komponenten). */
export function useSeriesDetail({
  series, allUsers, squads = [], hasActiveSibling = true, isModerator = true,
  isAdmin = false, canUndoCompletion = false, seasonCount = 1, groupStatFields = [], goalLimits = null, rewardLimits = null,
}: SeriesDetailProps) {
  const router = useRouter();
  // Abgeschlossene Saison: Punkteregeln, Belohnungen, Umfragen, Legacy, Spiel und Format sind gesperrt
  const isArchived = series.status === "archived";
  const isTournamentSeries = (series.events as { type?: string }[]).some(e => e.type === "tournament");
  const { confirm, ConfirmDialogElement } = useConfirm();
  const [tournamentTemplate, setTournamentTemplate] = useState<TournamentTemplate>(() => parseTournamentTemplate(series.tournamentTemplateJson));
  const [statAliases, setStatAliases] = useState<StatAliases>(() => parseStatAliases(series.statAliasesJson));
  const [undoConfirm, setUndoConfirm] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTabKey>("general");
  const [generatingNext, setGeneratingNext] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateDateStr, setGenerateDateStr] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteRevertCoins, setDeleteRevertCoins] = useState(false);
  const [deleteRevertRankPoints, setDeleteRevertRankPoints] = useState(false);

  // Basic
  const [name, setName]               = useState<string>(series.name);
  const [description, setDescription] = useState<string>(series.description ?? "");
  const [rules, setRules]             = useState<string>(series.rules ?? "");
  const [icon, setIcon]               = useState<string>(series.icon ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState<string>(series.coverImageUrl ?? "");
  const seriesColor = resolveSeriesColor(icon);

  // Category
  const [category, setCategory] = useState<string>(series.category ?? "");

  // Settings
  const [fixedGame, setFixedGame]           = useState<string>(series.fixedGame ?? "");
  const [fixedFormat, setFixedFormat]       = useState<string>(series.fixedFormat ?? "");
  const [genre, setGenre]                   = useState<string>(series.genre ?? "");
  const [platforms, setPlatforms]           = useState<string[]>(
    series.platform ? series.platform.split(",").map((p: string) => p.trim()).filter(Boolean) : []
  );
  const [discordChannelId, setDiscordChannelId] = useState<string>(series.discordChannelId ?? "");
  const [recurrenceType, setRecurrenceType] = useState<"" | "weekly" | "biweekly" | "monthly">(series.recurrenceType ?? "");
  // Zyklus-Automatik (lib/series-cycles.ts) — nur Mods
  const [cycleConfig, setCycleConfig] = useState<CycleConfig>(() => parseCycleConfig(series.cycleConfigJson ?? null));
  const [recurrenceMonthlyMode, setRecurrenceMonthlyMode] = useState<"dayOfMonth" | "weekdayOfMonth">(series.recurrenceMonthlyMode ?? "dayOfMonth");
  const [hidden, setHidden]                   = useState<boolean>(series.hidden ?? false);
  const [hiddenBusy, setHiddenBusy]           = useState(false);
  const [registrationLocked, setRegistrationLocked] = useState<boolean>(series.registrationLocked ?? false);
  const [registrationLockedBusy, setRegistrationLockedBusy] = useState(false);
  const [omaOriginal, setOmaOriginal] = useState<boolean>(series.omaOriginal ?? false);
  const [squadId, setSquadId] = useState<string>(series.squadId ?? "");
  const [squadIdBusy, setSquadIdBusy] = useState(false);

  // Stat config
  const initialStatCfg = (() => {
    try { return series.seriesStatConfig ? JSON.parse(series.seriesStatConfig) : {}; } catch { return {}; }
  })();
  const [statParticipationPts, setStatParticipationPts]   = useState<number>(initialStatCfg.participationPoints ?? 0);
  const [statSpectatorPts, setStatSpectatorPts]           = useState<number>(initialStatCfg.spectatorParticipationPoints ?? 0);
  const [statParticipationCoins, setStatParticipationCoins] = useState<number>(initialStatCfg.participationCoins ?? 0);
  const [statSpectatorCoins, setStatSpectatorCoins]         = useState<number>(initialStatCfg.spectatorParticipationCoins ?? 0);
  const [statTransferToGlobal, setStatTransferToGlobal]   = useState<boolean>(initialStatCfg.transferToGlobalRanking ?? false);
  // EINE Statistik-Liste der Reihe — was je Event erfasst wird (eventStatFields), wird daraus abgeleitet.
  // Altbestand: Event-only-Felder (ohne gleichnamigen Reihen-Stat) bleiben als Zeilen mit 0 Punkten.
  const [statRows, setStatRows] = useState<StatRow[]>(() => {
    const rows: StatRow[] = initialStatCfg.stats ?? [];
    const known = new Set(rows.map(r => r.field));
    const extra = ((initialStatCfg.eventStatFields ?? []) as string[]).filter(f => f && !known.has(f)).map(f => ({ field: f, pointsPer: 0 }));
    return [...rows, ...extra];
  });
  // Zusätzliche Münzen für die Platzierung (1./2./3.) innerhalb eines einzelnen Events der Reihe
  const [eventPlacementCoins, setEventPlacementCoins] = useState<{ place: number; coins: number }[]>(
    initialStatCfg.eventPlacementCoins ?? [{ place: 1, coins: 0 }, { place: 2, coins: 0 }, { place: 3, coins: 0 }]
  );
  // Tabellenpunkte für die Platzierung (1./2./3.) innerhalb eines einzelnen Events der Reihe
  const [eventPlacementPoints, setEventPlacementPoints] = useState<{ place: number; points: number }[]>(
    initialStatCfg.eventPlacementPoints ?? [{ place: 1, points: 0 }, { place: 2, points: 0 }, { place: 3, points: 0 }]
  );
  // Event-level stat settings (abgeleitet aus den Statistiken, siehe lib/series-stat-fields.ts)
  const eventStatFields = deriveEventStatFields(statRows);
  const [winnerStatField, setWinnerStatField] = useState<string>(initialStatCfg.winnerStatField ?? "");
  // Dominion Bonus
  const initialDom = initialStatCfg.dominionBonus ?? {};
  const [dominionEnabled, setDominionEnabled]           = useState<boolean>(initialDom.enabled ?? false);
  const [dominionTriggerStats, setDominionTriggerStats] = useState<string[]>(initialDom.triggerStats ?? []);
  const [dominionThreshold, setDominionThreshold]       = useState<number>(initialDom.threshold ?? 3);
  const [dominionCoins, setDominionCoins]               = useState<number>(initialDom.coins ?? 0);
  const [dominionSeriesPoints, setDominionSeriesPoints] = useState<number>(initialDom.seriesPoints ?? 0);

  // Legacy standings
  type LegacyRow = { userId: string; points: number; participations: number; stats: Record<string, number> };
  const [legacyRows, setLegacyRows] = useState<LegacyRow[]>(() => {
    try { return series.legacyStandings ? JSON.parse(series.legacyStandings) : []; } catch { return []; }
  });
  const [legacySearch, setLegacySearch] = useState("");

  // Placement rewards
  const initialRewards = parseRewards(series.placementRewardsJson);
  const [placementRewards, setPlacementRewards] = useState<PlacementReward[]>(initialRewards.placements);

  // Poll config — read from pollsConfigJson (wizard/create), fall back to pollConfigJson (legacy edit)
  const [polls, setPolls] = useState<PollConfig[]>(() => parsePollConfigs(series.pollsConfigJson ?? series.pollConfigJson));
  const [expandedPoll, setExpandedPoll] = useState<number | null>(null);

  const sortedSeriesEvents = [...(series.events as SeriesEvent[])].sort((a, b) => {
    const aDone = a.status === "finished";
    const bDone = b.status === "finished";
    if (aDone !== bDone) return aDone ? 1 : -1;
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });

  const latestEvent = (series.events as SeriesEvent[]).reduce<SeriesEvent | null>((latest, ev) =>
    !latest || new Date(ev.startAt).getTime() > new Date(latest.startAt).getTime() ? ev : latest
  , null);
  const latestStartAt = latestEvent ? new Date(latestEvent.startAt) : new Date();

  // Ältestes Event dient als Referenz für den Monatsmodus (Tag-des-Monats / n-ter Wochentag),
  // muss mit der Berechnung in der API-Route übereinstimmen.
  const oldestEvent = (series.events as SeriesEvent[]).reduce<SeriesEvent | null>((oldest, ev) =>
    !oldest || new Date(ev.startAt).getTime() < new Date(oldest.startAt).getTime() ? ev : oldest
  , null);

  function suggestedNextDate(): Date | null {
    if (!recurrenceType || !latestEvent || !oldestEvent) return null;
    return calcNextDate(
      new Date(latestEvent.startAt),
      recurrenceType as RecurrenceType,
      recurrenceMonthlyMode as MonthlyMode,
      new Date(oldestEvent.startAt),
    );
  }

  function updatePlacementReward(place: number, key: keyof PlacementReward, value: number) {
    setPlacementRewards(prev => prev.map(r => r.place === place ? { ...r, [key]: value } : r));
  }

  function updateEventPlacementCoins(place: number, value: number) {
    setEventPlacementCoins(prev => prev.map(r => r.place === place ? { ...r, coins: value } : r));
  }
  function updateEventPlacementPoints(place: number, value: number) {
    setEventPlacementPoints(prev => prev.map(r => r.place === place ? { ...r, points: value } : r));
  }

  function calcLegacyPoints(participations: number, stats: Record<string, number>): number {
    const statPts  = statRows.filter(sr => sr.field.trim()).reduce((sum, sr) => sum + (stats[sr.field] ?? 0) * sr.pointsPer, 0);
    const pollPts  = polls.filter(p => p.label.trim()).reduce((sum, p) => {
      const wins = stats[p.label] ?? 0;
      return sum + wins * p.winnerRankPoints;
    }, 0);
    const dominionPts = (dominionEnabled && dominionSeriesPoints > 0)
      ? (stats["Dominion Bonus"] ?? 0) * dominionSeriesPoints
      : 0;
    return participations * statParticipationPts + statPts + pollPts + dominionPts;
  }

  // Community-Ziel: Termine erben das Ziel der Reihe automatisch (lib/event-goal.ts). Dieser Knopf
  // entfernt nur einzelne Abweichungen bei noch nicht gestarteten Terminen, damit alle kommenden
  // Termine wieder dem Ziel der Reihe folgen.
  const upcomingTermineCount = (series.events as { status: string; startAt: string | Date }[])
    .filter(e => e.status !== "finished" && new Date(e.startAt).getTime() > Date.now()).length;
  const [applyingGoal, setApplyingGoal] = useState(false);
  async function applyGoalNow() {
    if (!(await confirm({
      title: "Abweichungen zurücksetzen",
      description: `Bei ${upcomingTermineCount} kommenden Terminen werden einzeln angepasste oder abgeschaltete Ziele entfernt. Sie folgen danach wieder dem Ziel der Reihe.`,
      confirmLabel: "Zurücksetzen",
    }))) return;
    setApplyingGoal(true);
    const res = await fetch("/api/admin/event-series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId: series.id, tournamentTemplateJson: JSON.stringify(tournamentTemplate), applyGoalToOpenEvents: true }),
    });
    setApplyingGoal(false);
    if (res.ok) { toast.success("Kommende Termine folgen wieder dem Ziel der Reihe"); router.refresh(); }
    else toast.error("Fehler beim Zurücksetzen");
  }

  /* ── Einstellungen + ungespeicherte Änderungen ──
   * Alles, was "Speichern" schickt, als ein Objekt — weicht es vom zuletzt gespeicherten Stand ab, erscheint
   * die Speicherleiste und das Verlassen der Seite wird gewarnt. Sichtbarkeit, Anmeldung und Squad im
   * Reiter "Allgemein" speichern dagegen sofort (eigene Knöpfe). */
  const settingsBody = {
        name:                 name.trim() || series.name,
        description:          description.trim() || null,
        rules:                rules.trim() || null,
        icon:                 icon || null,
        coverImageUrl:        coverImageUrl.trim() || null,
        category:             category || null,
        // Turniervorlage inkl. Community-Ziel — auch bei Reihen ohne Platzierung (Ziel im Reiter "Ziel")
        tournamentTemplateJson: JSON.stringify(tournamentTemplate),
        ...(seasonCount > 1 && { statAliasesJson: JSON.stringify(statAliases) }),
        // Abgeschlossene Saison: gesperrte Felder gar nicht erst mitschicken (der Server ignoriert sie ohnehin)
        ...(!isArchived && {
        fixedGame:            fixedGame.trim() || null,
        fixedFormat:          fixedFormat || null,
        discordChannelId:     discordChannelId.trim() || null,
        recurrenceType:       recurrenceType || null,
        recurrenceMonthlyMode: recurrenceType === "monthly" ? recurrenceMonthlyMode : null,
        ...(isModerator && { cycleConfigJson: JSON.stringify(cycleConfig) }),
        genre:    genre.trim() || null,
        platform: platforms.length > 0 ? platforms.join(", ") : null,
        seriesStatConfig: JSON.stringify({
          participationPoints:          statParticipationPts,
          spectatorParticipationPoints: statSpectatorPts,
          participationCoins:           statParticipationCoins,
          spectatorParticipationCoins:  statSpectatorCoins,
          transferToGlobalRanking:      statTransferToGlobal,
          stats: statRows.filter(r => r.field.trim()).map(r => ({ ...r, field: r.field.trim() })),
          winnerStatKeys: statRows.filter(r => r.field.trim() && r.isWinnerStat).map(r => r.field),
          matchWinStatKeys: statRows.filter(r => r.field.trim() && r.isMatchWinStat).map(r => r.field),
          ...(eventStatFields.length > 0 && { eventStatFields }),
          ...(winnerStatField && (eventStatFields.includes(winnerStatField) || winnerStatField === TURNIERPUNKTE_STAT) && { winnerStatField }),
          ...(dominionEnabled && dominionTriggerStats.length > 0 && {
            dominionBonus: {
              enabled:      true,
              triggerStats: dominionTriggerStats,
              threshold:    dominionThreshold,
              coins:        dominionCoins,
              seriesPoints: dominionSeriesPoints,
            },
          }),
          eventPlacementCoins,
          eventPlacementPoints,
        }),
        legacyStandings:     JSON.stringify(legacyRows),
        placementRewardsJson: JSON.stringify({ placements: placementRewards }),
        pollsConfigJson:      JSON.stringify(polls),
        }),
  };
  const settingsSnapshot = JSON.stringify(settingsBody);
  const [savedSettings, setSavedSettings] = useState(settingsSnapshot);
  const settingsDirty = settingsSnapshot !== savedSettings;
  useEffect(() => {
    if (!settingsDirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [settingsDirty]);
  /** Änderungen verwerfen: Seite mit dem gespeicherten Stand neu laden */
  function discardSettings() {
    setSavedSettings(settingsSnapshot); // keine Verlassen-Warnung beim Neuladen
    window.location.reload();
  }

  async function saveSettings() {
    setSaving(true);
    const res = await fetch("/api/admin/event-series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId: series.id, ...settingsBody }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedSettings(settingsSnapshot);
      toast.success(isArchived ? "Saison gespeichert" : "Reihe gespeichert – Änderungen wurden auf alle offenen Events der Reihe übertragen");
      router.refresh();
    } else {
      toast.error((await res.json().catch(() => null))?.error ?? "Fehler beim Speichern");
    }
  }

  async function toggleHidden() {
    setHiddenBusy(true);
    const next = !hidden;
    const res = await fetch("/api/admin/event-series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId: series.id, hidden: next }),
    });
    setHiddenBusy(false);
    if (res.ok) {
      setHidden(next);
      toast.success(next ? "Reihe ausgeblendet" : "Reihe wieder sichtbar");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Das hat nicht geklappt");
    }
  }

  async function toggleRegistrationLocked() {
    setRegistrationLockedBusy(true);
    const next = !registrationLocked;
    const res = await fetch("/api/admin/event-series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId: series.id, registrationLocked: next }),
    });
    setRegistrationLockedBusy(false);
    if (res.ok) {
      setRegistrationLocked(next);
      toast.success(next ? "Selbst-Anmeldung für die ganze Reihe deaktiviert" : "Selbst-Anmeldung wieder aktiv");
    } else {
      toast.error("Fehler");
    }
  }

  // OMA Original — gilt für alle Termine der Reihe, sofort gespeichert, nur Mods (lib/oma-original.ts)
  async function saveOmaOriginal(next: boolean) {
    setOmaOriginal(next);
    const res = await fetch("/api/admin/event-series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId: series.id, omaOriginal: next }),
    });
    if (res.ok) {
      toast.success(next ? "Reihe ist jetzt ein OMA Original" : "Reihe ist kein OMA Original mehr");
      router.refresh();
    } else {
      setOmaOriginal(!next);
      toast.error("Fehler beim Speichern");
    }
  }

  async function saveSquadId(next: string) {
    setSquadIdBusy(true);
    const res = await fetch("/api/admin/event-series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId: series.id, squadId: next || null }),
    });
    setSquadIdBusy(false);
    if (res.ok) {
      setSquadId(next);
      toast.success(next ? "Reihe auf Squad beschränkt" : "Squad-Beschränkung entfernt");
    } else {
      toast.error("Fehler");
    }
  }

  function openGenerateModal() {
    const suggested = suggestedNextDate();
    setGenerateDateStr(toDatetimeLocalBerlin(suggested ?? new Date()));
    setShowGenerateModal(true);
  }

  async function generateNextEvent() {
    if (!generateDateStr) return;
    const overrideDate = fromDatetimeLocalBerlin(generateDateStr);
    if (isNaN(overrideDate.getTime())) { toast.error("Ungültiges Datum"); return; }

    setGeneratingNext(true);
    const res = await fetch("/api/admin/event-series/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId: series.id, overrideDate: overrideDate.toISOString() }),
    });
    setGeneratingNext(false);
    if (res.ok) {
      const { event: newEv } = await res.json();
      const dateStr = formatBerlinDate(newEv.startAt, { day: "2-digit", month: "2-digit", year: "numeric" });
      toast.success(`Neuer Termin erstellt: ${newEv.title} am ${dateStr}`);
      setShowGenerateModal(false);
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Fehler beim Erstellen");
    }
  }

  async function undoCompletion() {
    setUndoing(true);
    try {
      const res = await fetch(`/api/admin/series/${series.id}/complete`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Fehler beim Aufheben"); return; }
      toast.success("Abschluss aufgehoben — die Saison ist wieder aktiv");
      setUndoConfirm(false);
      router.refresh();
    } finally {
      setUndoing(false);
    }
  }

  // Hinweis über gesperrten Einstellungen einer abgeschlossenen Saison
  const lockedNotice = isArchived ? (
    <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 border border-amber-500/20 bg-amber-500/[0.06]">
      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
      <p className="text-[11px] text-amber-200/80">
        Diese Saison ist abgeschlossen. Punkteregeln, Belohnungen, Umfragen, Spiel und Format sind gesperrt, damit Endtabelle und
        Auszahlung stimmen. Korrekturen laufen über „Abschluss bearbeiten“.
      </p>
    </div>
  ) : null;

  // All-Time-Tabelle: Stat-Felder verschiedener Saisons zusammenführen (gilt für die ganze Saison-Gruppe)
  const aliasSection = seasonCount > 1 && groupStatFields.length > 1 ? (
    <Section title="All-Time: Stat-Felder zusammenführen">
      <p className="text-[11px] text-gray-500">
        Wurde ein Stat zwischen den Saisons umbenannt, kannst du hier festlegen, dass er in der All-Time-Tabelle als ein Feld zählt.
        Gilt für alle Saisons dieser Reihe.
      </p>
      <div className="space-y-1.5">
        {groupStatFields.map(field => (
          <div key={field} className="flex items-center gap-2 text-xs">
            <span className="flex-1 text-gray-300 truncate">{field}</span>
            <span className="text-gray-600">zählt als</span>
            <select value={statAliases[field] ?? ""}
              onChange={e => setStatAliases(prev => {
                const next = { ...prev };
                if (e.target.value) next[field] = e.target.value; else delete next[field];
                return next;
              })}
              className="w-40 rounded-lg px-2 py-1 text-xs text-white outline-none bg-gray-800 border border-gray-700">
              <option value="">– eigenes Feld –</option>
              {groupStatFields.filter(o => o !== field && statAliases[o] !== field).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>
    </Section>
  ) : null;

  async function deleteSeries() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/series/${series.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revertCoins: deleteRevertCoins, revertRankPoints: deleteRevertRankPoints }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({ deletedEvents: 0 }));
        toast.success(`Eventreihe gelöscht – ${data.deletedEvents ?? 0} Event(s) mit entfernt`);
        router.push("/events/verwalten");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Fehler beim Löschen");
      }
    } finally {
      setDeleting(false);
    }
  }

  return { series, rewardLimits, settingsDirty, discardSettings, goalLimits, confirm, ConfirmDialogElement, allUsers, squads, hasActiveSibling, isModerator, isAdmin, canUndoCompletion, seasonCount, groupStatFields, router, isArchived, isTournamentSeries, tournamentTemplate, setTournamentTemplate, statAliases, setStatAliases, undoConfirm, setUndoConfirm, undoing, setUndoing, saving, setSaving, activeSettingsTab, setActiveSettingsTab, generatingNext, setGeneratingNext, showGenerateModal, setShowGenerateModal, generateDateStr, setGenerateDateStr, deleteConfirm, setDeleteConfirm, deleting, setDeleting, deleteRevertCoins, setDeleteRevertCoins, deleteRevertRankPoints, setDeleteRevertRankPoints, name, setName, description, setDescription, rules, setRules, icon, setIcon, coverImageUrl, setCoverImageUrl, seriesColor, category, setCategory, fixedGame, setFixedGame, fixedFormat, setFixedFormat, genre, setGenre, platforms, setPlatforms, discordChannelId, setDiscordChannelId, recurrenceType, setRecurrenceType, cycleConfig, setCycleConfig, recurrenceMonthlyMode, setRecurrenceMonthlyMode, hidden, setHidden, hiddenBusy, setHiddenBusy, registrationLocked, setRegistrationLocked, registrationLockedBusy, setRegistrationLockedBusy, omaOriginal, setOmaOriginal, squadId, setSquadId, squadIdBusy, setSquadIdBusy, initialStatCfg, statParticipationPts, setStatParticipationPts, statSpectatorPts, setStatSpectatorPts, statParticipationCoins, setStatParticipationCoins, statSpectatorCoins, setStatSpectatorCoins, statTransferToGlobal, setStatTransferToGlobal, statRows, setStatRows, eventPlacementCoins, setEventPlacementCoins, eventPlacementPoints, setEventPlacementPoints, eventStatFields, winnerStatField, setWinnerStatField, initialDom, dominionEnabled, setDominionEnabled, dominionTriggerStats, setDominionTriggerStats, dominionThreshold, setDominionThreshold, dominionCoins, setDominionCoins, dominionSeriesPoints, setDominionSeriesPoints, legacyRows, setLegacyRows, legacySearch, setLegacySearch, initialRewards, placementRewards, setPlacementRewards, polls, setPolls, expandedPoll, setExpandedPoll, sortedSeriesEvents, latestEvent, latestStartAt, oldestEvent, suggestedNextDate, updatePlacementReward, updateEventPlacementCoins, updateEventPlacementPoints, calcLegacyPoints, upcomingTermineCount, applyingGoal, setApplyingGoal, applyGoalNow, saveSettings, toggleHidden, toggleRegistrationLocked, saveOmaOriginal, saveSquadId, openGenerateModal, generateNextEvent, undoCompletion, lockedNotice, aliasSection, deleteSeries };
}

export type SeriesDetail = ReturnType<typeof useSeriesDetail>;
