"use client";
import { useState } from "react";
import { Dices, LayoutGrid, RotateCcw, Swords } from "@/components/icons";
import {
  DEFAULT_ADVANCE_PER_GROUP, computeGroupStandings, groupLabel, groupMatchCount, groupMembers, parseGroupStageConfig,
  resolveGroupCount, suggestedGroupCount, validateGroupStageConfig,
} from "@/lib/tournaments/groupStage";
import { userName, type Tournament, type User } from "./TournamentManager";

export type GroupStageActionBody =
  | {
      generateMatches: "groups"; groupCount: number; advancePerGroup: number; thirdPlaceMatch: boolean;
      groupLegs: 1 | 2; knockoutLegs: 1 | 2; singleLegFinal: boolean;
    }
  | { generateMatches: "reset_groups" | "knockout" | "reset_knockout" };

/**
 * Gruppenphase + K.O. (Format group_knockout) im Turnier-Manager: Auslosung, Gruppentabellen und
 * Übergang in die K.O.-Runde. Die Matches selbst (Ergebnis-Eingabe) rendert der Turnier-Manager.
 */
export default function GroupStagePanel({
  tournament, allUsers, loading, onAction, compact = false,
}: {
  tournament: Tournament;
  allUsers: User[];
  loading: boolean;
  onAction: (body: GroupStageActionBody) => Promise<void>;
  /** Touch-Ansicht: Tabellen ohne Tore-Spalte */
  compact?: boolean;
}) {
  // Ausgelost werden Turnier-Teilnehmer UND angemeldete Spieler (allUsers) — siehe groupStageServer
  const participantCount = new Set([...tournament.participants.map(p => p.userId), ...allUsers.map(u => u.id)]).size;
  const [groupCount, setGroupCount] = useState(() => suggestedGroupCount(participantCount));
  const [advancePerGroup, setAdvancePerGroup] = useState(DEFAULT_ADVANCE_PER_GROUP);
  const [thirdPlaceMatch, setThirdPlaceMatch] = useState(false);
  const [groupLegs, setGroupLegs] = useState<1 | 2>(1);
  const [knockoutLegs, setKnockoutLegs] = useState<1 | 2>(1);
  const [singleLegFinal, setSingleLegFinal] = useState(true);

  const cfg = parseGroupStageConfig(tournament.groupStageJson);
  const groupMatches    = tournament.matches.filter(m => m.groupIndex != null);
  const knockoutMatches = tournament.matches.filter(m => m.groupIndex == null);
  const findUser = (id: string) =>
    tournament.participants.find(p => p.userId === id)?.user ?? allUsers.find(u => u.id === id);

  // ── 1. Noch nicht ausgelost ──────────────────────────────────────────
  if (tournament.matches.length === 0) {
    const error = validateGroupStageConfig(participantCount, { groupCount, advancePerGroup });
    const minSize = Math.floor(participantCount / Math.max(groupCount, 1));
    const maxSize = Math.ceil(participantCount / Math.max(groupCount, 1));
    const sizes = Array.from({ length: groupCount }, (_, i) => (i < participantCount % groupCount ? maxSize : minSize));
    const plannedGroupMatches = groupMatchCount(sizes, groupLegs);
    const qualifiers = groupCount * advancePerGroup;
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Dices className="w-4 h-4 text-rose-400" />
          <p className="text-sm font-medium text-white">Gruppen auslosen</p>
        </div>
        <p className="text-xs text-gray-500">
          Bis zu {participantCount} angemeldete Spieler werden zufällig auf die Gruppen verteilt (bei aktivem
          Check-in nur Eingecheckte). In jeder Gruppe spielt
          jeder gegen jeden (Sieg 3, Unentschieden 1 Punkt), die Besten jeder Gruppe ziehen in die K.O.-Runde ein.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-500 block mb-1">Anzahl Gruppen</span>
            <input type="number" min={1} max={Math.max(1, Math.floor(participantCount / 2))} value={groupCount}
              onChange={e => setGroupCount(Math.max(1, Number(e.target.value) || 1))}
              className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500 block mb-1">Weiter pro Gruppe</span>
            <input type="number" min={1} value={advancePerGroup}
              onChange={e => setAdvancePerGroup(Math.max(1, Number(e.target.value) || 1))}
              className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
          <input type="checkbox" checked={groupLegs === 2} onChange={e => setGroupLegs(e.target.checked ? 2 : 1)} className="rounded" />
          Gruppenphase mit Hin- und Rückspiel (jede Paarung zweimal, Heimrecht getauscht)
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
          <input type="checkbox" checked={knockoutLegs === 2} onChange={e => setKnockoutLegs(e.target.checked ? 2 : 1)} className="rounded" />
          K.O.-Runde mit Hin- und Rückspiel (Gesamtergebnis entscheidet)
        </label>
        {knockoutLegs === 2 && (
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none pl-6">
            <input type="checkbox" checked={singleLegFinal} onChange={e => setSingleLegFinal(e.target.checked)} className="rounded" />
            Finale trotzdem als Einzelspiel
          </label>
        )}
        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
          <input type="checkbox" checked={thirdPlaceMatch} onChange={e => setThirdPlaceMatch(e.target.checked)} className="rounded" />
          Spiel um Platz 3 (Verlierer der Halbfinals)
        </label>
        {error ? (
          <p className="text-[11px] text-amber-500">{error}</p>
        ) : (
          <p className="text-[11px] text-gray-500">
            → {groupCount} {groupCount === 1 ? "Gruppe" : "Gruppen"} à {minSize === maxSize ? minSize : `${minSize}–${maxSize}`} Spieler
            · {plannedGroupMatches} Gruppenspiele{groupLegs === 2 ? " (Hin & Rück)" : ""} · {qualifiers} Spieler in der K.O.-Runde
            {knockoutLegs === 2 ? (singleLegFinal ? " (Hin & Rück, Finale einfach)" : " (Hin & Rück)") : ""}
            {qualifiers & (qualifiers - 1) ? " (Freilose für die besten Gruppensieger)" : ""}
          </p>
        )}
        <button type="button" disabled={loading || !!error}
          onClick={() => onAction({ generateMatches: "groups", groupCount, advancePerGroup, thirdPlaceMatch, groupLegs, knockoutLegs, singleLegFinal })}
          className="flex items-center gap-1.5 text-xs bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg px-3 py-2 w-full justify-center transition-colors">
          <Dices className="w-3.5 h-3.5" /> Gruppen auslosen &amp; Spielplan erstellen
        </button>
      </div>
    );
  }

  // ── 2. Gruppentabellen + Übergang in die K.O.-Runde ──────────────────
  const groupCountResolved = resolveGroupCount(cfg, tournament.participants);
  const advance = cfg?.advancePerGroup ?? DEFAULT_ADVANCE_PER_GROUP;
  const standings = computeGroupStandings(groupMembers(tournament.participants, groupCountResolved), groupMatches);
  const openGroupMatches = groupMatches.filter(m => !m.playedAt || m.resultConfirmed === false).length;
  const anyPlayed = tournament.matches.some(m => m.playedAt);
  const knockoutPlayed = knockoutMatches.some(m => m.playedAt);
  const withoutGroup = tournament.participants.filter(p => p.groupIndex == null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5" /> Gruppenphase · {advance} pro Gruppe weiter
          {cfg?.groupLegs === 2 && " · Hin & Rück"}
          {cfg?.knockoutLegs === 2 && ` · K.O. Hin & Rück${cfg.singleLegFinal ? " (Finale einfach)" : ""}`}
        </p>
        {!anyPlayed && (
          <button type="button" disabled={loading} onClick={() => onAction({ generateMatches: "reset_groups" })}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-amber-400 transition-colors">
            <RotateCcw className="w-3 h-3" /> Neu auslosen
          </button>
        )}
      </div>

      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
        {standings.map((table, gi) => (
          <div key={gi} className="rounded-lg border border-gray-700 overflow-hidden">
            <p className="px-3 py-1.5 bg-gray-800 border-b border-gray-700 text-xs font-medium text-white">{groupLabel(gi)}</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-gray-500 uppercase">
                  <th className="text-left px-2 py-1 font-medium">#</th>
                  <th className="text-left px-2 py-1 font-medium">Spieler</th>
                  <th className="text-center px-1 py-1 font-medium" title="Spiele">Sp</th>
                  <th className="text-center px-1 py-1 font-medium" title="Siege-Unentschieden-Niederlagen">S-U-N</th>
                  {!compact && <th className="text-center px-1 py-1 font-medium">Tore</th>}
                  <th className="text-right px-2 py-1 font-medium">Pkt</th>
                </tr>
              </thead>
              <tbody>
                {table.map((s, i) => {
                  const u = findUser(s.userId);
                  const qualifies = i < advance;
                  return (
                    <tr key={s.userId} className={`border-t border-gray-800 ${qualifies ? "bg-emerald-900/15" : ""}`}>
                      <td className={`px-2 py-1 ${qualifies ? "text-emerald-400" : "text-gray-600"}`}>{i + 1}</td>
                      <td className="px-2 py-1 text-white truncate max-w-[120px]">{u ? userName(u) : "?"}</td>
                      <td className="text-center px-1 py-1 text-gray-400">{s.played}</td>
                      <td className="text-center px-1 py-1 text-gray-400">{s.w}-{s.d}-{s.l}</td>
                      {!compact && (
                        <td className="text-center px-1 py-1 text-gray-400 font-mono">
                          {s.scored}:{s.conceded}
                        </td>
                      )}
                      <td className="text-right px-2 py-1 text-white font-semibold">{s.pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {withoutGroup.length > 0 && (
        <p className="text-[11px] text-amber-500">
          Ohne Gruppe (nach der Auslosung hinzugefügt, spielen nicht mit): {withoutGroup.map(p => userName(p.user)).join(", ")}
        </p>
      )}

      {knockoutMatches.length === 0 ? (
        <button type="button" disabled={loading || openGroupMatches > 0}
          onClick={() => onAction({ generateMatches: "knockout" })}
          className="flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg px-3 py-2 w-full justify-center transition-colors">
          <Swords className="w-3.5 h-3.5" />
          {openGroupMatches > 0
            ? `K.O.-Runde erstellen (noch ${openGroupMatches} Gruppenspiel${openGroupMatches === 1 ? "" : "e"} offen)`
            : "K.O.-Runde aus den Tabellen erstellen"}
        </button>
      ) : !knockoutPlayed && (
        <button type="button" disabled={loading} onClick={() => onAction({ generateMatches: "reset_knockout" })}
          className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-amber-400 transition-colors">
          <RotateCcw className="w-3 h-3" /> K.O.-Runde verwerfen (z.B. nach einer Ergebnis-Korrektur in der Gruppe)
        </button>
      )}
    </div>
  );
}
