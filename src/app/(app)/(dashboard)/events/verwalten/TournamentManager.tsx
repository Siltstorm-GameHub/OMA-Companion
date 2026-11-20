"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "@/components/icons";
import { Trophy, Plus, Trash2, Clock, Save, X, RotateCcw, RefreshCw, Pencil, History, Play, Square, CalendarClock } from "@/components/icons";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { confirmEventTiming } from "@/lib/event-timing-warning";
import { PLACEMENT_STAT_KEY } from "@/lib/series-event-points";
import { formatLabel as centralFormatLabel } from "@/lib/tournament-formats";
import { GROUP_KNOCKOUT_FORMAT, groupLabel, knockoutRoundLabel } from "@/lib/tournaments/groupStage";
import TournamentManagerMobile from "./TournamentManagerMobile";
import GroupStagePanel, { type GroupStageActionBody } from "./GroupStagePanel";
import { formatBerlinDateTime, toDatetimeLocalBerlin, fromDatetimeLocalBerlin } from "@/lib/time";
import { nextStatRoundNumber, sortStatRounds, statRoundLabel, statRoundNote, supportsMatchWin } from "@/lib/tournaments/stat-rounds";
import StatRoundFields, { StatRoundMetaEditor } from "./StatRoundFields";
import { NumberInput } from "@/components/ui/NumberInput";
import { DropMenu, InlineSubmissions, StatStandingsTable, TournamentHeader, type InlineSubmission } from "./TournamentOverview";
import { duelProgress, nextDuelMatches, statProgress, statStandings } from "@/lib/tournaments/progress";
import { bracketColumns } from "@/lib/tournaments/bracket-tree";
import BracketTree from "./BracketTree";
import { computeTurnierpunkte } from "@/lib/series-event-points";
import { computeCommunityGoalProgress, goalUnit, isAvgGoal, type CommunityGoal } from "@/lib/community-goal";
import type { AvgDirection } from "@/lib/avg-stats";
import { formatDecimal } from "@/lib/format-number";
import { drawPreview, type DrawSeeding } from "@/lib/tournaments/draw-plan";

export type User = { id: string; name: string | null; username: string | null; image: string | null };
export type MatchEntry = {
  id: string; userId: string | null; teamId: string | null;
  placement: number | null; score: number | null; statsJson: string | null;
};
export type Match = {
  id: string; round: number; position: number;
  title: string | null; scheduledAt: string | Date | null; notes: string | null;
  player1Id: string | null; player2Id: string | null;
  winnerId: string | null; score1: number | null; score2: number | null;
  playedAt: string | Date | null; entries: MatchEntry[];
  resultConfirmed?: boolean;
  /** Nur group_knockout: Gruppe des Gruppenspiels, null = K.O.-Runde */
  groupIndex?: number | null;
  /** Spiel um Platz 3 (K.O.-Runde) */
  isThirdPlace?: boolean;
  /** K.O.-Runde mit Hin- und Rückspiel: 1 = Hinspiel, 2 = Rückspiel */
  leg?: number | null;
  /** "Läuft gerade" (vom Admin markiert) */
  startedAt?: string | Date | null;
  /** Kampflos entschieden (Gegner nicht angetreten) */
  walkover?: boolean;
};

/** Eintrag im Änderungsprotokoll eines Matches (GET /api/tournaments/[id]/matches?matchId=…) */
type MatchLogEntry = {
  id: string; action: string; actor: string; createdAt: string;
  before: { played: boolean; winnerId: string | null; score1: number | null; score2: number | null } | null;
  after:  { played: boolean; winnerId: string | null; score1: number | null; score2: number | null } | null;
};
export type Participant = { userId: string; user: User; groupIndex?: number | null };
export type Tournament = {
  id: string; status: string; format: string;
  pointsConfig: string | null; statFields: string | null;
  finalRankingJson: string | null; finalRankingNote: string | null;
  groupStageJson?: string | null;
  participants: Participant[]; matches: Match[];
};
type Event = { id: string; startAt?: Date | string; endAt?: Date | string | null };




export const userName = (u: User) => u.username ?? u.name ?? "?";

