"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Plus, Trophy, ChevronDown, ChevronUp, Trash2,
  Users, Gamepad2, Archive, History, Check, PenLine,
} from "lucide-react";
import type { LulAdminSeasons } from "./page";
import GameNameInput from "@/components/GameNameInput";
import StatFieldEditor from "@/components/StatFieldEditor";
import { getGenreIcon } from "@/lib/genre-icons";
import LulSpieltagEditor from "./LulSpieltagEditor";
import LulLegacyImport from "./LulLegacyImport";
import type { User } from "./lul-types";
import { TOURNAMENT_FORMATS, STATUS_LABEL } from "./lul-types";

const STATUS_OPTS = ["upcoming", "active", "finished", "archived"];

export default function LulAdminPanel({
  seasons: initialSeasons,
  allUsers,
}: {
  seasons: LulAdminSeasons;
  allUsers: User[];
}) {
  const [seasons, setSeasons] = useState(initialSeasons);
  const [loading, setLoading] = useState(false);
  const [expandedSeason, setExpandedSeason] = useState<string | null>(
    initialSeasons.find(s => s.status === "active")?.id ?? initialSeasons[0]?.id ?? null
  );
  const [expandedSpieltag, setExpandedSpieltag] = useState<string | null>(null);
  const [editingSpieltagId, setEditingSpieltagId] = useState<string | null>(null);
  const [editGame, setEditGame] = useState("");
  const [editGameType, setEditGameType] = useState("");
  const [editPlatform, setEditPlatform] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editIsSpecial, setEditIsSpecial] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMaxPlayers, setEditMaxPlayers] = useState("");
  const [editTournamentFormat, setEditTournamentFormat] = useState("");
  const [editStatFields, setEditStatFields] = useState<string[]>([]);

  // Create spieltag form
  const [showSpieltagForm, setShowSpieltagForm] = useState<string | null>(null);
  const [stIsSpecial, setStIsSpecial] = useState(false);
  const [stTitle, setStTitle] = useState("");
  const [stDescription, setStDescription] = useState("");
  const [stMaxPlayers, setStMaxPlayers] = useState("");
  const [stGame, setStGame] = useState("");
  const [stGameType, setStGameType] = useState("");
  const [stPlatform, setStPlatform] = useState("");
  const [stDate, setStDate] = useState("");
  const [stP1, setStP1] = useState(10);
  const [stP2, setStP2] = useState(5);
  const [stP3, setStP3] = useState(3);
  const [stTournamentFormat, setStTournamentFormat] = useState("");
  const [stStatFields, setStStatFields] = useState<string[]>([]);

  async function loadSeasons() {
    const res = await fetch("/api/lul/seasons");
    if (!res.ok) return;
    const data: LulAdminSeasons = await res.json();
    setSeasons(data);
  }

  async function deleteSeason(id: string) {
    if (!confirm("Saison und alle Spieltage löschen?")) return;
    await fetch(`/api/lul/seasons/${id}`, { method: "DELETE" });
    toast.success("Saison gelöscht");
    await loadSeasons();
  }

  async function updateSeasonStatus(id: string, status: string) {
    await fetch(`/api/lul/seasons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const label: Record<string, string> = { active: "aktiviert", finished: "abgeschlossen", archived: "archiviert", upcoming: "auf Geplant gesetzt" };
    toast.success(`Saison ${label[status] ?? "aktualisiert"}`);
    await loadSeasons();
  }

  async function createSpieltag(seasonId: string) {
    if (!stIsSpecial && !stGame) return;
    if (stIsSpecial && !stTitle) return;
    setLoading(true);
    const season = seasons.find(s => s.id === seasonId);
    const nextNum = (season?.spieltage.length ?? 0) + 1;
    const res = await fetch("/api/lul/spieltage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seasonId, number: nextNum,
        isSpecial: stIsSpecial,
        title: stIsSpecial ? stTitle : undefined,
        description: stIsSpecial && stDescription ? stDescription : undefined,
        maxPlayers: stIsSpecial && stMaxPlayers ? Number(stMaxPlayers) : undefined,
        tournamentFormat: stTournamentFormat || null,
        statFields: stStatFields.length ? stStatFields : null,
        game: stIsSpecial ? (stGame || null) : stGame,
        gameType: stGameType || null, platform: stPlatform || null,
        scheduledAt: stDate || null,
        pointsConfig: { "1": stP1, "2": stP2, "3": stP3 },
      }),
    });
    setLoading(false);
    if (res.ok) toast.success(`Spieltag ${nextNum} – ${stIsSpecial ? stTitle : stGame} erstellt`);
    else toast.error("Fehler beim Erstellen");
    setShowSpieltagForm(null);
    setStIsSpecial(false); setStTitle(""); setStDescription(""); setStMaxPlayers(""); setStTournamentFormat(""); setStStatFields([]);
    setStGame(""); setStGameType(""); setStPlatform(""); setStDate("");
    await loadSeasons();
  }

  async function saveSpieltag(id: string) {
    if (editIsSpecial && !editTitle) return;
    if (!editIsSpecial && !editGame) return;
    setLoading(true);
    const res = await fetch(`/api/lul/spieltage/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isSpecial: editIsSpecial,
        title: editIsSpecial ? editTitle : null,
        description: editIsSpecial ? (editDescription || null) : null,
        maxPlayers: editIsSpecial && editMaxPlayers ? Number(editMaxPlayers) : null,
        tournamentFormat: editTournamentFormat || null,
        statFields: editStatFields.length ? editStatFields : null,
        game: editIsSpecial ? (editGame || null) : editGame,
        gameType: editGameType || null,
        platform: editPlatform || null,
        scheduledAt: editDate || null,
      }),
    });
    setLoading(false);
    if (res.ok) { toast.success("Spieltag aktualisiert"); setEditingSpieltagId(null); await loadSeasons(); }
    else toast.error("Fehler beim Speichern");
  }

  async function deleteSpieltag(id: string) {
    if (!confirm("Spieltag löschen?")) return;
    await fetch(`/api/lul/spieltage/${id}`, { method: "DELETE" });
    toast.success("Spieltag gelöscht");
    await loadSeasons();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">Saisons</h2>
      </div>

      {/* Season list */}
      {seasons.map(season => {
        const isExpanded = expandedSeason === season.id;
        const statusCls = season.status === "active" ? "text-green-400 bg-green-900/30 border-green-800/40" :
                          season.status === "finished" ? "text-gray-500 bg-gray-800 border-gray-700" :
                          "text-blue-400 bg-blue-900/30 border-blue-800/40";
        return (
          <div key={season.id} className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <button onClick={() => setExpandedSeason(isExpanded ? null : season.id)}
                className="flex-1 flex items-center gap-3 text-left min-w-0">
                {season.isLegacy
                  ? <History className="w-5 h-5 text-purple-400 shrink-0" />
                  : <Trophy className="w-5 h-5 text-amber-400 shrink-0" />}
                <div className="min-w-0">
                  <p className="font-semibold text-white flex items-center gap-2">
                    {season.name ?? `Saison ${season.number}`}
                    {season.isLegacy && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-400 border border-purple-800/30 font-normal">Legacy</span>
                    )}
                  </p>
                  {season.period && <p className="text-xs text-gray-500">{season.period}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${statusCls}`}>
                  {STATUS_LABEL[season.status] ?? season.status}
                </span>
                <span className="text-xs text-gray-600 ml-auto">
                  {season.isLegacy
                    ? "Legacy-Import"
                    : `${season.spieltage.filter(s => s.status === "finished").length}/${season.totalSpieltage} Spieltage`}
                </span>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <select value={season.status} onChange={e => updateSeasonStatus(season.id, e.target.value)}
                  className="text-xs bg-gray-800 border border-gray-700 text-white rounded px-2 py-1">
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
                {season.status === "finished" && (
                  <button onClick={() => {
                    if (confirm(`Saison ${season.number} archivieren?\n\nDie Saison wird gesperrt und in das All-Time Leaderboard übertragen. Keine weiteren Änderungen möglich.`)) {
                      updateSeasonStatus(season.id, "archived");
                    }
                  }}
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-white hover:bg-purple-900/30 border border-purple-800/30 rounded px-2 py-1 transition-colors">
                    <Archive className="w-3 h-3" /> Archivieren
                  </button>
                )}
                <button onClick={() => deleteSeason(season.id)}
                  className="text-gray-600 hover:text-red-500 transition-colors p-1.5 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </div>
            </div>

            {/* Legacy section */}
            {isExpanded && season.isLegacy && (
              <div className="border-t border-white/5 p-4">
                <LulLegacyImport seasonId={season.id} allUsers={allUsers} onRefresh={loadSeasons} />
              </div>
            )}

            {/* Spieltage section */}
            {isExpanded && !season.isLegacy && (
              <div className="border-t border-white/5 p-4 space-y-3">
                {season.spieltage.map(st => {
                  const isStExp = expandedSpieltag === st.id;
                  const stCls = st.status === "finished" ? "text-green-400 bg-green-900/20 border-green-800/30" :
                                st.status === "active"   ? "text-amber-400 bg-amber-900/20 border-amber-800/30" :
                                "text-gray-500 bg-gray-800/50 border-gray-700";
                  return (
                    <div key={st.id} className="border border-gray-700 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/40">
                        {editingSpieltagId === st.id ? (
                          <div className="flex-1 space-y-2">
                            <label className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors ${
                              editIsSpecial ? "bg-violet-900/20 border-violet-700/40" : "bg-gray-800/40 border-gray-700/40"
                            }`}>
                              <input type="checkbox" checked={editIsSpecial} onChange={e => setEditIsSpecial(e.target.checked)} className="rounded" />
                              <span className="text-xs font-medium text-white flex items-center gap-1">⭐ Special Event</span>
                            </label>
                            {editIsSpecial && (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-2">
                                  <label className="text-[10px] text-gray-500 block mb-1">Event-Titel *</label>
                                  <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="z.B. OMA-Geburtstags-Event"
                                    className="w-full text-xs bg-gray-700 border border-violet-700/40 text-white rounded-lg px-2 py-1.5" />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[10px] text-gray-500 block mb-1">Beschreibung (optional)</label>
                                  <input type="text" value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Kurze Beschreibung…"
                                    className="w-full text-xs bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-500 block mb-1">Max. Spieler (optional)</label>
                                  <input type="number" min={1} value={editMaxPlayers} onChange={e => setEditMaxPlayers(e.target.value)} placeholder="z.B. 8"
                                    className="w-full text-xs bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-500 block mb-1">Turnierformat (optional)</label>
                                  <select value={editTournamentFormat} onChange={e => setEditTournamentFormat(e.target.value)}
                                    className="w-full text-xs bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5">
                                    <option value="">– kein Format –</option>
                                    {TOURNAMENT_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                  </select>
                                  {editTournamentFormat && (
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                      {TOURNAMENT_FORMATS.find(f => f.value === editTournamentFormat)?.desc}
                                    </p>
                                  )}
                                </div>
                                {(editTournamentFormat === "ffa" || editTournamentFormat === "coop_stats" || editTournamentFormat === "avg_stats") && (
                                  <div className="col-span-2">
                                    <label className="text-[10px] text-gray-500 block mb-1">Stat-Felder</label>
                                    <StatFieldEditor fields={editStatFields} onChange={setEditStatFields} isAvg={editTournamentFormat === "avg_stats"} />
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-gray-500 block mb-1">Spiel {editIsSpecial ? "(optional)" : "*"}</label>
                                <GameNameInput value={editGame} onChange={setEditGame} placeholder="z.B. Brawlhalla"
                                  className="w-full text-xs bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5" />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500 block mb-1">Datum & Uhrzeit</label>
                                <input type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)}
                                  className="w-full text-xs bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5" />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500 block mb-1">Spieltyp</label>
                                <input type="text" value={editGameType} onChange={e => setEditGameType(e.target.value)} placeholder="z.B. Beat-em Up"
                                  className="w-full text-xs bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5" />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500 block mb-1">Plattform</label>
                                <input type="text" value={editPlatform} onChange={e => setEditPlatform(e.target.value)} placeholder="PC/Konsole"
                                  className="w-full text-xs bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => saveSpieltag(st.id)} disabled={loading || (editIsSpecial ? !editTitle : !editGame)}
                                className="flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg px-2.5 py-1.5">
                                <Check className="w-3 h-3" /> Speichern
                              </button>
                              <button onClick={() => setEditingSpieltagId(null)} className="text-xs text-gray-500 hover:text-white px-2.5 py-1.5">
                                Abbrechen
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setExpandedSpieltag(isStExp ? null : st.id)}
                            className="flex-1 flex items-center gap-3 text-left min-w-0">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                              st.status === "finished" ? "bg-amber-900/40 text-amber-300" : "bg-gray-700 text-gray-400"
                            }`}>{st.number}</div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {st.isSpecial && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-300 border border-violet-700/30 font-medium shrink-0">⭐ Special</span>
                                )}
                                {st.tournamentFormat && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 shrink-0">
                                    {TOURNAMENT_FORMATS.find(f => f.value === st.tournamentFormat)?.label ?? st.tournamentFormat}
                                  </span>
                                )}
                                {!st.isSpecial && (() => { const icon = getGenreIcon(st.gameType); return icon ? <img src={icon.src} alt={icon.alt} className="w-4 h-4 object-contain shrink-0" /> : null; })()}
                                <p className="text-sm text-white font-medium truncate">
                                  {st.isSpecial ? (st.title ?? "Special Event") : (st.game ?? "–")}
                                </p>
                              </div>
                              {st.scheduledAt && (
                                <p className="text-[10px] text-gray-500">
                                  {new Date(st.scheduledAt).toLocaleDateString("de-DE", { day:"2-digit", month:"long", year:"numeric" })}
                                </p>
                              )}
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${stCls}`}>
                              {STATUS_LABEL[st.status] ?? st.status}
                            </span>
                            <span className="text-xs text-gray-600">
                              <Users className="w-3 h-3 inline mr-1" />{st.entries.length}
                            </span>
                          </button>
                        )}
                        {editingSpieltagId !== st.id && (
                          <>
                            <button
                              onClick={() => {
                                setEditIsSpecial(st.isSpecial ?? false);
                                setEditTitle(st.title ?? "");
                                setEditDescription(st.description ?? "");
                                setEditMaxPlayers(st.maxPlayers != null ? String(st.maxPlayers) : "");
                                setEditTournamentFormat(st.tournamentFormat ?? "");
                                setEditStatFields(st.statFields ? JSON.parse(st.statFields) : []);
                                setEditGame(st.game ?? "");
                                setEditGameType(st.gameType ?? "");
                                setEditPlatform(st.platform ?? "");
                                setEditDate(st.scheduledAt ? new Date(st.scheduledAt).toISOString().slice(0, 16) : "");
                                setEditingSpieltagId(st.id);
                              }}
                              className="text-gray-600 hover:text-amber-400 transition-colors p-1 rounded" title="Spieltag bearbeiten">
                              <PenLine className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteSpieltag(st.id)}
                              className="text-gray-600 hover:text-red-500 transition-colors p-1 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {isStExp ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                          </>
                        )}
                      </div>

                      {isStExp && (
                        <LulSpieltagEditor
                          key={st.id + st.status}
                          spieltag={st}
                          allUsers={allUsers}
                          seasonId={season.id}
                          onRefresh={loadSeasons}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Add Spieltag */}
                {showSpieltagForm === season.id ? (
                  <div className="border border-gray-700 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-medium text-white">Neuer Spieltag</p>
                    <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                      stIsSpecial ? "bg-violet-900/20 border-violet-700/40" : "bg-gray-800/40 border-gray-700/40"
                    }`}>
                      <input type="checkbox" checked={stIsSpecial} onChange={e => setStIsSpecial(e.target.checked)} className="rounded" />
                      <div>
                        <p className="text-sm font-medium text-white flex items-center gap-1.5">⭐ Special Event</p>
                        <p className="text-xs text-gray-500 mt-0.5">Eigener Event-Name statt Spiel — zählt als normaler Spieltag.</p>
                      </div>
                    </label>
                    {stIsSpecial && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500 block mb-1">Event-Titel *</label>
                          <input type="text" value={stTitle} onChange={e => setStTitle(e.target.value)} placeholder="z.B. OMA-Geburtstags-Event"
                            className="w-full text-sm bg-gray-800 border border-violet-700/50 text-white rounded-lg px-3 py-2" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500 block mb-1">Beschreibung (optional)</label>
                          <input type="text" value={stDescription} onChange={e => setStDescription(e.target.value)} placeholder="Kurze Beschreibung des Events…"
                            className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Max. Spieler (optional)</label>
                          <input type="number" min={1} value={stMaxPlayers} onChange={e => setStMaxPlayers(e.target.value)} placeholder="z.B. 8"
                            className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Turnierformat (optional)</label>
                          <select value={stTournamentFormat} onChange={e => setStTournamentFormat(e.target.value)}
                            className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2">
                            <option value="">– kein Format –</option>
                            {TOURNAMENT_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                          {stTournamentFormat && (
                            <p className="text-[10px] text-gray-500 mt-1">
                              {TOURNAMENT_FORMATS.find(f => f.value === stTournamentFormat)?.desc}
                            </p>
                          )}
                        </div>
                        {(stTournamentFormat === "ffa" || stTournamentFormat === "coop_stats" || stTournamentFormat === "avg_stats") && (
                          <div className="col-span-2">
                            <label className="text-xs text-gray-500 block mb-1">Stat-Felder</label>
                            <StatFieldEditor fields={stStatFields} onChange={setStStatFields} isAvg={stTournamentFormat === "avg_stats"} />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Spiel / Disziplin {stIsSpecial ? "(optional)" : "*"}</label>
                        <GameNameInput value={stGame} onChange={setStGame} placeholder="z.B. Brawlhalla"
                          className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Spieltyp</label>
                        <input type="text" value={stGameType} onChange={e => setStGameType(e.target.value)} placeholder="z.B. Beat-em Up"
                          className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Plattform</label>
                        <input type="text" value={stPlatform} onChange={e => setStPlatform(e.target.value)} placeholder="PC/Konsole"
                          className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Datum & Uhrzeit</label>
                        <input type="datetime-local" value={stDate} onChange={e => setStDate(e.target.value)}
                          className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Punkte pro Spielplatzierung</label>
                      <div className="flex gap-3">
                        {([["🥇 1.", stP1, setStP1], ["🥈 2.", stP2, setStP2], ["🥉 3.", stP3, setStP3]] as const).map(
                          ([label, val, set]) => (
                            <div key={label} className="flex-1">
                              <label className="text-xs text-gray-600 block mb-1">{label}</label>
                              <input type="number" value={val} min={0}
                                onChange={e => (set as (v: number) => void)(Number(e.target.value))}
                                className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-center"
                              />
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => createSpieltag(season.id)} disabled={loading || (stIsSpecial ? !stTitle : !stGame)}
                        className={`flex items-center gap-2 text-sm disabled:opacity-50 text-white rounded-lg px-3 py-2 ${
                          stIsSpecial ? "bg-violet-700 hover:bg-violet-600" : "bg-amber-700 hover:bg-amber-600"
                        }`}>
                        {stIsSpecial ? <span>⭐</span> : <Gamepad2 className="w-4 h-4" />}
                        {stIsSpecial ? "Special Event erstellen" : "Spieltag erstellen"}
                      </button>
                      <button onClick={() => setShowSpieltagForm(null)} className="text-sm text-gray-500 hover:text-white px-3 py-2">
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowSpieltagForm(season.id)}
                    className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 rounded-xl px-4 py-3 transition-colors">
                    <Plus className="w-4 h-4" /> Spieltag hinzufügen
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
