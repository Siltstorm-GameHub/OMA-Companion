"use client";
import { useEffect, useState } from "react";
import {
  ChevronLeft, ChevronRight, RotateCcw, Trash2, Check, Minus, Plus as PlusIcon,
  RefreshCw, Swords, X,
} from "lucide-react";
import { PLACEMENT_STAT_KEY } from "@/lib/series-event-points";
import { userName, fmtDate, nowForDatetimeLocal, type User, type Match, type MatchEntry, type Tournament } from "./TournamentManager";

/**
 * Live-Modus für die Turnierverwaltung auf Handy/Tablet.
 *
 * Anders als die Desktop-Ansicht (dichte Tabellen, kleine Inputs) zeigt dieser Modus jeweils
 * genau EIN "Jetzt dran"-Match groß mit Stepper-Bedienung, plus eine kompakte Liste der übrigen
 * Matches darunter. Die konkreten Bedienelemente hängen vom Turnierformat ab:
 * - 1v1 (K.-o./Liga/Round-Robin ohne Stats): Score-Stepper + große "X gewinnt"-Buttons.
 * - FFA/Ø-Stats: pro Teilnehmer Stat-Stepper statt Zahlenfeld.
 * - Kooperativ (Stats): zusätzlich große Team-A/B-Toggles + Match-Win-Auswahl, Platzierungs-Stepper.
 */