export function fmtDate(iso: string | Date) {
  return formatBerlinDateTime(iso, {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

type ViewMode = "auto" | "touch" | "desktop";
const VIEW_MODE_KEY = "tm-view-mode";
const viewModeListeners = new Set<() => void>();
function subscribeViewMode(l: () => void) {
  viewModeListeners.add(l);
  return () => { viewModeListeners.delete(l); };
}
function readViewMode(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_MODE_KEY);
    return v === "touch" || v === "desktop" ? v : "auto";
  } catch { return "auto"; }
}

/** Aktueller Zeitpunkt im Format, das <input type="datetime-local"> erwartet (als Berlin-
 *  Wanduhrzeit) — Basis für die Vorbelegung "Datum & Uhrzeit" beim Öffnen von "Match hinzufügen". */
export function nowForDatetimeLocal(): string {
  return toDatetimeLocalBerlin(new Date());
}

// ─── Main Manager (tournament exists) ────────────────────────────────────────
export default function TournamentManager({
  event, tournament: initial, allUsers, winnerStatKeys = [], matchWinStatKeys = [], placementPoints, standaloneEvent = false,
  pendingSubmissions = [], pendingCount = 0, pointsCfg = null, goal = null, avgDirection = "high", notReadyNames = null,
}: {
  /** Check-in an: Namen der angemeldeten Spieler, die noch nicht bereit sind (werden nicht ausgelost). null = kein Check-in */
  notReadyNames?: string[] | null;
  /** Offene Ergebnis-Meldungen der Spieler (nur Turnier-Seite) — direkt übernehmen/ablehnen */
  pendingSubmissions?: InlineSubmission[];
  pendingCount?: number;
  /** Eventpunkte-Konfiguration (wie beim Abschluss) — für die Live-Tabelle der Stat-Formate */
  pointsCfg?: { stats: { field: string; pointsPer: number }[]; placementPoints?: Record<string, number>; winnerStatKeys?: string[]; matchWinStatKeys?: string[] } | null;
  /** Community-Ziel (Punktewertung) — Fortschrittsbalken über der Tabelle */
  goal?: CommunityGoal | null;
  /** Durchschnittswerte: höchster oder niedrigster Ø gewinnt */
  avgDirection?: AvgDirection;
  event: Event;
  tournament: Tournament | null;
  allUsers: User[];
  winnerStatKeys?: string[];
  /** Reihen-Stats, die aus der pro-Runde "Match Win"-Markierung gespeist werden (Schritt 4, ⚔️-Toggle).
   *  Nur wenn hier mind. einer konfiguriert ist, macht die Match-Win-/Team-UI unten überhaupt Sinn —
   *  sonst würde sie für jedes Kooperativ-Turnier angezeigt, auch wenn niemand die Stat nutzt. */
  matchWinStatKeys?: string[];
  /** Punkte je Platz (Event-eigene statConfigJson, siehe EventEditClient "Turnier"-Reiter, coop_stats) —
   *  nur wenn gesetzt, wird die Platzierungs-Spalte pro Runde angezeigt (Schritt 4). */
  placementPoints?: Record<string, number> | null;
  /** Event gehört zu keiner Reihe — dann gibt es keine matchWinStatKeys, Match Win/Teams sollen beim
   *  Skill-Index trotzdem erfassbar sein (Beschreibung "optional Team-Match-Win"). */
  standaloneEvent?: boolean;
}) {
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(initial);
  // Nach router.refresh() kommen neue Server-Daten als Prop — dann den lokalen Stand ersetzen
  // (z.B. frisch ausgeloste Gruppen). Verglichen werden die Arrays, nicht das Wrapper-Objekt, das
  // die Eltern bei jedem Render neu bauen.
  const [syncedFrom, setSyncedFrom] = useState(initial);
  if (initial && (initial.matches !== syncedFrom?.matches || initial.participants !== syncedFrom?.participants
      || initial.groupStageJson !== syncedFrom?.groupStageJson || initial.status !== syncedFrom?.status)) {
    setSyncedFrom(initial);
    setTournament(initial);
  }
  const [loading, setLoading] = useState(false);
  // Auslosung: zufällig oder nach Rangpunkten gesetzt
  const [seeding, setSeeding] = useState<DrawSeeding>("random");
  // Spieler ersetzen (nach der Auslosung)
  const [showReplace, setShowReplace] = useState(false);
  const [replaceFrom, setReplaceFrom] = useState("");
  const [replaceTo, setReplaceTo] = useState("");
  const { confirm, ConfirmDialogElement } = useConfirm();
  const resultsTimingOk = useRef(false);

  // ── Panel visibility ──────────────────────────────────────────────────
  const [showParticipants, setShowParticipants] = useState(false);
  const [showAdd, setShowAdd]               = useState(false);
  // Stat-Formate: Live-Tabelle oder Runden-Liste
  const [statView, setStatView]             = useState<"table" | "rounds">("table");
  // K.O.-Formate: visueller Baum oder Liste je Runde; im Baum gewählte Paarung
  const [duelView, setDuelView]             = useState<"tree" | "list">("tree");
  const [treeSel, setTreeSel]               = useState<string | null>(null);
  const addRef = useRef<HTMLDivElement>(null);

  // Ansicht: "auto" (Touch-UI bei schmalem Viewport oder Finger-Eingabe) oder manuell erzwungen.
  // Pro Gerät im Browser gemerkt; gilt für alle Nutzer inkl. Desktop-PC.
  const viewMode = useSyncExternalStore(subscribeViewMode, readViewMode, () => "auto" as ViewMode);
  function changeViewMode(v: ViewMode) {
    try { localStorage.setItem(VIEW_MODE_KEY, v); } catch { /* ignore */ }
    viewModeListeners.forEach(l => l());
  }

  // ── Participant management ────────────────────────────────────────────
  const [addParticipantId, setAddParticipantId] = useState("");

  // ── Match form state ──────────────────────────────────────────────────
  const [mTitle, setMTitle]       = useState("");
  const [mScheduled, setMScheduled] = useState("");
  const [mNotes, setMNotes]       = useState("");
  const [mRound, setMRound]       = useState(1);
  const [mP1, setMP1]             = useState("");
  const [mP2, setMP2]             = useState("");
  const [mFfaIds, setMFfaIds]     = useState<string[]>([]);

  // ── Score / result state ──────────────────────────────────────────────
  const [scores1v1, setScores1v1] = useState<Record<string, { s1: string; s2: string }>>({});
  const [ffaEdits, setFfaEdits]   = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  // Bereits gespielte 1v1-Matches im Bearbeiten-Modus (Ergebnis korrigieren statt zurücksetzen)
  const [editing, setEditing]     = useState<Set<string>>(new Set());
  // Geöffnete Änderungsprotokolle je Match
  const [logs, setLogs]           = useState<Record<string, MatchLogEntry[] | "loading">>({});
  // Terminplanung
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleInterval, setScheduleInterval] = useState(30);
  const [scheduleOverwrite, setScheduleOverwrite] = useState(false);
  // Team-Zuordnung pro Spieler (nur coop_stats): Match Win wird pro Team, nicht pro Match vergeben
  const [teamAssign, setTeamAssign] = useState<Record<string, Record<string, "A" | "B" | undefined>>>(() => {
    const init: Record<string, Record<string, "A" | "B" | undefined>> = {};
    for (const m of initial?.matches ?? []) {
      const row: Record<string, "A" | "B" | undefined> = {};
      for (const e of m.entries) {
        if (!e.userId || !e.statsJson) continue;
        try {
          const s = JSON.parse(e.statsJson) as Record<string, unknown>;
          if (s["_team"] === "A" || s["_team"] === "B") row[e.userId] = s["_team"] as "A" | "B";
        } catch { /* ignore */ }
      }
      if (Object.keys(row).length) init[m.id] = row;
    }
    return init;
  });
  // Match Win: welches Team hat gewonnen (nur wenn Spieler Teams zugeordnet sind)
  // Nachzügler-Hinweis: gewählte Runde je Spieler (Standard: neueste Runde)
  const [latecomerRound, setLatecomerRound] = useState<Record<string, string>>({});
  const [matchWin, setMatchWin]   = useState<Record<string, "A" | "B" | null>>(() => {
    const init: Record<string, "A" | "B" | null> = {};
    for (const m of initial?.matches ?? []) {
      for (const e of m.entries) {
        if (!e.statsJson) continue;
        try {
          const s = JSON.parse(e.statsJson) as Record<string, unknown>;
          if ((s["_team"] === "A" || s["_team"] === "B") && Number(s["Match Win"]) > 0) {
            init[m.id] = s["_team"] as "A" | "B";
            break;
          }
        } catch { /* ignore */ }
      }
    }
    return init;
  });
  // Match Win ohne Team-Zuordnung: alle Spieler haben zusammen gespielt, alle erhalten +1
  const [matchWinAll, setMatchWinAll] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const m of initial?.matches ?? []) {
      const usesTeams = m.entries.some(e => {
        if (!e.statsJson) return false;
        try {
          const s = JSON.parse(e.statsJson) as Record<string, unknown>;
          return s["_team"] === "A" || s["_team"] === "B";
        } catch { return false; }
      });
      if (usesTeams) continue;
      const entryWithStats = m.entries.find(e => e.statsJson);
      if (entryWithStats?.statsJson) {
        try {
          const s = JSON.parse(entryWithStats.statsJson) as Record<string, number>;
          if ("Match Win" in s) init[m.id] = s["Match Win"] > 0;
        } catch { /* ignore */ }
      }
    }
    return init;
  });

  if (!tournament) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm space-y-2">
        <Trophy className="w-8 h-8 mx-auto text-gray-700" />
        <p>Noch kein Turnier erstellt.</p>
        <p className="text-xs text-gray-600">Format, Punkte und Stat-Felder im Reiter <span className="text-amber-400">Einstellungen</span> konfigurieren.</p>
      </div>
    );
  }

  // ── Derived ──────────────────────────────────────────────────────────
  const isFfa  = tournament.format === "ffa" || tournament.format === "coop_stats" || tournament.format === "avg_stats";
  const isCoop = tournament.format === "coop_stats";
  // Match Win/Team-Zuordnung in einer Reihe nur anzeigen und erfassen, wenn die Reihe tatsächlich einen
  // Stat darauf aufbaut (⚔️ in der Reihentabellen-Konfiguration) — sonst unnötig. Ohne Reihe immer
  // erfassbar; die Turnierseite zeigt es erst, sobald eine Runde gewonnen wurde.
  const trackMatchWin = supportsMatchWin(tournament.format) && (matchWinStatKeys.length > 0 || standaloneEvent);
  // Platzierungs-Spalte pro Runde nur anzeigen, wenn für dieses Event Punkte je Platz konfiguriert
  // sind (Reiter "Turnier" → Format Kooperativ (Stats), siehe EventEditClient) — sonst unnötig.
  const trackPlacement = isCoop && !!placementPoints && Object.keys(placementPoints).length > 0;
  const isLiga = tournament.format === "liga";
  const is1v1  = !isFfa;
  const isRoundRobin = tournament.format === "round_robin";
  const isGroupKnockout = tournament.format === GROUP_KNOCKOUT_FORMAT;
  const isBracketFormat = tournament.format === "single_elimination";
  // Wer ausgelost werden kann: angemeldete Spieler (allUsers) + direkt eingetragene Teilnehmer.
  // Bei aktivem Check-in filtert der Server zusätzlich auf Eingecheckte.
  const poolSize = new Set([...tournament.participants.map(p => p.userId), ...allUsers.map(u => u.id)]).size;
  // So viele kommen tatsächlich in die Auslosung (bei Check-in nur Bereite)
  const drawCount = notReadyNames ? Math.max(0, poolSize - notReadyNames.length) : poolSize;
  const canGenerate = poolSize >= 2 && tournament.matches.length === 0 && (isRoundRobin || isLiga || isBracketFormat);
  // Ausgelost, aber noch kein Ergebnis: Auslosung lässt sich zurücksetzen
  const isDrawn = is1v1 && tournament.matches.length > 0;
  const canResetDraw = isDrawn && !isGroupKnockout && !tournament.matches.some(m => m.playedAt);
  // Gruppenphase + K.O.: Gruppenspiele (nach Gruppe, Spieltag) vor der K.O.-Runde
  const groupMatches    = isGroupKnockout
    ? tournament.matches.filter(m => m.groupIndex != null)
        .sort((a, b) => a.groupIndex! - b.groupIndex! || a.round - b.round || a.position - b.position)
    : [];
  const knockoutMatches = isGroupKnockout
    ? tournament.matches.filter(m => m.groupIndex == null)
        .sort((a, b) => a.round - b.round || Number(!!a.isThirdPlace) - Number(!!b.isThirdPlace) || a.position - b.position || (a.leg ?? 0) - (b.leg ?? 0))
    : [];
  const knockoutRounds  = knockoutMatches.length ? Math.max(...knockoutMatches.map(m => m.round)) : 0;
  // Stat-Formate: Runden nach Rundennummer (nachgetragene Runden landen an ihrer Stelle)
  const statRounds      = isFfa ? sortStatRounds(tournament.matches) : [];
  const usedRoundNumbers = new Set(statRounds.map(m => m.position));
  // Nachzügler: angemeldete Spieler (allUsers), die in keiner Runde stehen — siehe Hinweis oben im Render
  const inAnyRound = new Set(statRounds.flatMap(m => m.entries.map(e => e.userId).filter((id): id is string => !!id)));
  const latecomers = isFfa ? allUsers.filter(u => !inAnyRound.has(u.id)) : [];
  const groupIndexes    = [...new Set(groupMatches.map(m => m.groupIndex!))];
  /** Label für Match-Listen: Gruppe + Spieltag bzw. K.O.-Runde (nur group_knockout). */
  const groupKnockoutLabel = (m: Match) => m.groupIndex != null
    ? `${groupLabel(m.groupIndex)} · Spieltag ${m.round}`
    : (m.isThirdPlace ? "Spiel um Platz 3" : knockoutRoundLabel(m.round, knockoutRounds))
      + (m.leg === 1 ? " · Hinspiel" : m.leg === 2 ? " · Rückspiel" : "");
  const statFields: string[] = tournament.statFields ? JSON.parse(tournament.statFields) : [];
  // Filter out winner stat keys — they're auto-set by event completion, not entered per round
  const visibleStatFields = statFields.filter(f => !winnerStatKeys.includes(f));
  // pointsConfig trägt nur noch Sieg/Unentschieden-Münzen pro Match ({"win": 30, "draw": 10}).
  // Ältere Events haben dort evtl. noch Platzierungswerte ("1", "2", …) — die werden ignoriert,
  // Platzierungen kommen ausschließlich aus placementRewardsJson (siehe lib/placement-rewards.ts).
  const pointsConfigRaw: Record<string, number | { coins: number; points: number }> =
    tournament.pointsConfig ? JSON.parse(tournament.pointsConfig) : {};
  const getCoinsVal = (key: string): number => {
    const v = pointsConfigRaw[key];
    if (v == null) return 0;
    return typeof v === "number" ? v : (v.coins ?? 0);
  };
  // Draw-Eingabe hängt am tatsächlich konfigurierten Punktemodus (win/draw-Keys), nicht mehr
  // am Format-String — round_robin kann jetzt ebenfalls mit Sieg/Unentschieden-Münzen laufen.
  const supportsDraw = "win" in pointsConfigRaw || "draw" in pointsConfigRaw;
  const rounds = tournament.matches.length ? Math.max(...tournament.matches.map(m => m.round)) : 0;
  // Label (inkl. gespeichertem Altwert "liga") aus der zentralen Format-Liste
  const formatLabel = centralFormatLabel(tournament.format);

  // ── Handlers ─────────────────────────────────────────────────────────

  async function reload() {
    const res = await fetch(`/api/events/${event.id}`).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      if (data.tournament) setTournament(data.tournament);
    }
    router.refresh();
  }

  /** Hinweis für die Auslosung: wer bei aktivem Check-in noch nicht bereit ist, fällt raus */
  function notReadyWarning(): string {
    if (!notReadyNames?.length) return "";
    const shown = notReadyNames.slice(0, 8).join(", ") + (notReadyNames.length > 8 ? ` und ${notReadyNames.length - 8} weitere` : "");
    return `

⚠️ ${notReadyNames.length} Spieler noch nicht bereit und werden nicht ausgelost: ${shown}. Einchecken geht oben im Check-in-Kasten oder im Reiter „Teilnehmer“.`;
  }

  /** Hinweis, wenn vor dem Start ausgelost wird: der Check-in endet damit sofort */
  function earlyWarning(): string {
    if (!event.startAt) return "";
    const mins = Math.round((new Date(event.startAt).getTime() - Date.now()) / 60_000);
    if (mins <= 0) return "";
    const when = mins < 120 ? `${mins} Minuten` : mins < 48 * 60 ? `${Math.round(mins / 60)} Stunden` : `${Math.round(mins / 1440)} Tagen`;
    return `\n\n⏰ Der Start ist erst in ${when}.${notReadyNames ? " Mit der Auslosung endet der Check-in sofort." : ""} Danach kann sich niemand mehr als Spieler anmelden.`;
  }

  /** Auslosung zurücksetzen (K.O.-Baum, Liga, Jeder gegen jeden) — nur vor dem ersten Ergebnis */
  async function resetDrawAction() {
    if (!tournament || !(await confirm({
      title: "Auslosung zurücksetzen?",
      description: "Alle Spiele werden gelöscht. Ist der Start noch nicht erreicht, sind Anmeldung und Check-in wieder offen. Danach kannst du neu auslosen.",
      confirmLabel: "Zurücksetzen",
      variant: "danger",
    }))) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generateMatches: "reset_draw" }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Zurücksetzen hat nicht geklappt"); return; }
    toast.success("Auslosung zurückgesetzt", { description: "Du kannst jetzt neu auslosen." });
    router.refresh();
  }

  /** Nach der Auslosung: ausgefallenen Spieler in allen offenen Spielen ersetzen */
  async function replacePlayerAction() {
    if (!tournament || !replaceFrom || !replaceTo) return;
    const fromName = nameOfUser(replaceFrom), toName = nameOfUser(replaceTo);
    if (!(await confirm({
      title: "Spieler ersetzen?",
      description: `${toName} übernimmt alle offenen Spiele von ${fromName}. Bereits gespielte Spiele bleiben bei ${fromName}. Beide bekommen eine Meldung.`,
      confirmLabel: "Ersetzen",
    }))) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}/participants`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUserId: replaceFrom, toUserId: replaceTo }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Ersetzen hat nicht geklappt"); return; }
    toast.success(`${toName} spielt für ${fromName}`, { description: `${data.replaced} offene${data.replaced === 1 ? "s Spiel" : " Spiele"} übernommen.` });
    setReplaceFrom(""); setReplaceTo(""); setShowReplace(false);
    router.refresh();
  }

  /** Gegner nicht angetreten: winnerId kommt kampflos weiter */
  async function walkoverAction(match: Match, winnerId: string) {
    if (!tournament) return;
    const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
    if (!(await confirm({
      title: "Kampflos weiter?",
      description: `${nameOfUser(loserId ?? "")} ist nicht angetreten. ${nameOfUser(winnerId)} gewinnt das Match kampflos (ohne Tore)${isBracketFormat || (isGroupKnockout && match.groupIndex == null) ? " und rückt auf" : ""}.`,
      confirmLabel: "Kampflos werten",
    }))) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}/matches`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id, action: "walkover", winnerId }),
    });
    setLoading(false);
    if (!res.ok) { const e = await res.json().catch(() => ({})); toast.error(e.error ?? "Das hat nicht geklappt"); return; }
    toast.success(`${nameOfUser(winnerId)} kommt kampflos weiter`);
    router.refresh();
  }

  /** Spielplan aus den angemeldeten Spielern erzeugen (bei aktivem Check-in nur Eingecheckte):
   *  K.O.-Baum (Einzel-Eliminierung) bzw. Paarungen/Spieltage (Liga). */
  async function generateRoundRobinMatches() {
    if (!tournament) return;
    const how = isBracketFormat
      ? (seeding === "rank" ? "Gesetzt nach Rangpunkten: die Stärksten treffen erst spät aufeinander und bekommen die Freilose." : "Zufällig ausgelost.")
      : isLiga ? "Zufällig ausgelost, mit Hin- und Rückrunde." : "Zufällig ausgelost.";
    const desc = `${drawPreview(tournament.format, drawCount)}. ${how}`
      + earlyWarning() + notReadyWarning()
      + "\n\nAlle Ausgelosten bekommen eine Meldung mit ihrem ersten Gegner. Zurücksetzen geht bis zum ersten Ergebnis.";
    if (!(await confirm({ title: isBracketFormat ? "K.O.-Baum auslosen" : isLiga ? "Spieltage auslosen" : "Paarungen auslosen", description: desc, confirmLabel: "Auslosen" }))) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generateMatches: isBracketFormat ? "single_elimination" : isLiga ? "liga" : "round_robin", seeding }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      toast.success(`${isBracketFormat ? "K.O.-Baum" : "Spielplan"} ausgelost: ${data.players} Spieler`, { description: "Alle haben eine Meldung mit ihrem ersten Gegner bekommen." });
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error ?? "Auslosen hat nicht geklappt");
    }
    router.refresh();
  }

  /** Gruppenphase + K.O.: auslosen, K.O.-Runde erstellen bzw. jeweils zurücksetzen. */
  async function groupStageAction(body: GroupStageActionBody) {
    if (!tournament) return;
    const prompts: Record<GroupStageActionBody["generateMatches"], { title: string; description: string; variant?: "danger" }> = {
      groups:         { title: "Gruppen auslosen", description: "Teilnehmer zufällig auf die Gruppen verteilen und alle Gruppenspiele anlegen?" },
      reset_groups:   { title: "Neu auslosen", description: "Gruppen und alle Gruppenspiele löschen, um neu auszulosen?", variant: "danger" },
      knockout:       { title: "K.O.-Runde erstellen", description: "Die K.O.-Runde aus den aktuellen Gruppentabellen erstellen? Danach zählen Korrekturen in der Gruppenphase nicht mehr automatisch." },
      reset_knockout: { title: "K.O.-Runde verwerfen", description: "Alle Matches der K.O.-Runde löschen? Die Gruppenphase bleibt erhalten.", variant: "danger" },
      rebuild_knockout: { title: "K.O.-Runde neu erstellen", description: "Die bestehende K.O.-Runde löschen und aus den aktuellen Gruppentabellen neu setzen? Termine und Live-Markierungen der K.O.-Matches gehen dabei verloren.", variant: "danger" },
    };
    const prompt = prompts[body.generateMatches];
    if (body.generateMatches === "groups") {
      prompt.description = `${drawPreview(GROUP_KNOCKOUT_FORMAT, drawCount, { groupCount: body.groupCount, groupLegs: body.groupLegs })}. `
        + (seeding === "rank" ? "Lostöpfe nach Rangpunkten: die Stärksten landen in verschiedenen Gruppen." : "Zufällig verteilt.")
        + earlyWarning() + notReadyWarning() + "\n\nAlle Ausgelosten bekommen eine Meldung mit Gruppe und erstem Gegner.";
    }
    if (body.generateMatches === "reset_groups") prompt.description += " Ist der Start noch nicht erreicht, sind Anmeldung und Check-in wieder offen.";
    if (!(await confirm(prompt))) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.generateMatches === "groups" ? { ...body, seeding } : body),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Fehler"); return; }
    if (body.generateMatches === "groups") toast.success(`Gruppen ausgelost: ${data.generated} Gruppenspiele`, { description: "Alle haben eine Meldung mit Gruppe und erstem Gegner bekommen." });
    else if (data.generated) toast.success(`${data.generated} Matches erstellt`);
    else if (data.deleted !== undefined) toast.success(`${data.deleted} Matches gelöscht`);
    router.refresh();
  }

  async function addParticipant() {
    if (!tournament || !addParticipantId) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: addParticipantId }),
    });
    setLoading(false);
    if (res.ok) {
      const p = await res.json();
      setTournament(prev => prev ? { ...prev, participants: [...prev.participants, p] } : prev);
      setAddParticipantId("");
    } else {
      const e = await res.json();
      toast.error(e.error ?? "Fehler beim Hinzufügen");
    }
  }

  async function removeParticipant(userId: string) {
    if (!tournament || !(await confirm({ title: "Teilnehmer entfernen", description: "Teilnehmer aus dem Turnier entfernen?", variant: "danger" }))) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}/participants`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setLoading(false);
    if (!res.ok) { const e = await res.json().catch(() => ({})); toast.error(e.error ?? "Fehler beim Entfernen"); return; }
    setTournament(prev => prev ? { ...prev, participants: prev.participants.filter(p => p.userId !== userId) } : prev);
  }

  async function addMatch() {
    if (!tournament) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isFfa ? {
        // Stat-Formate: Rundennummer statt Datum, Titel = kurzer Zusatz hinter der Nummer
        title: mTitle || null, position: mRound,
        entries: mFfaIds.map(uid => ({ userId: uid })),
      } : {
        title: mTitle || null, scheduledAt: mScheduled ? fromDatetimeLocalBerlin(mScheduled).toISOString() : null,
        notes: mNotes || null, round: mRound,
        player1Id: is1v1 ? mP1 || null : null,
        player2Id: is1v1 ? mP2 || null : null,
        entries: isFfa ? mFfaIds.map(uid => ({ userId: uid })) : [],
      }),
    });
    setLoading(false);
    if (res.ok) {
      const m = await res.json();
      setTournament(prev => prev ? { ...prev, matches: [...prev.matches, m] } : prev);
      setShowAdd(false);
      setMTitle(""); setMScheduled(""); setMNotes(""); setMP1(""); setMP2(""); setMFfaIds([]);
      router.refresh();
    }
  }

  /** Stat-Formate: Formular "Runde hinzufügen" mit der nächsten freien Nummer und allen Teilnehmern öffnen. */
  function openAddStatRound() {
    if (!tournament) return;
    setMRound(nextStatRoundNumber(tournament.matches));
    setMTitle("");
    // Standardmäßig alle Teilnehmer der Runde auswählen — abwählen ist die Ausnahme (wer diese Runde
    // aussetzt), nicht der Regelfall.
    setMFfaIds(tournament.participants.map(p => p.userId));
    setShowAdd(true);
  }

  /** Stat-Formate: Rundennummer/Zusatz einer bestehenden Runde ändern (z.B. vergessene Runde einsortieren). */
  async function updateRoundMeta(matchId: string, position: number, title: string): Promise<boolean> {
    if (!tournament) return false;
    const res = await fetch(`/api/tournaments/${tournament.id}/matches`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "meta", matchId, position, title }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error ?? "Fehler beim Speichern");
      return false;
    }
    const u = await res.json() as { position: number; title: string | null };
    setTournament(prev => prev ? { ...prev, matches: prev.matches.map(m => m.id === matchId ? { ...m, position: u.position, title: u.title } : m) } : prev);
    toast.success("Runde aktualisiert");
    router.refresh();
    return true;
  }

  /** Gruppenspiel ändern, obwohl die K.O.-Runde schon steht? Die Setzung ändert sich dadurch nicht mit. */
  async function confirmGroupChangeAfterKnockout(matchId: string): Promise<boolean> {
    if (!tournament) return false;
    const match = tournament.matches.find(m => m.id === matchId);
    const knockoutExists = tournament.matches.some(m => m.groupIndex == null);
    if (!match || match.groupIndex == null || !knockoutExists) return true;
    return confirm({
      title: "K.O.-Runde besteht bereits",
      description: "Dieses Gruppenspiel zu ändern kann die Tabelle verändern — die bereits erstellte K.O.-Runde wird dabei NICHT automatisch neu gesetzt. Danach erscheint in der Gruppenübersicht ein Hinweis, falls die Setzung nicht mehr passt.",
    });
  }

  /** Warnt einmalig (pro geöffneter Seite), wenn vor dem Event-Start Ergebnisse eingetragen werden. */
  async function guardResultsTiming(): Promise<boolean> {
    if (resultsTimingOk.current || !event.startAt) return true;
    const ok = await confirmEventTiming(confirm, "results", { startAt: event.startAt, endAt: event.endAt });
    if (ok) resultsTimingOk.current = true;
    return ok;
  }

  async function submit1v1(matchId: string, winnerId: string | null, isDraw = false): Promise<boolean> {
    if (!tournament) return false;
    if (!(await guardResultsTiming())) return false;
    if (!(await confirmGroupChangeAfterKnockout(matchId))) return false;
    const s = scores1v1[matchId];
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}/matches`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId, winnerId, isDraw,
        score1: s?.s1 ? Number(s.s1) : null,
        score2: s?.s2 ? Number(s.s2) : null,
      }),
    });
    setLoading(false);
    if (!res.ok) { const e = await res.json().catch(() => ({})); toast.error(e.error ?? "Fehler beim Speichern"); return false; }
    toast.success(savedResultMessage(matchId, winnerId, isDraw, s));
    setEditing(prev => { const n = new Set(prev); n.delete(matchId); return n; });
    setLogs(prev => { const n = { ...prev }; delete n[matchId]; return n; });
    router.refresh();
    return true;
  }

  /** Erfolgsmeldung nach dem Speichern, z.B. "Gespeichert: Max 2:1 Tom · Max rückt ins Halbfinale". */
  function savedResultMessage(matchId: string, winnerId: string | null, isDraw: boolean, s?: { s1?: string; s2?: string }): string {
    const m = tournament?.matches.find(x => x.id === matchId);
    if (!m) return "Gespeichert";
    const n1 = nameOfUser(m.player1Id ?? ""), n2 = nameOfUser(m.player2Id ?? "");
    const score = s?.s1 && s?.s2 ? ` ${s.s1}:${s.s2} ` : " – ";
    let text = `Gespeichert: ${n1}${score}${n2}`;
    if (isDraw) return text + " · Unentschieden";
    const ko = isBracketFormat || (isGroupKnockout && m.groupIndex == null);
    if (ko && winnerId && m.leg !== 1 && !m.isThirdPlace) {
      const koRounds = Math.max(0, ...tournament!.matches.filter(x => x.groupIndex == null && !x.isThirdPlace).map(x => x.round));
      text += m.round < koRounds
        ? ` · ${nameOfUser(winnerId)} rückt auf (${knockoutRoundLabel(m.round + 1, koRounds)})`
        : ` · ${nameOfUser(winnerId)} gewinnt das Turnier`;
    } else if (winnerId && !ko) {
      text += ` · ${nameOfUser(winnerId)} gewinnt`;
    }
    return text;
  }

  /** Vorläufiges Ergebnis (Spieler-Meldung) direkt bestätigen — ohne Umweg über die Prüfseite */
  async function confirmProvisional(matchId: string) {
    if (!tournament) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}/matches`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, action: "confirm" }),
    });
    setLoading(false);
    if (!res.ok) { const e = await res.json().catch(() => ({})); toast.error(e.error ?? "Bestätigen hat nicht geklappt"); return; }
    toast.success("Ergebnis bestätigt", { description: "Es zählt jetzt endgültig, Punkte sind gebucht." });
    router.refresh();
  }

  /** Beide Tore eingetragen? Dann gibt es "Speichern" statt der Sieger-Knöpfe. */
  function hasBothScores(matchId: string) {
    const s = scores1v1[matchId];
    return !!s && s.s1 != null && s.s1 !== "" && s.s2 != null && s.s2 !== "";
  }

  /** Bearbeiten: Ergebnis-Eingabe mit den aktuellen Werten öffnen (statt erst zurückzusetzen). */
  function startEdit(match: Match) {
    setScores1v1(prev => ({
      ...prev,
      [match.id]: { s1: match.score1 != null ? String(match.score1) : "", s2: match.score2 != null ? String(match.score2) : "" },
    }));
    setEditing(prev => new Set(prev).add(match.id));
  }
  function cancelEdit(matchId: string) {
    setEditing(prev => { const n = new Set(prev); n.delete(matchId); return n; });
  }

  /** "Läuft gerade" setzen bzw. beenden */
  async function setLive(matchId: string, start: boolean) {
    if (!tournament) return;
    const res = await fetch(`/api/tournaments/${tournament.id}/matches`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, action: start ? "start" : "stop" }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); toast.error(e.error ?? "Fehler"); return; }
    const updated = await res.json();
    setTournament(prev => prev ? { ...prev, matches: prev.matches.map(m => m.id === matchId ? { ...m, startedAt: updated.startedAt } : m) } : prev);
    router.refresh();
  }

  /** Änderungsprotokoll eines Matches ein-/ausblenden */
  async function toggleLog(matchId: string) {
    if (!tournament) return;
    if (logs[matchId]) { setLogs(prev => { const n = { ...prev }; delete n[matchId]; return n; }); return; }
    setLogs(prev => ({ ...prev, [matchId]: "loading" }));
    const res = await fetch(`/api/tournaments/${tournament.id}/matches?matchId=${encodeURIComponent(matchId)}`);
    const data = res.ok ? await res.json() : [];
    setLogs(prev => ({ ...prev, [matchId]: data }));
  }

  /** Alle Matches terminieren: Startzeit + Abstand je Spieltag/Runde */
  async function scheduleMatches() {
    if (!tournament || !scheduleStart) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generateMatches: "schedule",
        startAt: fromDatetimeLocalBerlin(scheduleStart).toISOString(),
        intervalMinutes: scheduleInterval,
        overwrite: scheduleOverwrite,
      }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Fehler bei der Terminplanung"); return; }
    toast.success(`${data.scheduled} Matches terminiert`);
    setShowSchedule(false);
    router.refresh();
  }

  async function resetMatch(matchId: string) {
    if (!tournament || !(await confirm({ title: "Ergebnis zurücksetzen", description: "Ergebnis dieses Matches zurücksetzen?", variant: "danger" }))) return;
    if (!(await confirmGroupChangeAfterKnockout(matchId))) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}/matches`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, action: "reset" }),
    });
    setLoading(false);
    if (!res.ok) { const e = await res.json().catch(() => ({})); toast.error(e.error ?? "Fehler beim Zurücksetzen"); return; }
    router.refresh();
  }

  /** Prüft, ob die Team-Zuordnung eines Matches vollständig/konsistent ist — wird sowohl live
   *  (Inline-Warnung während der Eingabe) als auch vor dem Speichern verwendet, damit der Fehler
   *  nicht erst als Toast nach einem Klick auf "Speichern" auftaucht. */
  function validateTeamAssignment(matchId: string, matchEntries: MatchEntry[]): string | null {
    if (!trackMatchWin) return null;
    const teams = teamAssign[matchId] ?? {};
    const usesTeams = matchEntries.some(e => e.userId && teams[e.userId]);
    if (!usesTeams) return null;
    const missing = matchEntries.some(e => e.userId && !teams[e.userId]);
    if (missing) {
      return "Bitte alle Spieler einem Team zuweisen, bevor du speicherst — oder keinem Spieler ein Team zuweisen, wenn alle zusammen gespielt haben.";
    }
    return null;
  }

  /** Baut das PATCH-Payload für ein Match aus dem aktuellen Formularzustand — genutzt sowohl vom
   *  Einzel-Speichern-Button als auch vom "Alle offenen speichern"-Sammel-Save (Punkt 1). */
  function buildFfaEntries(matchId: string, matchEntries: MatchEntry[]) {
    const ed = ffaEdits[matchId] ?? {};
    const teams = teamAssign[matchId] ?? {};
    const usesTeams = trackMatchWin && matchEntries.some(e => e.userId && teams[e.userId]);
    const winningTeam = usesTeams ? (matchWin[matchId] ?? null) : undefined;
    const allWin = trackMatchWin && !usesTeams ? (matchWinAll[matchId] ?? false) : undefined;
    return matchEntries.map(e => {
      // Start with existing persisted stats so we don't overwrite fields that weren't touched
      const existing: Record<string, number | string> = e.statsJson ? JSON.parse(e.statsJson as string) : {};
      const row = ed[e.userId ?? ""] ?? {};
      const stats: Record<string, number | string> = { ...existing };
      visibleStatFields.forEach(f => { if (row[f] !== undefined && row[f] !== "") stats[f] = Number(row[f]); });
      if (trackPlacement && row[PLACEMENT_STAT_KEY] !== undefined) {
        if (row[PLACEMENT_STAT_KEY] === "") delete stats[PLACEMENT_STAT_KEY];
        else stats[PLACEMENT_STAT_KEY] = Number(row[PLACEMENT_STAT_KEY]);
      }
      if (trackMatchWin) {
        if (usesTeams) {
          // Spieler wird Team A oder B zugeordnet, Match Win geht nur an das gewinnende Team
          const team = e.userId ? teams[e.userId] : undefined;
          if (team) stats["_team"] = team; else delete stats["_team"];
          stats["Match Win"] = team && winningTeam && team === winningTeam ? 1 : 0;
        } else {
          // Alle zusammen gespielt: kein Team, alle erhalten gleichermaßen +1 oder 0
          delete stats["_team"];
          stats["Match Win"] = allWin ? 1 : 0;
        }
      }
      return {
        id: e.id,
        statsJson: Object.keys(stats).length ? stats : null,
      };
    });
  }

  async function submitFfa(matchId: string, matchEntries: MatchEntry[], { silent = false } = {}) {
    if (!tournament) return true;
    const error = validateTeamAssignment(matchId, matchEntries);
    if (error) {
      if (!silent) toast.error(error);
      return false;
    }
    if (!(await guardResultsTiming())) return false;
    const updated = buildFfaEntries(matchId, matchEntries);
    if (!silent) setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}/matches`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, entries: updated }),
    });
    if (!silent) setLoading(false);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      if (!silent) toast.error(e.error ?? "Fehler beim Speichern");
      return false;
    }
    if (!silent) router.refresh();
    return true;
  }

  /** Punkt 1: statt jedes aufgeklappte Match einzeln zu speichern, alle offenen Matches mit
   *  Änderungen in einem Rutsch sichern. Matches mit ungültiger Team-Zuordnung werden übersprungen
   *  und am Ende zusammengefasst gemeldet, statt den ganzen Vorgang abzubrechen. */
  async function saveAllExpanded() {
    if (!tournament) return;
    if (!(await guardResultsTiming())) return;
    const candidates = tournament.matches.filter(m => expanded.has(m.id));
    if (candidates.length === 0) return;
    setLoading(true);
    let saved = 0;
    const failedTitles: string[] = [];
    for (const m of candidates) {
      const ok = await submitFfa(m.id, m.entries, { silent: true });
      if (ok) saved++; else failedTitles.push(statRoundLabel(m));
    }
    setLoading(false);
    if (saved > 0) toast.success(`${saved} Match(es) gespeichert`);
    if (failedTitles.length > 0) toast.error(`Nicht gespeichert (Team-Zuordnung unvollständig): ${failedTitles.join(", ")}`);
    router.refresh();
  }

  /** Punkt 2: übernimmt Stats/Team-Zuordnung des vorherigen Matches für alle Spieler, die in
   *  beiden Matches vorkommen — praktisch bei wiederkehrenden Konstellationen (z.B. gleiche Gruppe
   *  über mehrere Runden), damit nicht jede Runde komplett neu eingetippt werden muss. */
  function copyFromPreviousMatch(matchId: string) {
    if (!tournament) return;
    // Vorherige Runde = nach Rundennummer, nicht nach Anlege-Reihenfolge
    const ordered = sortStatRounds(tournament.matches);
    const idx = ordered.findIndex(m => m.id === matchId);
    if (idx <= 0) return;
    const prev = ordered[idx - 1];
    const prevEdits = ffaEdits[prev.id] ?? {};
    const prevTeams = teamAssign[prev.id] ?? {};
    const currentEntryUserIds = ordered[idx].entries.map(e => e.userId).filter((id): id is string => !!id);
    // Vorab (rein lesend) ermitteln, ob es überhaupt etwas zu übernehmen gibt — die State-Updater
    // unten bleiben dadurch reine Funktionen ohne Seiteneffekt auf äußere Variablen.
    const copiedAny = currentEntryUserIds.some(uid => prevEdits[uid] || (trackMatchWin && prevTeams[uid]));
    setFfaEdits(state => {
      const next = { ...(state[matchId] ?? {}) };
      for (const uid of currentEntryUserIds) {
        const prevRow = prevEdits[uid];
        if (prevRow) next[uid] = { ...prevRow };
      }
      return { ...state, [matchId]: next };
    });
    if (trackMatchWin) {
      setTeamAssign(state => {
        const next = { ...(state[matchId] ?? {}) };
        for (const uid of currentEntryUserIds) {
          const t = prevTeams[uid];
          if (t) next[uid] = t;
        }
        return { ...state, [matchId]: next };
      });
    }
    if (copiedAny) toast.success("Werte aus vorherigem Match übernommen — bitte prüfen und speichern");
    else toast.error("Keine gemeinsamen Spieler mit dem vorherigen Match gefunden");
  }

  async function deleteMatch(matchId: string) {
    if (!tournament) return;
    const match = tournament.matches.find(m => m.id === matchId);
    const inBracket = !!match && (tournament.format === "single_elimination" || (isGroupKnockout && match.groupIndex == null));
    const ok = await confirm(inBracket
      ? {
          title: "⚠️ Match aus dem K.O.-Baum löschen?",
          description: "Achtung: Das zerstört die Struktur des Turnierbaums. Sieger dieses Matches können danach nicht mehr aufrücken, und Paarungen der nächsten Runde bleiben unvollständig. Das lässt sich nicht rückgängig machen. Um ein falsches Ergebnis zu korrigieren, nutze stattdessen „Bearbeiten“ oder „Zurücksetzen“. Wirklich löschen?",
          variant: "danger",
        }
      : { title: "Match löschen", description: "Match löschen?", variant: "danger" });
    if (!ok) return;
    setLoading(true);
    await fetch(`/api/tournaments/${tournament.id}/matches`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    setLoading(false);
    setTournament(prev =>
      prev ? { ...prev, matches: prev.matches.filter(m => m.id !== matchId) } : prev
    );
    router.refresh();
  }

  /** Spieler aus der Teilnehmerliste zu einem Match hinzufügen oder entfernen (auch bei laufenden Matches). */
  async function changeMatchPlayer(matchId: string, userId: string, action: "add" | "remove") {
    if (!tournament) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}/matches`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, userId, action }),
    });
    setLoading(false);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error ?? "Fehler beim Ändern der Spieler");
      return;
    }
    const data: { entry: MatchEntry; participant: Participant | null } | null = action === "add" ? await res.json() : null;
    const added = data?.entry ?? null;
    setTournament(prev => prev ? {
      ...prev,
      participants: data?.participant ? [...prev.participants, data.participant] : prev.participants,
      matches: prev.matches.map(m => m.id !== matchId ? m : {
        ...m,
        entries: added ? [...m.entries, added] : m.entries.filter(e => e.userId !== userId),
      }),
    } : prev);
    router.refresh();
  }

  function setFfaField(matchId: string, userId: string, field: string, val: string) {
    setFfaEdits(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [userId]: { ...prev[matchId]?.[userId], [field]: val } },
    }));
  }

  const notInTournament = allUsers.filter(
    u => !tournament.participants.some(p => p.userId === u.id)
  );

  /** 1v1-Match-Karte (Ergebnis-Eingabe). allowDraw: "Unentschieden"-Button anzeigen. */
  function renderDuelCard(match: Match, allowDraw: boolean) {
    const p1 = allUsers.find(u => u.id === match.player1Id);
    const p2 = allUsers.find(u => u.id === match.player2Id);
    const isPlayed  = !!match.winnerId || !!match.playedAt;
    const isDraw    = !!match.playedAt && !match.winnerId;
    const isEditing = editing.has(match.id);
    // Eingabe offen: noch kein Ergebnis — oder Bearbeiten-Modus eines gespielten Matches
    const isPending = !!p1 && !!p2 && (!isPlayed || isEditing);
    const isLive = !!match.startedAt && !match.playedAt;
    const matchLog = logs[match.id];
    // Freilos: nur ein Spieler, Sieger stand beim Erzeugen fest — nicht zurücksetzbar
    const isByeMatch = !!match.winnerId && (!match.player1Id || !match.player2Id);
    // Rückspiel einer K.O.-Paarung: Gesamtergebnis aus Hinspiel + (eingegebenem) Rückspiel
    const firstLeg = match.leg === 2
      ? tournament!.matches.find(m => m.groupIndex == null && m.leg === 1 && m.round === match.round
          && m.position === match.position && !!m.isThirdPlace === !!match.isThirdPlace)
      : undefined;
    const aggregate = (() => {
      if (!firstLeg?.playedAt) return null;
      const entered = scores1v1[match.id];
      const own1 = isPending ? Number(entered?.s1 || 0) : match.score1 ?? 0;
      const own2 = isPending ? Number(entered?.s2 || 0) : match.score2 ?? 0;
      const fromFirst = (uid: string | null) => (uid === firstLeg.player1Id ? firstLeg.score1 ?? 0 : firstLeg.score2 ?? 0);
      return { g1: fromFirst(match.player1Id) + own1, g2: fromFirst(match.player2Id) + own2, first: firstLeg };
    })();
    return (
      <div key={match.id}
        className={`rounded-lg border overflow-hidden ${
          isLive ? "border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
          : isPlayed && !isEditing ? "border-gray-700 opacity-80" : "border-gray-600"
        }`}>
        {/* Match header */}
        <div className="px-3 py-1.5 bg-gray-800 border-b border-gray-700 flex items-center justify-between gap-2">
          <span className="text-xs text-gray-400 truncate">
            {match.title || (match.isThirdPlace ? "Spiel um Platz 3" : match.groupIndex != null ? `Spieltag ${match.round}` : `Match ${match.position}`)}
            {match.leg === 1 && " · Hinspiel"}{match.leg === 2 && " · Rückspiel"}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {match.scheduledAt && (
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />{fmtDate(match.scheduledAt)}
              </span>
            )}
            {isByeMatch && <span className="text-[10px] text-gray-500">Freilos</span>}
            {match.walkover && <span className="text-[10px] text-gray-400" title="Gegner nicht angetreten">kampflos</span>}
            {isPlayed && match.resultConfirmed === false && !isByeMatch && (
              <>
                <span className="text-[10px] text-amber-300" title="Von Spielern gemeldet, noch nicht bestätigt — Punkte gibt es erst nach der Bestätigung">vorläufig</span>
                <button onClick={() => confirmProvisional(match.id)} disabled={loading}
                  className="inline-flex items-center gap-1 rounded-md border border-teal-500/40 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-teal-300 hover:bg-teal-500/20">
                  Bestätigen
                </button>
              </>
            )}
            {isLive && <span className="text-[10px] font-bold text-red-400 animate-pulse">● LIVE</span>}
            {/* Live-Markierung als beschrifteter Schalter (Turnierseite & Overlay) */}
            {!isPlayed && p1 && p2 && (
              <button onClick={() => setLive(match.id, !isLive)} disabled={loading}
                title={isLive ? "Live-Markierung beenden" : "Als „läuft gerade“ markieren (Turnierseite & Overlay)"}
                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                  isLive ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-gray-700 text-gray-500 hover:text-red-300 hover:border-red-500/40"
                }`}>
                {isLive ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />} Live
              </button>
            )}
            {isEditing && (
              <button onClick={() => cancelEdit(match.id)} disabled={loading}
                className="inline-flex items-center gap-1 rounded-md border border-teal-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-teal-300">
                <X className="w-3 h-3" /> Abbrechen
              </button>
            )}
            {/* Seltene Aktionen im ⋯-Menü (Zurücksetzen und Löschen fragen nach) */}
            <DropMenu
              label="Weitere Aktionen"
              trigger={<span className="w-7 h-6 flex items-center justify-center text-base leading-none">⋯</span>}
              items={[
                // Gegner nicht angetreten: der andere kommt ohne Tore weiter (nicht bei Hin-/Rückspiel)
                ...(!isPlayed && p1 && p2 && !match.leg ? [p1, p2].map(pl => ({
                  label: `${userName(pl)} kampflos weiter`, onClick: () => walkoverAction(match, pl.id),
                  icon: <Trophy className="w-3.5 h-3.5 text-gray-500" />,
                })) : []),
                ...(isPlayed && !isByeMatch && !isEditing ? [{ label: "Ergebnis bearbeiten", onClick: () => startEdit(match), icon: <Pencil className="w-3.5 h-3.5 text-gray-500" /> }] : []),
                ...(!isByeMatch ? [{ label: matchLog ? "Verlauf ausblenden" : "Verlauf anzeigen", onClick: () => toggleLog(match.id), icon: <History className="w-3.5 h-3.5 text-gray-500" /> }] : []),
                ...(isPlayed && !isByeMatch ? [{ label: "Ergebnis zurücksetzen", onClick: () => resetMatch(match.id), icon: <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> }] : []),
                { label: "Match löschen", onClick: () => deleteMatch(match.id), danger: true, disabled: loading, icon: <Trash2 className="w-3.5 h-3.5" /> },
              ]}
            />
          </div>
        </div>

        {/* Draw badge */}
        {isDraw && (
          <div className="px-3 py-1 bg-amber-900/20 border-b border-gray-700 text-center">
            <span className="text-xs text-amber-400 font-medium">Unentschieden</span>
          </div>
        )}

        {/* Players */}
        {[
          { player: p1, score: match.score1, id: match.player1Id, key: "s1" },
          { player: p2, score: match.score2, id: match.player2Id, key: "s2" },
        ].map(({ player, score, id, key }, idx) => (
          <div key={idx}
            className={`flex items-center justify-between px-3 py-2 text-sm ${
              idx === 0 ? "border-b border-gray-700" : ""
            } ${match.winnerId === id ? "bg-green-900/20" : isDraw ? "bg-amber-900/10" : ""}`}>
            <span className={
              match.winnerId === id                    ? "text-white font-medium" :
              match.winnerId && match.winnerId !== id  ? "text-gray-600"          :
              isDraw                                   ? "text-amber-200"          :
              player                                   ? "text-white"              :
                                                         "text-gray-600 italic"
            }>
              {player ? userName(player) : "TBD"}
            </span>
            {isPending ? (
              <NumberInput placeholder="0" min={0}
                value={scores1v1[match.id]?.[key as "s1" | "s2"] ?? ""}
                onChange={e => setScores1v1(prev => ({
                  ...prev, [match.id]: { ...prev[match.id], [key]: e.target.value },
                }))}
                className="w-14 text-xs bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-center"
              />
            ) : (
              <span className="text-gray-400 font-mono text-xs">{score ?? "–"}</span>
            )}
          </div>
        ))}

        {/* Rückspiel: Gesamtergebnis */}
        {match.leg === 2 && (
          <div className="px-3 py-1.5 bg-gray-800/40 border-t border-gray-700 text-[11px] text-gray-400">
            {aggregate
              ? <>Hinspiel {aggregate.first.score1 ?? 0}:{aggregate.first.score2 ?? 0} · <span className="text-white font-medium">Gesamt {userName(p1 ?? { id: "", name: "?", username: null, image: null })} {aggregate.g1}:{aggregate.g2} {userName(p2 ?? { id: "", name: "?", username: null, image: null })}</span>
                  {isPlayed && match.winnerId && <> · weiter: {userName((match.winnerId === match.player1Id ? p1 : p2) ?? { id: "", name: "?", username: null, image: null })}</>}</>
              : "Erst das Hinspiel eintragen — danach entscheidet das Gesamtergebnis."}
          </div>
        )}

        {/* Rückspiel: Gesamtergebnis entscheidet, bei Gleichstand Auswahl, wer weiterkommt */}
        {isPending && match.leg === 2 && (
          <div className="flex gap-1 p-2 bg-gray-800/50">
            {!aggregate ? null : aggregate.g1 !== aggregate.g2 ? (
              <button onClick={() => submit1v1(match.id, aggregate.g1 > aggregate.g2 ? match.player1Id! : match.player2Id!)} disabled={loading}
                className="flex-1 text-xs bg-gray-700 hover:bg-rose-600 text-white rounded px-2 py-1.5 transition-colors truncate">
                Ergebnis speichern — {userName((aggregate.g1 > aggregate.g2 ? p1 : p2) ?? { id: "", name: "?", username: null, image: null })} kommt weiter
              </button>
            ) : (
              <>
                <button onClick={() => submit1v1(match.id, match.player1Id!)} disabled={loading}
                  className="flex-1 text-xs bg-gray-700 hover:bg-rose-600 text-white rounded px-2 py-1.5 transition-colors truncate">
                  {p1 ? userName(p1) : "?"} kommt weiter (n.E.)
                </button>
                <button onClick={() => submit1v1(match.id, match.player2Id!)} disabled={loading}
                  className="flex-1 text-xs bg-gray-700 hover:bg-rose-600 text-white rounded px-2 py-1.5 transition-colors truncate">
                  {p2 ? userName(p2) : "?"} kommt weiter (n.E.)
                </button>
              </>
            )}
          </div>
        )}

        {/* Tore eingetragen: ein Knopf "Speichern", der Sieger ergibt sich aus den Toren. Bei Gleichstand im
            K.O.-Spiel Auswahl, wer nach Elfmeterschießen weiterkommt; sonst Unentschieden. */}
        {isPending && match.leg !== 2 && hasBothScores(match.id) && (() => {
          const n1 = Number(scores1v1[match.id]!.s1), n2 = Number(scores1v1[match.id]!.s2);
          const koSingle = (isBracketFormat || (isGroupKnockout && match.groupIndex == null)) && !match.leg;
          const btn = "flex-1 text-xs bg-rose-600/80 hover:bg-rose-600 text-white rounded px-2 py-1.5 transition-colors truncate";
          return (
            <div className="flex gap-1 p-2 bg-gray-800/50">
              {n1 !== n2 ? (
                <button onClick={() => submit1v1(match.id, n1 > n2 ? match.player1Id! : match.player2Id!)} disabled={loading} className={btn}>
                  Speichern · {userName((n1 > n2 ? p1 : p2)!)} gewinnt {n1}:{n2}
                </button>
              ) : koSingle ? (
                <>
                  <button onClick={() => submit1v1(match.id, match.player1Id!)} disabled={loading} className={btn}>{userName(p1!)} weiter (n.E.)</button>
                  <button onClick={() => submit1v1(match.id, match.player2Id!)} disabled={loading} className={btn}>{userName(p2!)} weiter (n.E.)</button>
                </>
              ) : (
                <button onClick={() => submit1v1(match.id, null, true)} disabled={loading} className={btn}>
                  Speichern · Unentschieden {n1}:{n2}
                </button>
              )}
            </div>
          );
        })()}

        {/* Ohne Tore: Sieger direkt wählen */}
        {isPending && match.leg !== 2 && !hasBothScores(match.id) && (
          <div className="flex gap-1 p-2 bg-gray-800/50">
            <button onClick={() => submit1v1(match.id, match.player1Id!)} disabled={loading}
              className="flex-1 text-xs bg-gray-700 hover:bg-rose-600 text-white rounded px-2 py-1.5 transition-colors truncate">
              {p1 ? userName(p1) : "?"} gewinnt
            </button>
            {allowDraw && (
              <button onClick={() => submit1v1(match.id, null, true)} disabled={loading}
                className="shrink-0 text-xs bg-gray-700 hover:bg-amber-700 text-amber-300 rounded px-2 py-1.5 transition-colors">
                Unentschieden
              </button>
            )}
            <button onClick={() => submit1v1(match.id, match.player2Id!)} disabled={loading}
              className="flex-1 text-xs bg-gray-700 hover:bg-rose-600 text-white rounded px-2 py-1.5 transition-colors truncate">
              {p2 ? userName(p2) : "?"} gewinnt
            </button>
          </div>
        )}

        {match.notes && (
          <p className="px-3 py-1.5 text-xs text-gray-600 bg-gray-800/30">{match.notes}</p>
        )}

        {/* Änderungsprotokoll */}
        {matchLog && (
          <div className="px-3 py-2 bg-gray-900/60 border-t border-gray-700 space-y-1">
            {matchLog === "loading" ? (
              <p className="text-[11px] text-gray-500">Lädt…</p>
            ) : matchLog.length === 0 ? (
              <p className="text-[11px] text-gray-500">Noch keine Einträge.</p>
            ) : matchLog.map(entry => {
              const describe = (st: MatchLogEntry["after"]) => {
                if (!st || !st.played) return "offen";
                const winner = st.winnerId ? allUsers.find(u => u.id === st.winnerId) : null;
                const score = st.score1 != null || st.score2 != null ? `${st.score1 ?? "–"}:${st.score2 ?? "–"}` : "";
                return [score, winner ? `Sieger ${userName(winner)}` : "Unentschieden"].filter(Boolean).join(" · ");
              };
              return (
                <p key={entry.id} className="text-[11px] text-gray-400">
                  <span className="text-gray-500">{fmtDate(entry.createdAt)}</span> · {entry.actor} ·{" "}
                  {entry.action === "reset" ? "zurückgesetzt" : `${describe(entry.before)} → ${describe(entry.after)}`}
                </p>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /** Stat-Runde: Eingabe und Korrektur. forceOpen = immer aufgeklappt ("Als Nächstes"). */
  function renderStatRound(match: Match, matchIdx: number, forceOpen = false) {
              const isExp    = forceOpen || expanded.has(match.id);
              const isPlayed = !!match.playedAt;
              const ed       = ffaEdits[match.id] ?? {};
              // Punkt 4: Team-Zuordnung live validieren statt erst beim Speichern per Toast zu melden
              const teamError = validateTeamAssignment(match.id, match.entries);
              return (
                <div key={match.id}
                  className={`rounded-lg border overflow-hidden ${isPlayed ? "border-gray-700" : "border-gray-600"}`}>
                  <button
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-800 hover:bg-gray-750 text-left"
                    onClick={() => setExpanded(prev => { const s = new Set(prev); s.has(match.id) ? s.delete(match.id) : s.add(match.id); return s; })}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-white">Runde {match.position}</span>
                      {statRoundNote(match) && <span className="text-sm text-gray-400">· {statRoundNote(match)}</span>}
                      {match.scheduledAt && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{fmtDate(match.scheduledAt)}
                        </span>
                      )}
                      {isPlayed && (match.resultConfirmed === false ? (
                        <span className="text-xs bg-amber-900/30 text-amber-300 px-1.5 py-0.5 rounded-full" title="Von Spielern gemeldet, noch nicht bestätigt">Vorläufig</span>
                      ) : (
                        <span className="text-xs bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded-full">Gespielt</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500">{match.entries.length} Spieler</span>
                      {isExp ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </button>

                  {isExp && (
                    <div className="p-3">
                      <StatRoundMetaEditor
                        match={match}
                        usedRoundNumbers={usedRoundNumbers}
                        onSave={(position, title) => updateRoundMeta(match.id, position, title)}
                      />
                      {match.notes && <p className="text-xs text-gray-500 mb-3">{match.notes}</p>}
                      {/* Punkt 2: Werte des vorherigen Matches übernehmen (gleiche Teilnehmer über mehrere Runden) */}
                      {matchIdx > 0 && (
                        <button type="button" onClick={() => copyFromPreviousMatch(match.id)}
                          className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-2.5 py-1 mb-3 transition-colors">
                          <RefreshCw className="w-3 h-3" /> Werte aus vorherigem Match übernehmen
                        </button>
                      )}
                      {teamError && (
                        <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2 mb-3">
                          <span>⚠️ {teamError}</span>
                        </div>
                      )}
                      {(() => {
                        const inMatch = new Set(match.entries.map(e => e.userId));
                        const addable = allUsers.filter(u => !inMatch.has(u.id));
                        return (
                          <div className="mb-3 space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {match.entries.map(e => {
                                const u = tournament!.participants.find(p => p.userId === e.userId)?.user
                                  ?? allUsers.find(x => x.id === e.userId);
                                return (
                                  <span key={e.id} className="inline-flex items-center gap-1 text-xs bg-gray-800 border border-gray-700 rounded-full pl-2.5 pr-1 py-0.5 text-gray-200">
                                    {u ? userName(u) : "?"}
                                    <button type="button" disabled={loading || !e.userId}
                                      onClick={() => e.userId && changeMatchPlayer(match.id, e.userId, "remove")}
                                      className="p-0.5 rounded-full text-gray-500 hover:text-red-400 disabled:opacity-40" title="Aus Match entfernen">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                            {addable.length > 0 && (
                              <select value="" disabled={loading}
                                onChange={e => e.target.value && changeMatchPlayer(match.id, e.target.value, "add")}
                                className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-300">
                                <option value="">+ Spieler hinzufügen…</option>
                                {addable.map(u => <option key={u.id} value={u.id}>{userName(u)}</option>)}
                              </select>
                            )}
                          </div>
                        );
                      })()}
                      {visibleStatFields.length === 0 && !trackMatchWin && !trackPlacement ? (
                        <div className="text-xs text-amber-400/80 bg-amber-900/10 border border-amber-800/30 rounded-lg px-3 py-2">
                          Keine Statistik-Felder konfiguriert. Bitte zuerst im Reiter <span className="font-semibold">Einstellungen</span> die gewünschten Stat-Felder eintragen und auf „Turnier-Einstellungen speichern“ klicken.
                        </div>
                      ) : (
                      <>
                        {/* Match Win für coop_stats: entweder alle zusammen (keine Team-Zuordnung) oder Team A vs. Team B —
                            nur wenn die Reihe einen Stat darauf aufbaut (matchWinStatKeys), siehe trackMatchWin oben */}
                        {trackMatchWin && (() => {
                          const teams = teamAssign[match.id] ?? {};
                          const usesTeams = match.entries.some(e => e.userId && teams[e.userId]);
                          return usesTeams ? (
                            <div className="mb-3 space-y-2">
                              <p className="text-xs text-gray-400">
                                Match Win <span className="text-gray-500">(Spieler des Sieger-Teams erhalten +1)</span>
                              </p>
                              <div className="flex gap-2">
                                <button type="button"
                                  onClick={() => setMatchWin(prev => ({ ...prev, [match.id]: prev[match.id] === "A" ? null : "A" }))}
                                  className={`flex-1 text-xs rounded px-2 py-1.5 border transition-colors ${
                                    matchWin[match.id] === "A"
                                      ? "bg-blue-600 border-blue-500 text-white"
                                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                                  }`}>
                                  Team A gewinnt
                                </button>
                                <button type="button"
                                  onClick={() => setMatchWin(prev => ({ ...prev, [match.id]: prev[match.id] === "B" ? null : "B" }))}
                                  className={`flex-1 text-xs rounded px-2 py-1.5 border transition-colors ${
                                    matchWin[match.id] === "B"
                                      ? "bg-rose-600 border-rose-500 text-white"
                                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                                  }`}>
                                  Team B gewinnt
                                </button>
                              </div>
                              <p className="text-[11px] text-amber-500/80">
                                Team-Modus aktiv — jeder Spieler muss unten einem Team zugewiesen sein, bevor du speicherst.
                              </p>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer mb-3 select-none">
                              <input
                                type="checkbox"
                                checked={matchWinAll[match.id] ?? false}
                                onChange={e => setMatchWinAll(prev => ({ ...prev, [match.id]: e.target.checked }))}
                                className="rounded"
                              />
                              <span>Match Win <span className="text-gray-500">(alle haben zusammen gespielt, alle erhalten +1)</span></span>
                            </label>
                          );
                        })()}
                        {trackPlacement && placementPoints && (
                          <p className="text-[11px] text-gray-500 mb-2">
                            Platzierung dieser Runde → Punkte: {Object.entries(placementPoints)
                              .sort(([a], [b]) => Number(a) - Number(b))
                              .map(([place, pts]) => `Platz ${place} = ${pts}`).join(" · ")}
                          </p>
                        )}
                        {(trackMatchWin || trackPlacement || visibleStatFields.length > 0) && (
                        (() => {
                          // Breite Bildschirme: wenige Stat-Spalten → Spieler in zwei Tabellen nebeneinander,
                          // damit große Runden nicht endlos in die Höhe wachsen. Schmal: untereinander.
                          const statCols = visibleStatFields.length + (trackMatchWin ? 1 : 0) + (trackPlacement ? 1 : 0);
                          const twoCol = statCols <= 3 && match.entries.length >= 2;
                          const half = Math.ceil(match.entries.length / 2);
                          const groups = twoCol ? [match.entries.slice(0, half), match.entries.slice(half)] : [match.entries];
                          return (
                        <div className={twoCol ? "grid grid-cols-1 xl:grid-cols-2 gap-x-8" : ""}>
                        {groups.map((group, gi) => (
                        <div key={gi} className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-500 border-b border-gray-700">
                                <th className="text-left py-1.5 pr-3 font-medium">Spieler</th>
                                {trackMatchWin && <th className="text-center py-1.5 px-2 font-medium">Team</th>}
                                {trackPlacement && <th className="text-center py-1.5 px-2 font-medium">Platz</th>}
                                {visibleStatFields.map(f => (
                                  <th key={f} className="text-center py-1.5 px-2 font-medium">{f}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {group.map(entry => {
                                const user    = allUsers.find(u => u.id === entry.userId);
                                const existing: Record<string, number> = entry.statsJson ? JSON.parse(entry.statsJson) : {};
                                const row     = ed[entry.userId ?? ""] ?? {};
                                const entryTeam = entry.userId ? teamAssign[match.id]?.[entry.userId] : undefined;
                                return (
                                  <tr key={entry.id} className="border-b border-gray-800 last:border-0">
                                    <td className="py-1.5 pr-3 text-white whitespace-nowrap">
                                      {user ? userName(user) : "?"}
                                    </td>
                                    {trackMatchWin && (
                                      <td className="py-1 px-2">
                                        <div className="flex gap-1 justify-center">
                                          {(["A", "B"] as const).map(team => (
                                            <button key={team} type="button"
                                              onClick={() => {
                                                if (!entry.userId) return;
                                                const uid = entry.userId;
                                                setTeamAssign(prev => ({
                                                  ...prev,
                                                  [match.id]: { ...prev[match.id], [uid]: prev[match.id]?.[uid] === team ? undefined : team },
                                                }));
                                              }}
                                              disabled={!entry.userId}
                                              className={`w-6 h-6 rounded text-[10px] font-bold border transition-colors disabled:opacity-30 ${
                                                entryTeam === team
                                                  ? team === "A" ? "bg-blue-600 border-blue-500 text-white" : "bg-rose-600 border-rose-500 text-white"
                                                  : "bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500"
                                              }`}>
                                              {team}
                                            </button>
                                          ))}
                                        </div>
                                      </td>
                                    )}
                                    {trackPlacement && (
                                      <td className="py-1 px-2 text-center">
                                        <NumberInput min={1} placeholder="–"
                                          value={row[PLACEMENT_STAT_KEY] ?? (existing[PLACEMENT_STAT_KEY] !== undefined ? String(existing[PLACEMENT_STAT_KEY]) : "")}
                                          onChange={e => setFfaField(match.id, entry.userId ?? "", PLACEMENT_STAT_KEY, e.target.value)}
                                          className="w-14 bg-gray-700 border border-gray-600 text-white rounded px-1.5 py-1 text-center text-xs"
                                        />
                                      </td>
                                    )}
                                    {visibleStatFields.map(f => (
                                      <td key={f} className="py-1 px-2 text-center">
                                        <NumberInput placeholder="–"
                                          value={row[f] ?? (existing[f] !== undefined ? String(existing[f]) : "")}
                                          onChange={e => setFfaField(match.id, entry.userId ?? "", f, e.target.value)}
                                          className="w-16 bg-gray-700 border border-gray-600 text-white rounded px-1.5 py-1 text-center text-xs"
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        ))}
                        </div>
                          );
                        })()
                        )}
                      </>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => submitFfa(match.id, match.entries)} disabled={loading || !!teamError}
                          title={teamError ?? undefined}
                          className="flex items-center gap-1.5 text-xs bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded px-3 py-1.5">
                          <Save className="w-3 h-3" /> Ergebnisse speichern
                        </button>
                        {isPlayed && (
                          <button onClick={() => resetMatch(match.id)} disabled={loading}
                            className="flex items-center gap-1 text-xs text-amber-500 hover:bg-amber-900/20 rounded px-2 py-1.5 transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" /> Zurücksetzen
                          </button>
                        )}
                        <button onClick={() => deleteMatch(match.id)} disabled={loading}
                          className="flex items-center gap-1 text-xs text-red-500 hover:bg-red-900/20 rounded px-2 py-1.5 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> Löschen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
  }

  /* ── Überblick: Stand, Als Nächstes, Live-Tabelle, Werkzeuge ── */
  const dp = is1v1 ? duelProgress(tournament.matches) : null;
  const sp = isFfa ? statProgress(statRounds) : null;
  const nextDuels = is1v1 ? nextDuelMatches(isGroupKnockout ? [...groupMatches, ...knockoutMatches] : tournament.matches) : [];
  const duelStageLabel = (m: Match) => isGroupKnockout
    ? groupKnockoutLabel(m)
    : (isLiga || isRoundRobin) ? `Spieltag ${m.round}`
    : m.round === rounds ? "Finale" : m.round === rounds - 1 ? "Halbfinale" : m.round === rounds - 2 ? "Viertelfinale" : `Runde ${m.round}`;
  const statusDe = tournament.status === "active" ? "Läuft" : tournament.status === "finished" ? "Beendet" : "Noch nicht gestartet";
  const stage = dp
    ? (dp.current ? duelStageLabel(dp.current) : dp.total > 0 ? "alle Matches gespielt" : "noch keine Matches")
    : sp ? (sp.next ? `Runde ${sp.next.position} als Nächstes` : sp.total > 0 ? "alle Runden eingetragen" : "noch keine Runden") : "";
  // Liga mit Sieg/Unentschieden-Münzen: Münzen je Match (stand früher im alten Kopf)
  const matchCoins = supportsDraw ? `Sieg ${getCoinsVal("win")} · Unentschieden ${getCoinsVal("draw")} Münzen pro Match` : "";
  const statusLine = [statusDe, stage, matchCoins].filter(Boolean).join(" · ");
  const hasEventPoints = !!pointsCfg && (pointsCfg.stats.some(st => st.pointsPer) || Object.keys(pointsCfg.placementPoints ?? {}).length > 0);
  const eventPoints = isFfa && hasEventPoints ? computeTurnierpunkte(statRounds, pointsCfg!, tournament.format) : null;
  const standings = isFfa ? statStandings(statRounds, visibleStatFields, tournament.format, { points: eventPoints, direction: avgDirection }) : [];
  // Stat-Formate: Runden-Stats · Liga/K.O. & Co.: Tore laut Ergebnis (lib/community-goal.ts)
  const goalProgress = goal ? computeCommunityGoalProgress(isFfa ? statRounds : tournament.matches, goal) : null;
  const nameOfUser = (uid: string) => {
    const u = allUsers.find(x => x.id === uid) ?? tournament.participants.find(pp => pp.userId === uid)?.user;
    return u ? userName(u) : "?";
  };
  // Visueller K.O.-Baum (K.O.-System und K.O.-Phase von Gruppenphase + K.O.)
  const treeSource = isBracketFormat ? tournament.matches : isGroupKnockout ? knockoutMatches : [];
  const hasTree = treeSource.length > 0;
  const showTree = hasTree && duelView === "tree";
  const tree = hasTree ? bracketColumns(treeSource) : null;
  const treeSlot = tree && treeSel
    ? [...tree.columns.flatMap(c => c.slots), ...(tree.thirdPlace ? [tree.thirdPlace] : [])].find(s => s.key === treeSel) ?? null
    : null;
  const treeAllowDraw = (m: Match) => isGroupKnockout ? m.leg === 1 : supportsDraw;
  const duelViewToggle = hasTree && (
    <div className="flex items-center gap-1">
      {([["tree", "Baum"], ["list", "Liste"]] as const).map(([k, label]) => (
        <button key={k} type="button" onClick={() => setDuelView(k)} aria-pressed={duelView === k}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            duelView === k ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/25" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
          }`}>
          {label}
        </button>
      ))}
      <span className="ml-auto text-[11px] text-gray-600">{duelView === "tree" ? "Paarung antippen zum Eintragen" : "Alle Matches nach Runde"}</span>
    </div>
  );
  const treeView = showTree && tree && (
    <div className="space-y-3">
      <BracketTree columns={tree.columns} thirdPlace={tree.thirdPlace} nameOf={nameOfUser}
        selectedKey={treeSlot?.key ?? null} onSelect={k => setTreeSel(cur => cur === k ? null : k)} />
      {treeSlot && (
        <section aria-label="Gewählte Paarung" className="space-y-2">
          <p className="flex items-center gap-2 text-[11px] text-gray-500">
            <span className="min-w-0 flex-1">{treeSlot.key === "third" ? "Spiel um Platz 3" : tree.columns.find(c => c.round === treeSlot.round)?.label}
              {treeSlot.matches.length > 1 && " · Hin- und Rückspiel"}</span>
            <button type="button" onClick={() => setTreeSel(null)} className="text-gray-500 hover:text-gray-300">Schließen</button>
          </p>
          <div className={`grid gap-2 ${treeSlot.matches.length > 1 ? "md:grid-cols-2" : ""}`}>
            {treeSlot.matches.map(m => (
              <div key={m.id} className="space-y-1">
                {treeSlot.matches.length > 1 && <p className="text-[11px] text-gray-500">{m.leg === 2 ? "Rückspiel" : "Hinspiel"}</p>}
                {renderDuelCard(m, treeAllowDraw(m))}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
  const resultsHref = `/events/verwalten/${event.id}/results`;
  // Auslosung: zufällig oder gesetzt (K.O.-Baum und Gruppen)
  const seedingToggle = (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-gray-500">Auslosung:</span>
      {([["random", "Zufällig"], ["rank", "Nach Rangpunkten setzen"]] as const).map(([k, label]) => (
        <button key={k} type="button" onClick={() => setSeeding(k)} aria-pressed={seeding === k}
          title={k === "rank" ? "Die Stärksten (Rangpunkte) treffen erst spät aufeinander bzw. landen in verschiedenen Gruppen" : undefined}
          className={`rounded-md px-2 py-1 text-[11px] transition-colors ${seeding === k ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/25" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"}`}>
          {label}
        </button>
      ))}
    </div>
  );
  // Ersetzen: wer noch offene Spiele hat → wer angemeldet, aber nicht im Spielplan ist
  const inPlan = new Set(tournament.matches.flatMap(m => [m.player1Id, m.player2Id]).filter((id): id is string => !!id));
  const replaceFromOptions = [...new Set(tournament.matches.filter(m => !m.playedAt)
    .flatMap(m => [m.player1Id, m.player2Id]).filter((id): id is string => !!id))];
  const replaceToOptions = allUsers.filter(u => !inPlan.has(u.id) && !tournament.participants.some(p => p.userId === u.id));
  const openAdd = () => {
    if (isFfa) openAddStatRound();
    else { setMScheduled(nowForDatetimeLocal()); setShowAdd(true); }
    setTimeout(() => addRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };
  const tools = [
    ...(is1v1 && tournament.matches.length > 0 ? [{
      label: showSchedule ? "Terminplanung schließen" : "Termine planen",
      onClick: () => { if (!showSchedule && !scheduleStart) setScheduleStart(nowForDatetimeLocal()); setShowSchedule(v => !v); },
    }] : []),
    ...(canResetDraw ? [{ label: "Auslosung zurücksetzen", onClick: resetDrawAction, disabled: loading }] : []),
    ...(isDrawn ? [{ label: showReplace ? "Ersetzen schließen" : "Spieler ersetzen", onClick: () => setShowReplace(v => !v) }] : []),
    ...(!isGroupKnockout ? [{ label: isFfa ? "Runde hinzufügen" : "Match hinzufügen", onClick: openAdd }] : []),
  ];

  const goalBar = goalProgress && goal ? (
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/[0.04] px-3 py-2 space-y-1">
              <p className="flex items-center justify-between gap-2 text-xs">
                <span className="text-teal-200 font-semibold">{goal?.title || "Community-Ziel"}</span>
                <span className="tabular-nums text-gray-300">
                  {isAvgGoal(goal!)
                    ? <>Ø {formatDecimal(goalProgress.main.total)} · Ziel {goal!.direction === "atMost" ? "höchstens" : "mind."} {formatDecimal(goal!.target)} {goalUnit(goal!)}</>
                    : <>{formatDecimal(goalProgress.main.total)} von {formatDecimal(goal!.target)} {goalUnit(goal!)}</>}
                </span>
              </p>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-teal-400" style={{ width: `${goalProgress.main.percent}%` }} />
              </div>
            </div>
  ) : null;

  return (
    <div className="tm-root space-y-4" data-tm-view={viewMode}>

      <div className="flex items-center justify-end gap-1.5 text-[11px] text-gray-500">
        <span>Ansicht:</span>
        {([["auto", "Auto"], ["touch", "Touch"], ["desktop", "Desktop"]] as const).map(([v, label]) => (
          <button key={v} type="button" onClick={() => changeViewMode(v)}
            className={`px-2.5 py-1 rounded-md border transition-colors ${
              viewMode === v ? "border-rose-500 bg-rose-900/20 text-white" : "border-gray-700 text-gray-400 hover:border-gray-600"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Stand, Ergebnis-Meldungen, Werkzeuge (für Desktop und Touch) ── */}
      <TournamentHeader
        formatLabel={formatLabel}
        statusLine={statusLine}
        played={dp ? dp.played : sp ? sp.played : 0}
        total={dp ? dp.total : sp ? sp.total : 0}
        unit={isFfa ? "Runden" : "Matches"}
        resultsHref={resultsHref}
        pendingCount={pendingCount}
        tools={tools}
      />
      {!isFfa && goalBar}
      {pendingSubmissions.length > 0 && (
        <section aria-label="Gemeldete Ergebnisse" className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] px-3 py-2">
          <p className="text-[11px] font-semibold text-amber-300">Von Spielern gemeldet ({pendingSubmissions.length})</p>
          <InlineSubmissions eventId={event.id} items={pendingSubmissions} resultsHref={resultsHref} />
        </section>
      )}

      {/* Spieler ersetzen: Ausfall nach der Auslosung, Nachrücker übernimmt die offenen Spiele */}
      {showReplace && isDrawn && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/30 p-3 space-y-2">
          <p className="text-xs text-gray-300 font-medium">Spieler ersetzen</p>
          <p className="text-[11px] text-gray-500">
            Der Nachrücker übernimmt alle noch offenen Spiele, gespielte bleiben beim alten Spieler. Zur Wahl stehen
            angemeldete Spieler, die nicht ausgelost sind. Andere Mitglieder erst im Reiter „Teilnehmer“ eintragen.
            Wer nur ein Spiel verpasst, wird besser über ⋯ → „kampflos weiter“ gewertet.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select value={replaceFrom} onChange={e => setReplaceFrom(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white">
              <option value="">Wer fällt aus?</option>
              {replaceFromOptions.map(id => <option key={id} value={id}>{nameOfUser(id)}</option>)}
            </select>
            <select value={replaceTo} onChange={e => setReplaceTo(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white">
              <option value="">Wer rückt nach?</option>
              {replaceToOptions.map(u => <option key={u.id} value={u.id}>{userName(u)}</option>)}
            </select>
          </div>
          {replaceToOptions.length === 0 && (
            <p className="text-[11px] text-amber-300">Kein angemeldeter Spieler ohne Platz. Trag den Nachrücker zuerst im Reiter „Teilnehmer“ ein.</p>
          )}
          <button type="button" onClick={replacePlayerAction} disabled={loading || !replaceFrom || !replaceTo}
            className="text-xs bg-teal-700/80 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg px-3 py-1.5">
            Ersetzen
          </button>
        </div>
      )}

      {/* Terminplanung: Startzeit + Abstand je Spieltag/Runde */}
      {showSchedule && is1v1 && tournament.matches.length > 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/30">
          <button type="button" onClick={() => {
            if (!showSchedule && !scheduleStart) setScheduleStart(nowForDatetimeLocal());
            setShowSchedule(v => !v);
          }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-300">
            <span className="flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> Termine planen</span>
            {showSchedule ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showSchedule && (
            <div className="px-3 pb-3 space-y-2">
              <p className="text-[11px] text-gray-500">
                Jeder Spieltag bzw. jede K.O.-Runde bekommt ein eigenes Zeitfenster (Gruppen spielen gleichzeitig,
                Hin- und Rückspiel getrennt). Freilose werden nicht terminiert.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <input type="datetime-local" value={scheduleStart} onChange={e => setScheduleStart(e.target.value)}
                  className="text-xs bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5" />
                <span className="text-xs text-gray-400">alle</span>
                <NumberInput min={5} value={scheduleInterval} onChange={e => setScheduleInterval(Number(e.target.value) || 0)}
                  className="w-20 text-xs bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-center" />
                <span className="text-xs text-gray-400">Minuten</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                <input type="checkbox" checked={scheduleOverwrite} onChange={e => setScheduleOverwrite(e.target.checked)} className="rounded" />
                Vorhandene Termine überschreiben
              </label>
              <button type="button" onClick={scheduleMatches} disabled={loading || !scheduleStart || scheduleInterval < 5}
                className="text-xs bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg px-3 py-1.5">
                Termine setzen
              </button>
            </div>
          )}
        </div>
      )}


      {/* Nachzügler (Punktewertung/Durchschnittswerte): angemeldete Spieler, die in noch keiner Runde
          stehen — z.B. bei Zeitraum-Events nach dem Start eingestiegen. Per Knopf in eine Runde aufnehmen. */}
      {isFfa && statRounds.length > 0 && latecomers.length > 0 && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 space-y-2">
          <p className="text-sm font-semibold text-amber-300">
            Neu dabei — noch in keiner Runde ({latecomers.length})
          </p>
          <div className="space-y-1.5">
            {latecomers.map(u => (
              <div key={u.id} className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-white flex-1 min-w-[120px] truncate">{u.username ?? u.name ?? "?"}</span>
                <select
                  value={latecomerRound[u.id] ?? statRounds[statRounds.length - 1].id}
                  onChange={e => setLatecomerRound(prev => ({ ...prev, [u.id]: e.target.value }))}
                  className="rounded-lg px-2 py-1.5 text-xs text-white bg-gray-800 border border-gray-700 outline-none focus:border-amber-500/50">
                  {[...statRounds].reverse().map(m => <option key={m.id} value={m.id}>{statRoundLabel(m)}</option>)}
                </select>
                <button type="button" disabled={loading}
                  onClick={() => changeMatchPlayer(latecomerRound[u.id] ?? statRounds[statRounds.length - 1].id, u.id, "add")}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors disabled:opacity-50">
                  <Plus className="w-3.5 h-3.5" /> Zur Runde
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          Mobile / Touchscreen — eigener Live-Modus statt verkleinerter
          Desktop-Tabelle, siehe TournamentManagerMobile.
          ══════════════════════════════════════════════════════════════ */}
      <div className="tm-touch-only">
        <TournamentManagerMobile
          tournament={isGroupKnockout
            ? { ...tournament, matches: [...groupMatches, ...knockoutMatches] }
            : tournament}
          groupStage={isGroupKnockout ? {
            panel: <GroupStagePanel tournament={tournament} allUsers={allUsers} loading={loading} onAction={groupStageAction} compact
              drawCount={drawCount} seedingToggle={seedingToggle} />,
            roundLabel: groupKnockoutLabel,
            // Gruppenspiele und Hinspiele dürfen unentschieden enden; das Rückspiel entscheidet per Gesamtergebnis
            allowDraw: m => m.groupIndex != null || m.leg === 1,
          } : undefined}
          allUsers={allUsers}
          loading={loading}
          isFfa={isFfa}
          isCoop={isCoop}
          trackMatchWin={trackMatchWin}
          trackPlacement={trackPlacement}
          isLiga={isLiga}
          is1v1={is1v1}
          isRoundRobin={isRoundRobin}
          formatLabel={formatLabel}
          visibleStatFields={visibleStatFields}
          placementPoints={placementPoints}
          supportsDraw={supportsDraw}
          rounds={rounds}
          scores1v1={scores1v1}
          setScores1v1={setScores1v1}
          ffaEdits={ffaEdits}
          setFfaField={setFfaField}
          teamAssign={teamAssign}
          setTeamAssign={setTeamAssign}
          matchWin={matchWin}
          setMatchWin={setMatchWin}
          matchWinAll={matchWinAll}
          setMatchWinAll={setMatchWinAll}
          validateTeamAssignment={validateTeamAssignment}
          submit1v1={submit1v1}
          submitFfa={submitFfa}
          changeMatchPlayer={changeMatchPlayer}
          resetMatch={resetMatch}
          deleteMatch={deleteMatch}
          generateRoundRobinMatches={generateRoundRobinMatches}
          canGenerate={canGenerate}
          isBracketFormat={isBracketFormat}
          showAdd={showAdd}
          setShowAdd={setShowAdd}
          mTitle={mTitle}
          setMTitle={setMTitle}
          mScheduled={mScheduled}
          setMScheduled={setMScheduled}
          mNotes={mNotes}
          setMNotes={setMNotes}
          mRound={mRound}
          setMRound={setMRound}
          mP1={mP1}
          setMP1={setMP1}
          mP2={mP2}
          setMP2={setMP2}
          mFfaIds={mFfaIds}
          setMFfaIds={setMFfaIds}
          addMatch={addMatch}
          openAddStatRound={openAddStatRound}
          updateRoundMeta={updateRoundMeta}
          usedRoundNumbers={usedRoundNumbers}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          Desktop — bestehende Tabellen-/Bracket-Ansicht.
          ══════════════════════════════════════════════════════════════ */}
      <div className="tm-desktop-only space-y-4">

      {/* ── Als Nächstes ── */}
      {is1v1 && nextDuels.length > 0 && (
        <section aria-label="Als Nächstes" className="space-y-2">
          <p className="text-xs font-semibold text-amber-300">Als Nächstes</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {nextDuels.map(m => (
              <div key={m.id} className="space-y-1">
                <p className="text-[11px] text-gray-500">{duelStageLabel(m)}</p>
                {renderDuelCard(m, isGroupKnockout ? (m.groupIndex != null || m.leg === 1) : supportsDraw)}
              </div>
            ))}
          </div>
        </section>
      )}
      {isFfa && sp?.next && (
        <section aria-label="Als Nächstes" className="space-y-2">
          <p className="text-xs font-semibold text-amber-300">Als Nächstes · {statRoundLabel(sp.next)} eintragen</p>
          {renderStatRound(sp.next, statRounds.findIndex(r => r.id === sp.next!.id), true)}
        </section>
      )}

      {/* K.O.-Baum / Liga aus den angemeldeten Spielern auslosen (direkt sichtbar wenn relevant) */}
      {canGenerate && (
        <div className="rounded-lg border border-blue-900/40 bg-blue-900/10 p-3 space-y-2">
          {isBracketFormat && seedingToggle}
          <p className="text-[11px] text-gray-400">{drawPreview(tournament.format, drawCount)}</p>
          <button onClick={generateRoundRobinMatches} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 bg-blue-900/30 hover:bg-blue-900/40 border border-blue-900/50 rounded-lg px-3 py-2 transition-colors w-full justify-center">
            <RefreshCw className="w-3.5 h-3.5" />
            {isBracketFormat ? "K.O.-Baum auslosen" : isLiga ? "Spieltage auslosen" : "Paarungen auslosen"}
          </button>
        </div>
      )}

      {/* ── Gruppenphase + K.O.: Auslosung/Tabellen, Gruppenspiele (mit Unentschieden), K.O.-Runde ── */}
      {isGroupKnockout && (
        <div className="space-y-4">
          <GroupStagePanel tournament={tournament} allUsers={allUsers} loading={loading} onAction={groupStageAction}
            drawCount={drawCount} seedingToggle={seedingToggle} />
          {groupIndexes.map(gi => (
            <div key={`g${gi}`}>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">{groupLabel(gi)} · Spiele</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {groupMatches.filter(m => m.groupIndex === gi).map(m => renderDuelCard(m, true))}
              </div>
            </div>
          ))}
          {duelViewToggle}
          {treeView}
          {!showTree && Array.from({ length: knockoutRounds }, (_, i) => i + 1).map(round => (
            <div key={`ko${round}`}>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">{knockoutRoundLabel(round, knockoutRounds)}</p>
              <div className="space-y-2">
                {knockoutMatches.filter(m => m.round === round).map(m => renderDuelCard(m, m.leg === 1))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Match list ───────────────────────────────────────────────── */}
      {/* Punkt 1: Sammel-Speichern für alle aufgeklappten Stat-Matches statt Klick pro Match */}
      {!is1v1 && statView === "rounds" && expanded.size > 0 && (
        <button onClick={saveAllExpanded} disabled={loading}
          className="flex items-center gap-1.5 text-xs bg-teal-700/80 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg px-3 py-2 w-full justify-center transition-colors">
          <Save className="w-3.5 h-3.5" /> Alle {expanded.size} aufgeklappten Matches speichern
        </button>
      )}
      {/* ── Stat-Formate: Live-Tabelle oder Runden ── */}
      {isFfa && statRounds.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1">
            {([["table", "Tabelle"], ["rounds", "Runden"]] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setStatView(k)} aria-pressed={statView === k}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  statView === k ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/25" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                }`}>
                {label}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-gray-600">
              {statView === "table"
                ? (hasEventPoints ? "Wertung nach Eventpunkten, wie beim Abschluss" : tournament.format === "avg_stats" ? `Wertung nach Ø pro Runde · ${avgDirection === "low" ? "niedrigster" : "höchster"} gewinnt` : `Wertung nach ${visibleStatFields[0] ?? "erstem Stat"}`)
                : "Runde aufklappen zum Korrigieren"}
            </span>
          </div>
          {goalBar}
          {statView === "table" && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <StatStandingsTable rows={standings} fields={visibleStatFields} isAvg={tournament.format === "avg_stats"}
                hasPoints={!!eventPoints} nameOf={nameOfUser} maxRounds={sp?.played ?? 0} />
            </div>
          )}
        </div>
      )}

      {/* ── K.O.-System: visueller Baum (Umschalter auf die Liste) ── */}
      {isBracketFormat && hasTree && (
        <div className="space-y-3">
          {duelViewToggle}
          {treeView}
        </div>
      )}

      {!isGroupKnockout && (!isFfa || statView === "rounds") && !showTree && (
      <div className="space-y-2">
        {tournament.matches.length === 0 && (
          <div className="text-center py-6 bg-gray-800/50 rounded-lg text-gray-500 text-sm border border-gray-700 border-dashed">
            {(isRoundRobin || isLiga)
              ? 'Spieler im Reiter "Teilnehmer" anmelden, dann hier auf "Paarungen generieren" klicken.'
              : isBracketFormat
              ? 'Spieler im Reiter "Teilnehmer" anmelden, dann oben auf "K.O.-Baum auslosen" klicken — oder Matches unten von Hand anlegen.'
              : 'Noch keine Matches. Klicke unten auf "Match hinzufügen".'}
          </div>
        )}

        {is1v1
          ? /* ── 1v1 / bracket / liga ────────────────────────────────── */
            Array.from({ length: rounds }, (_, i) => i + 1).map(round => {
              const rMatches = tournament.matches.filter(m => m.round === round);
              const rLabel = isLiga
                ? `Spieltag ${round}`
                : round === rounds       ? "Finale"
                : round === rounds - 1  ? "Halbfinale"
                : round === rounds - 2  ? "Viertelfinale"
                : `Runde ${round}`;
              return (
                <div key={round}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">{rLabel}</p>
                  <div className="space-y-2">
                    {rMatches.map(match => renderDuelCard(match, supportsDraw))}
                  </div>
                </div>
              );
            })
          : /* ── FFA / coop view ─────────────────────────────────────── */
            statRounds.map((match, matchIdx) => renderStatRound(match, matchIdx))}
      </div>
      )}

      {/* ── Add Match ────────────────────────────────────────────────── */}
      {/* Gruppenphase + K.O.: Matches entstehen nur über Auslosung bzw. K.O.-Runde */}
      <div ref={addRef} className="scroll-mt-24">
      {!isGroupKnockout && (!showAdd ? (
        <button onClick={() => {
          if (isFfa) { openAddStatRound(); return; }
          setMScheduled(nowForDatetimeLocal());
          setShowAdd(true);
        }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-4 py-2 w-full justify-center transition-colors">
          <Plus className="w-4 h-4" /> {isFfa ? "Runde hinzufügen" : "Match hinzufügen"}
        </button>
      ) : (
        <div className="border border-rose-800 rounded-lg p-4 bg-rose-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">{isFfa ? "Neue Runde" : "Neues Match"}</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          {isFfa && (
            <StatRoundFields
              round={mRound} onRoundChange={setMRound}
              note={mTitle} onNoteChange={setMTitle}
              usedRoundNumbers={usedRoundNumbers}
            />
          )}
          {!isFfa && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Titel (optional)</label>
              <input type="text" value={mTitle} onChange={e => setMTitle(e.target.value)}
                placeholder="z.B. Gruppenphase A"
                className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Datum & Uhrzeit</label>
              <input type="datetime-local" value={mScheduled} onChange={e => setMScheduled(e.target.value)}
                className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2"
              />
            </div>
            {is1v1 && (
              <>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{isLiga ? "Spieltag" : "Runde"}</label>
                  <NumberInput min={1} value={mRound} onChange={e => setMRound(Number(e.target.value))}
                    className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2"
                  />
                </div>
                <div />
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Spieler 1</label>
                  <select value={mP1} onChange={e => setMP1(e.target.value)}
                    className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2">
                    <option value="">– wählen –</option>
                    {allUsers.map(u => <option key={u.id} value={u.id}>{userName(u)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Spieler 2</label>
                  <select value={mP2} onChange={e => setMP2(e.target.value)}
                    className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2">
                    <option value="">– wählen –</option>
                    {allUsers.map(u => <option key={u.id} value={u.id}>{userName(u)}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
          )}

          {isFfa && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Teilnehmer ({mFfaIds.length} gewählt)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
                {allUsers.map(u => (
                  <label key={u.id} className="flex items-center gap-1.5 p-1.5 rounded bg-gray-800 hover:bg-gray-700 cursor-pointer text-xs">
                    <input type="checkbox"
                      checked={mFfaIds.includes(u.id)}
                      onChange={e => setMFfaIds(e.target.checked ? [...mFfaIds, u.id] : mFfaIds.filter(id => id !== u.id))}
                      className="rounded shrink-0"
                    />
                    <span className="text-white truncate">{userName(u)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!isFfa && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">Notizen (optional)</label>
            <input type="text" value={mNotes} onChange={e => setMNotes(e.target.value)}
              placeholder="z.B. Map: Verdansk, Server: EU"
              className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2"
            />
          </div>
          )}

          <button onClick={addMatch} disabled={loading || (isFfa && (mFfaIds.length === 0 || mRound < 1))}
            className="flex items-center gap-2 text-sm bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg px-4 py-2">
            <Plus className="w-4 h-4" /> {isFfa ? `Runde ${mRound} erstellen` : "Match erstellen"}
          </button>
        </div>
      ))}
      </div>
      </div>
      {ConfirmDialogElement}
    </div>
  );
}