function parseStats(json: string | null): Record<string, number> {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

function Avatar({ u, tone }: { u?: User; tone: "a" | "b" }) {
  const bg = tone === "a" ? "bg-teal-500" : "bg-rose-500";
  const initial = u ? userName(u)[0]?.toUpperCase() : "?";
  if (u?.image) return <img src={u.image} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />;
  return (
    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-gray-950 ${bg}`}>
      {initial}
    </div>
  );
}

/** Große +/- Stepper-Bedienung statt kleiner Zahlenfelder — Kernbaustein des Live-Modus. */
function Stepper({
  value, onChange, min = 0, size = "md",
}: {
  value: number; onChange: (next: number) => void; min?: number; size?: "md" | "sm";
}) {
  const dim = size === "sm" ? "w-8 h-8 text-sm" : "w-10 h-10 text-base";
  return (
    <div className="flex items-center gap-1 bg-gray-950 border border-gray-700 rounded-xl p-1">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        className={`${dim} flex items-center justify-center rounded-lg bg-gray-800 text-white active:bg-gray-700 transition-colors`}>
        <Minus className="w-4 h-4" />
      </button>
      <span className="min-w-[2ch] text-center text-lg font-bold text-white tabular-nums px-1">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)}
        className={`${dim} flex items-center justify-center rounded-lg bg-gray-800 text-white active:bg-gray-700 transition-colors`}>
        <PlusIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

/** Snackbar mit Rückgängig-Option nach dem Speichern — Ausgleich dafür, dass die großen Stepper
 *  ein Ergebnis in Sekunden eintragen können und Vertipper in der Live-Hektik wahrscheinlicher sind. */
function Snackbar({ text, onUndo, onDismiss }: { text: string; onUndo: () => void; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <div className="fixed left-3 right-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 shadow-xl shadow-black/40">
      <span className="text-xs text-gray-200 flex items-center gap-2"><Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />{text}</span>
      <button onClick={onUndo} className="text-xs font-semibold text-teal-400 shrink-0">Rückgängig</button>
    </div>
  );
}

interface Props {
  tournament: Tournament;
  allUsers: User[];
  loading: boolean;
  isFfa: boolean;
  isCoop: boolean;
  trackMatchWin: boolean;
  trackPlacement: boolean;
  isLiga: boolean;
  is1v1: boolean;
  isRoundRobin: boolean;
  formatLabel: string;
  visibleStatFields: string[];
  placementPoints?: Record<string, number> | null;
  supportsDraw: boolean;
  rounds: number;
  scores1v1: Record<string, { s1: string; s2: string }>;
  setScores1v1: React.Dispatch<React.SetStateAction<Record<string, { s1: string; s2: string }>>>;
  ffaEdits: Record<string, Record<string, Record<string, string>>>;
  setFfaField: (matchId: string, userId: string, field: string, val: string) => void;
  teamAssign: Record<string, Record<string, "A" | "B" | undefined>>;
  setTeamAssign: React.Dispatch<React.SetStateAction<Record<string, Record<string, "A" | "B" | undefined>>>>;
  matchWin: Record<string, "A" | "B" | null>;
  setMatchWin: React.Dispatch<React.SetStateAction<Record<string, "A" | "B" | null>>>;
  matchWinAll: Record<string, boolean>;
  setMatchWinAll: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  validateTeamAssignment: (matchId: string, entries: MatchEntry[]) => string | null;
  submit1v1: (matchId: string, winnerId: string | null, isDraw?: boolean) => Promise<void>;
  submitFfa: (matchId: string, entries: MatchEntry[], opts?: { silent?: boolean }) => Promise<boolean>;
  resetMatch: (matchId: string) => Promise<void>;
  deleteMatch: (matchId: string) => Promise<void>;
  generateRoundRobinMatches: () => Promise<void>;
  showAdd: boolean;
  setShowAdd: React.Dispatch<React.SetStateAction<boolean>>;
  mTitle: string;
  setMTitle: React.Dispatch<React.SetStateAction<string>>;
  mScheduled: string;
  setMScheduled: React.Dispatch<React.SetStateAction<string>>;
  mNotes: string;
  setMNotes: React.Dispatch<React.SetStateAction<string>>;
  mRound: number;
  setMRound: React.Dispatch<React.SetStateAction<number>>;
  mP1: string;
  setMP1: React.Dispatch<React.SetStateAction<string>>;
  mP2: string;
  setMP2: React.Dispatch<React.SetStateAction<string>>;
  mFfaIds: string[];
  setMFfaIds: React.Dispatch<React.SetStateAction<string[]>>;
  addMatch: () => Promise<void>;
}

export default function TournamentManagerMobile({
  tournament, allUsers, loading,
  isFfa, isCoop, trackMatchWin, trackPlacement, isLiga, is1v1, isRoundRobin, formatLabel,
  visibleStatFields, placementPoints, supportsDraw, rounds,
  scores1v1, setScores1v1, ffaEdits, setFfaField,
  teamAssign, setTeamAssign, matchWin, setMatchWin, matchWinAll, setMatchWinAll,
  validateTeamAssignment, submit1v1, submitFfa, resetMatch, deleteMatch, generateRoundRobinMatches,
  showAdd, setShowAdd, mTitle, setMTitle, mScheduled, setMScheduled, mNotes, setMNotes,
  mRound, setMRound, mP1, setMP1, mP2, setMP2, mFfaIds, setMFfaIds, addMatch,
}: Props) {
  const matches = tournament.matches;

  // "Jetzt dran" = erstes noch offenes Match, sonst das erste überhaupt.
  const firstOpenIdx = matches.findIndex(m => is1v1 ? !(m.winnerId || m.playedAt) : !m.playedAt);
  const [focusIdx, setFocusIdx] = useState(() => (firstOpenIdx >= 0 ? firstOpenIdx : 0));

  const [snackbar, setSnackbar] = useState<{ text: string; matchId: string } | null>(null);

  const hasMatches = matches.length > 0;
  // Math.min hält den Fokus gültig, falls ein Match gelöscht wurde, seit focusIdx zuletzt gesetzt
  // wurde — ohne dafür einen zusätzlichen Effekt zu brauchen (goto() clamped beim Navigieren genauso).
  const focused = hasMatches ? matches[Math.max(0, Math.min(focusIdx, matches.length - 1))] : null;
  const isPlayed1v1 = !!focused?.winnerId || !!focused?.playedAt;
  const isPlayedFfa = !!focused?.playedAt;

  function roundLabel(round: number) {
    if (isLiga) return `Spieltag ${round}`;
    if (is1v1) {
      if (round === rounds) return "Finale";
      if (round === rounds - 1) return "Halbfinale";
      if (round === rounds - 2) return "Viertelfinale";
      return `Runde ${round}`;
    }
    return `Runde ${round}`;
  }

  function goto(delta: number) {
    setFocusIdx(i => Math.max(0, Math.min(matches.length - 1, i + delta)));
  }

  async function handle1v1Result(winnerId: string | null, isDraw = false) {
    if (!focused) return;
    const label = isDraw ? "Unentschieden" : `${userName(allUsers.find(u => u.id === winnerId) ?? { id: "", name: "?", username: null, image: null })} gewinnt`;
    await submit1v1(focused.id, winnerId, isDraw);
    setSnackbar({ text: `Gespeichert: ${label}`, matchId: focused.id });
    goto(1);
  }

  async function handleFfaSave() {
    if (!focused) return;
    const ok = await submitFfa(focused.id, focused.entries);
    if (ok) {
      setSnackbar({ text: `„${focused.title || `Match ${focused.position}`}" gespeichert`, matchId: focused.id });
      goto(1);
    }
  }

  async function handleUndo() {
    if (!snackbar) return;
    await resetMatch(snackbar.matchId);
    setSnackbar(null);
  }

  return (
    <div className="space-y-4 pb-16">

      {/* ── Kompakter Status-Header ── */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="bg-rose-900/40 text-rose-300 px-2 py-1 rounded-full">{formatLabel}</span>
        <span className={`px-2 py-1 rounded-full ${
          tournament.status === "active" ? "bg-green-900/40 text-green-300" :
          tournament.status === "finished" ? "bg-gray-800 text-gray-500" : "bg-amber-900/40 text-amber-300"
        }`}>{tournament.status}</span>
        <span className="text-gray-600 ml-auto">{matches.filter(m => is1v1 ? (m.winnerId || m.playedAt) : m.playedAt).length}/{matches.length} gespielt</span>
      </div>

      {(isRoundRobin || isLiga) && tournament.participants.length >= 2 && (
        <button onClick={generateRoundRobinMatches} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-900/20 border border-blue-900/40 rounded-lg px-3 py-2.5 w-full justify-center">
          <RefreshCw className="w-3.5 h-3.5" /> Paarungen generieren
        </button>
      )}

      {!hasMatches && (
        <div className="text-center py-8 text-gray-500 text-sm space-y-2 border border-dashed border-gray-700 rounded-xl bg-gray-800/50">
          <Swords className="w-7 h-7 mx-auto text-gray-700" />
          <p>{(isRoundRobin || isLiga)
            ? 'Teilnehmer im Reiter „Teilnehmer" hinzufügen, dann Paarungen generieren.'
            : 'Noch keine Matches — unten anlegen.'}</p>
        </div>
      )}

      {/* ── "Jetzt dran"-Karte ── */}
      {focused && (
      <div className="rounded-2xl p-4 space-y-3" style={{ background: "linear-gradient(165deg, rgba(20,184,166,0.12), rgba(31,41,55,0.9))", border: "1px solid rgba(20,184,166,0.35)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
              {(is1v1 ? !isPlayed1v1 : !isPlayedFfa) ? "Jetzt dran" : "Zuletzt angesehen"}
            </span>
            <span className="text-[11px] text-gray-400">{roundLabel(focused.round)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => goto(-1)} disabled={focusIdx === 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800/80 text-gray-300 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => goto(1)} disabled={focusIdx >= matches.length - 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800/80 text-gray-300 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {focused.title && <p className="text-xs text-gray-400 -mt-1">{focused.title}</p>}

        {is1v1 ? (
          <FocusedDuelCard
            match={focused}
            allUsers={allUsers}
            isPlayed={isPlayed1v1}
            supportsDraw={supportsDraw}
            scores1v1={scores1v1}
            setScores1v1={setScores1v1}
            onResult={handle1v1Result}
            onReset={() => resetMatch(focused.id)}
          />
        ) : (
          <FocusedFfaCard
            match={focused}
            allUsers={allUsers}
            isCoop={isCoop}
            trackMatchWin={trackMatchWin}
            trackPlacement={trackPlacement}
            placementPoints={placementPoints}
            visibleStatFields={visibleStatFields}
            ffaEdits={ffaEdits}
            setFfaField={setFfaField}
            teamAssign={teamAssign}
            setTeamAssign={setTeamAssign}
            matchWin={matchWin}
            setMatchWin={setMatchWin}
            matchWinAll={matchWinAll}
            setMatchWinAll={setMatchWinAll}
            validateTeamAssignment={validateTeamAssignment}
            loading={loading}
            onSave={handleFfaSave}
            onReset={() => resetMatch(focused.id)}
          />
        )}
      </div>
      )}

      {/* ── Übrige Matches als kompakte Liste ── */}
      {hasMatches && (
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5 px-1">Alle Matches</p>
        <div className="space-y-1.5">
          {matches.map((m, idx) => {
            const played = is1v1 ? !!(m.winnerId || m.playedAt) : !!m.playedAt;
            const isFocused = idx === focusIdx;
            return (
              <button key={m.id} onClick={() => setFocusIdx(idx)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                  isFocused ? "border-teal-500/50 bg-teal-500/10" : "border-gray-700 bg-gray-800/60"
                }`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${played ? "bg-teal-500" : "bg-gray-600"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white truncate">
                    {is1v1
                      ? `${m.player1Id ? userName(allUsers.find(u => u.id === m.player1Id) ?? { id: "", name: "TBD", username: null, image: null }) : "TBD"} vs. ${m.player2Id ? userName(allUsers.find(u => u.id === m.player2Id) ?? { id: "", name: "TBD", username: null, image: null }) : "TBD"}`
                      : (m.title || `Match ${m.position}`)}
                  </p>
                  <p className="text-[10px] text-gray-500">{roundLabel(m.round)}{m.scheduledAt ? ` · ${fmtDate(m.scheduledAt)}` : ""}</p>
                </div>
                {is1v1 && played && (
                  <span className="text-[10px] text-teal-400 shrink-0">{m.score1 ?? "–"}:{m.score2 ?? "–"}</span>
                )}
                {!is1v1 && (
                  <span className="text-[10px] text-gray-500 shrink-0">{m.entries.length} Sp.</span>
                )}
                <button onClick={e => { e.stopPropagation(); deleteMatch(m.id); }}
                  className="p-1.5 -m-1 text-gray-600 active:text-red-500 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* ── Match hinzufügen ── */}
      {!showAdd ? (
        <button onClick={() => {
          setMScheduled(nowForDatetimeLocal());
          if (isFfa) setMFfaIds(tournament.participants.map(p => p.userId));
          setShowAdd(true);
        }}
          className="flex items-center gap-2 text-sm text-gray-300 border border-gray-700 rounded-xl px-4 py-3 w-full justify-center">
          <PlusIcon className="w-4 h-4" /> Match hinzufügen
        </button>
      ) : (
        <AddMatchForm
          allUsers={allUsers}
          participants={tournament.participants.map(p => p.userId)}
          isFfa={isFfa}
          is1v1={is1v1}
          isLiga={isLiga}
          loading={loading}
          mTitle={mTitle} setMTitle={setMTitle}
          mScheduled={mScheduled} setMScheduled={setMScheduled}
          mNotes={mNotes} setMNotes={setMNotes}
          mRound={mRound} setMRound={setMRound}
          mP1={mP1} setMP1={setMP1}
          mP2={mP2} setMP2={setMP2}
          mFfaIds={mFfaIds} setMFfaIds={setMFfaIds}
          onCancel={() => setShowAdd(false)}
          onSubmit={async () => { await addMatch(); }}
        />
      )}

      {snackbar && (
        <Snackbar text={snackbar.text} onUndo={handleUndo} onDismiss={() => setSnackbar(null)} />
      )}
    </div>
  );
}

/* ── Match hinzufügen: gleiche Felder wie Desktop, aber mit größeren Tap-Zielen ── */
function AddMatchForm({
  allUsers, participants, isFfa, is1v1, isLiga, loading,
  mTitle, setMTitle, mScheduled, setMScheduled, mNotes, setMNotes,
  mRound, setMRound, mP1, setMP1, mP2, setMP2, mFfaIds, setMFfaIds,
  onCancel, onSubmit,
}: {
  allUsers: User[];
  participants: string[];
  isFfa: boolean;
  is1v1: boolean;
  isLiga: boolean;
  loading: boolean;
  mTitle: string; setMTitle: React.Dispatch<React.SetStateAction<string>>;
  mScheduled: string; setMScheduled: React.Dispatch<React.SetStateAction<string>>;
  mNotes: string; setMNotes: React.Dispatch<React.SetStateAction<string>>;
  mRound: number; setMRound: React.Dispatch<React.SetStateAction<number>>;
  mP1: string; setMP1: React.Dispatch<React.SetStateAction<string>>;
  mP2: string; setMP2: React.Dispatch<React.SetStateAction<string>>;
  mFfaIds: string[]; setMFfaIds: React.Dispatch<React.SetStateAction<string[]>>;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
}) {
  // Turnier-Teilnehmer zuerst, Rest der Plattform-User danach — genau wie im Desktop-Formular,
  // damit auf dem Handy nicht erst durch alle User gescrollt werden muss.
  const participantSet = new Set(participants);
  const sortedUsers = [...allUsers].sort((a, b) => {
    const aIn = participantSet.has(a.id) ? 0 : 1;
    const bIn = participantSet.has(b.id) ? 0 : 1;
    return aIn - bIn;
  });

  return (
    <div className="rounded-2xl border border-rose-800/60 bg-rose-950/20 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Neues Match</p>
        <button onClick={onCancel} className="p-1.5 -m-1 text-gray-500 active:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1.5">Titel (optional)</label>
        <input type="text" value={mTitle} onChange={e => setMTitle(e.target.value)}
          placeholder="z.B. Gruppenphase A"
          className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-3"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1.5">Datum &amp; Uhrzeit</label>
        <input type="datetime-local" value={mScheduled} onChange={e => setMScheduled(e.target.value)}
          className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-3"
        />
      </div>

      {is1v1 && (
        <>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">{isLiga ? "Spieltag" : "Runde"}</label>
            <Stepper min={1} value={mRound} onChange={setMRound} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Spieler 1</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
              {sortedUsers.map(u => (
                <button key={u.id} onClick={() => setMP1(u.id === mP1 ? "" : u.id)}
                  className={`flex items-center gap-1.5 p-2.5 rounded-xl text-xs text-left truncate border ${
                    mP1 === u.id ? "bg-teal-900/40 border-teal-600 text-white" : "bg-gray-800 border-gray-700 text-gray-300"
                  }`}>
                  {userName(u)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Spieler 2</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
              {sortedUsers.map(u => (
                <button key={u.id} onClick={() => setMP2(u.id === mP2 ? "" : u.id)}
                  className={`flex items-center gap-1.5 p-2.5 rounded-xl text-xs text-left truncate border ${
                    mP2 === u.id ? "bg-rose-900/40 border-rose-600 text-white" : "bg-gray-800 border-gray-700 text-gray-300"
                  }`}>
                  {userName(u)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {isFfa && (
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Teilnehmer ({mFfaIds.length} gewählt)</label>
          <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
            {sortedUsers.map(u => {
              const checked = mFfaIds.includes(u.id);
              return (
                <button key={u.id}
                  onClick={() => setMFfaIds(checked ? mFfaIds.filter(id => id !== u.id) : [...mFfaIds, u.id])}
                  className={`flex items-center gap-1.5 p-2.5 rounded-xl text-xs text-left truncate border ${
                    checked ? "bg-teal-900/40 border-teal-600 text-white" : "bg-gray-800 border-gray-700 text-gray-300"
                  }`}>
                  {userName(u)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <label className="text-xs text-gray-500 block mb-1.5">Notizen (optional)</label>
        <input type="text" value={mNotes} onChange={e => setMNotes(e.target.value)}
          placeholder="z.B. Map: Verdansk, Server: EU"
          className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-3"
        />
      </div>

      <button onClick={onSubmit} disabled={loading || (isFfa && mFfaIds.length === 0)}
        className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-rose-600 disabled:opacity-40 text-white rounded-xl py-3">
        <PlusIcon className="w-4 h-4" /> Match erstellen
      </button>
    </div>
  );
}

/* ── 1v1 / Bracket / Liga: Duell-Karte mit Score-Steppern ── */
function FocusedDuelCard({
  match, allUsers, isPlayed, supportsDraw, scores1v1, setScores1v1, onResult, onReset,
}: {
  match: Match;
  allUsers: User[];
  isPlayed: boolean;
  supportsDraw: boolean;
  scores1v1: Record<string, { s1: string; s2: string }>;
  setScores1v1: React.Dispatch<React.SetStateAction<Record<string, { s1: string; s2: string }>>>;
  onResult: (winnerId: string | null, isDraw?: boolean) => void;
  onReset: () => void;
}) {
  const p1 = allUsers.find(u => u.id === match.player1Id);
  const p2 = allUsers.find(u => u.id === match.player2Id);
  const s1 = Number(scores1v1[match.id]?.s1 ?? 0);
  const s2 = Number(scores1v1[match.id]?.s2 ?? 0);
  const canPlay = !!p1 && !!p2;

  if (isPlayed) {
    const isDraw = !match.winnerId && !!match.playedAt;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar u={p1} tone="a" />
            <span className={`text-sm truncate ${match.winnerId === match.player1Id ? "text-white font-semibold" : "text-gray-500"}`}>{p1 ? userName(p1) : "TBD"}</span>
          </div>
          <span className="text-lg font-bold text-white tabular-nums shrink-0">{match.score1 ?? "–"} : {match.score2 ?? "–"}</span>
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className={`text-sm truncate ${match.winnerId === match.player2Id ? "text-white font-semibold" : "text-gray-500"}`}>{p2 ? userName(p2) : "TBD"}</span>
            <Avatar u={p2} tone="b" />
          </div>
        </div>
        {isDraw && <p className="text-center text-xs text-amber-400 font-medium">Unentschieden</p>}
        <button onClick={onReset} className="w-full flex items-center justify-center gap-1.5 text-xs text-amber-400 border border-amber-900/40 bg-amber-950/20 rounded-xl py-2">
          <RotateCcw className="w-3.5 h-3.5" /> Ergebnis zurücksetzen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Avatar u={p1} tone="a" />
        <span className="text-sm text-white flex-1 truncate">{p1 ? userName(p1) : "TBD"}</span>
        <Stepper value={s1} onChange={n => setScores1v1(prev => ({ ...prev, [match.id]: { s1: String(n), s2: String(s2) } }))} />
      </div>
      <div className="flex items-center gap-2">
        <Avatar u={p2} tone="b" />
        <span className="text-sm text-white flex-1 truncate">{p2 ? userName(p2) : "TBD"}</span>
        <Stepper value={s2} onChange={n => setScores1v1(prev => ({ ...prev, [match.id]: { s1: String(s1), s2: String(n) } }))} />
      </div>
      <div className="flex gap-2 pt-1">
        <button disabled={!canPlay} onClick={() => onResult(match.player1Id)}
          className="flex-1 text-xs font-semibold bg-teal-700 disabled:opacity-40 text-white rounded-xl py-3 truncate">
          {p1 ? userName(p1) : "?"} gewinnt
        </button>
        <button disabled={!canPlay} onClick={() => onResult(match.player2Id)}
          className="flex-1 text-xs font-semibold bg-teal-700 disabled:opacity-40 text-white rounded-xl py-3 truncate">
          {p2 ? userName(p2) : "?"} gewinnt
        </button>
      </div>
      {supportsDraw && (
        <button disabled={!canPlay} onClick={() => onResult(null, true)}
          className="w-full text-xs font-medium bg-amber-900/30 disabled:opacity-40 text-amber-300 border border-amber-800/40 rounded-xl py-2">
          Unentschieden
        </button>
      )}
      {!canPlay && <p className="text-[11px] text-gray-600 text-center">Wartet noch auf beide Teilnehmer.</p>}
    </div>
  );
}

/* ── FFA / Kooperativ / Ø-Stats: pro Teilnehmer Stat-Stepper statt Zahlenfeld ── */
function FocusedFfaCard({
  match, allUsers, isCoop, trackMatchWin, trackPlacement, placementPoints, visibleStatFields,
  ffaEdits, setFfaField, teamAssign, setTeamAssign, matchWin, setMatchWin, matchWinAll, setMatchWinAll,
  validateTeamAssignment, loading, onSave, onReset,
}: {
  match: Match;
  allUsers: User[];
  isCoop: boolean;
  trackMatchWin: boolean;
  trackPlacement: boolean;
  placementPoints?: Record<string, number> | null;
  visibleStatFields: string[];
  ffaEdits: Record<string, Record<string, Record<string, string>>>;
  setFfaField: (matchId: string, userId: string, field: string, val: string) => void;
  teamAssign: Record<string, Record<string, "A" | "B" | undefined>>;
  setTeamAssign: React.Dispatch<React.SetStateAction<Record<string, Record<string, "A" | "B" | undefined>>>>;
  matchWin: Record<string, "A" | "B" | null>;
  setMatchWin: React.Dispatch<React.SetStateAction<Record<string, "A" | "B" | null>>>;
  matchWinAll: Record<string, boolean>;
  setMatchWinAll: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  validateTeamAssignment: (matchId: string, entries: MatchEntry[]) => string | null;
  loading: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  const ed = ffaEdits[match.id] ?? {};
  const teams = teamAssign[match.id] ?? {};
  const usesTeams = trackMatchWin && match.entries.some(e => e.userId && teams[e.userId]);
  const teamError = validateTeamAssignment(match.id, match.entries);
  const isPlayed = !!match.playedAt;

  function val(entry: MatchEntry, field: string): number {
    const row = ed[entry.userId ?? ""] ?? {};
    if (row[field] !== undefined && row[field] !== "") return Number(row[field]);
    const existing = parseStats(entry.statsJson);
    return typeof existing[field] === "number" ? existing[field] : 0;
  }

  // Anzahl erfasster Werte je Teilnehmer (Platzierung + Stat-Felder) bestimmt die Spaltenzahl des
  // Stat-Grids — bei nur einem Wert bringt eine Mehrspaltigkeit nichts, ab drei Werten lohnt sich auf
  // größeren Handys/Tablets (≥640px, innerhalb dieser Live-Ansicht bis Breakpoint lg) eine dritte Spalte.
  const fieldCount = (trackPlacement ? 1 : 0) + visibleStatFields.length;
  const statGridClass =
    fieldCount <= 1 ? "grid-cols-1" :
    fieldCount === 2 ? "grid-cols-2" :
    "grid-cols-2 sm:grid-cols-3";

  return (
    <div className="space-y-3">
      {/* Match Win: Team-Modus oder "alle zusammen" */}
      {trackMatchWin && (
        usesTeams ? (
          <div className="space-y-1.5">
            <p className="text-[11px] text-gray-400">Match Win <span className="text-gray-600">(Sieger-Team +1)</span></p>
            <div className="flex gap-2">
              <button onClick={() => setMatchWin(prev => ({ ...prev, [match.id]: prev[match.id] === "A" ? null : "A" }))}
                className={`flex-1 text-xs font-semibold rounded-xl py-2.5 border ${matchWin[match.id] === "A" ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400"}`}>
                Team A gewinnt
              </button>
              <button onClick={() => setMatchWin(prev => ({ ...prev, [match.id]: prev[match.id] === "B" ? null : "B" }))}
                className={`flex-1 text-xs font-semibold rounded-xl py-2.5 border ${matchWin[match.id] === "B" ? "bg-rose-600 border-rose-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400"}`}>
                Team B gewinnt
              </button>
            </div>
          </div>
        ) : (
          <label className="flex items-center gap-2.5 text-xs text-gray-300 rounded-xl border border-gray-700 bg-gray-800/60 px-3 py-2.5">
            <input type="checkbox" checked={matchWinAll[match.id] ?? false}
              onChange={e => setMatchWinAll(prev => ({ ...prev, [match.id]: e.target.checked }))}
              className="w-4 h-4 rounded shrink-0" />
            Match Win <span className="text-gray-500">(alle zusammen +1)</span>
          </label>
        )
      )}
      {teamError && (
        <p className="text-[11px] text-amber-300 bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2">⚠️ {teamError}</p>
      )}

      {/* Teilnehmer — auf breiteren Touch-Screens (Tablet) zweispaltig, solange pro Spieler nur wenige Werte erfasst werden */}
      <div className={`grid grid-cols-1 gap-2 items-start ${fieldCount <= 3 && match.entries.length >= 2 ? "md:grid-cols-2" : ""}`}>
        {match.entries.map(entry => {
          const user = allUsers.find(u => u.id === entry.userId);
          const entryTeam = entry.userId ? teams[entry.userId] : undefined;
          return (
            <div key={entry.id} className="rounded-xl border border-gray-700 bg-gray-800/60 p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <Avatar u={user} tone={entryTeam === "B" ? "b" : "a"} />
                <span className="text-sm text-white flex-1 truncate">{user ? userName(user) : "?"}</span>
                {isCoop && trackMatchWin && (
                  <div className="flex gap-1 shrink-0">
                    {(["A", "B"] as const).map(team => (
                      <button key={team} disabled={!entry.userId}
                        onClick={() => {
                          if (!entry.userId) return;
                          const uid = entry.userId;
                          setTeamAssign(prev => ({ ...prev, [match.id]: { ...prev[match.id], [uid]: prev[match.id]?.[uid] === team ? undefined : team } }));
                        }}
                        className={`w-9 h-9 rounded-lg text-xs font-bold border disabled:opacity-30 ${
                          entryTeam === team
                            ? team === "A" ? "bg-blue-600 border-blue-500 text-white" : "bg-rose-600 border-rose-500 text-white"
                            : "bg-gray-900 border-gray-600 text-gray-400"
                        }`}>
                        {team}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className={`grid gap-2 ${statGridClass}`}>
                {trackPlacement && (
                  <div className="flex flex-col gap-1 rounded-lg border border-gray-700 bg-gray-900/60 px-2 py-1.5">
                    <span className="text-xs font-semibold text-gray-200 truncate">Platz</span>
                    <Stepper size="sm" min={0} value={val(entry, PLACEMENT_STAT_KEY)}
                      onChange={n => setFfaField(match.id, entry.userId ?? "", PLACEMENT_STAT_KEY, String(n))} />
                  </div>
                )}
                {visibleStatFields.map(f => (
                  <div key={f} className="flex flex-col gap-1 rounded-lg border border-gray-700 bg-gray-900/60 px-2 py-1.5">
                    <span className="text-xs font-semibold text-gray-200 truncate">{f}</span>
                    <Stepper size="sm" value={val(entry, f)}
                      onChange={n => setFfaField(match.id, entry.userId ?? "", f, String(n))} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {trackPlacement && placementPoints && (
        <p className="text-[10px] text-gray-500">
          Platz → Punkte: {Object.entries(placementPoints).sort(([a], [b]) => Number(a) - Number(b)).map(([p, pts]) => `${p}.=${pts}`).join(" · ")}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={loading || !!teamError}
          className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold bg-teal-700 disabled:opacity-40 text-white rounded-xl py-3">
          <Check className="w-4 h-4" /> Ergebnisse speichern
        </button>
        {isPlayed && (
          <button onClick={onReset} className="flex items-center justify-center gap-1.5 text-xs text-amber-400 border border-amber-900/40 bg-amber-950/20 rounded-xl px-3">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
