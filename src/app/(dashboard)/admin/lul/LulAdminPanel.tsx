"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trophy, ChevronDown, ChevronUp, Trash2, Check, Save,
  Users, Eye, Gamepad2, Lock, RefreshCw,
} from "lucide-react";

type User = { id: string; name: string | null; username: string | null; image: string | null };
type LulEntry = {
  id: string; userId: string; role: string;
  roundScores: string | null; totalGameScore: number;
  placement: number | null; gameWinner: boolean;
  communityChamp: boolean; trostpreis: boolean;
  voted: boolean; dominionBonus: boolean; lulPoints: number;
  user: User;
};
type LulSpieltag = {
  id: string; number: number; game: string; gameType: string | null;
  platform: string | null; scheduledAt: string | null; status: string;
  pointsConfig: string | null; entries: LulEntry[];
};
type LulSeason = {
  id: string; number: number; name: string | null; period: string | null;
  totalSpieltage: number; status: string; spieltage: LulSpieltag[];
};

const uname = (u: User) => u.username ?? u.name ?? "?";
const MEDAL = ["🥇", "🥈", "🥉"];

function LulSpieltagEditor({
  spieltag,
  allUsers,
  seasonId,
  onRefresh,
}: {
  spieltag: LulSpieltag;
  allUsers: User[];
  seasonId: string;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<"players" | "spectators" | "awards">("players");
  const [loading, setLoading] = useState(false);

  // Draft state
  const initEntries = () => {
    const map: Record<string, {
      role: "player" | "spectator";
      rounds: string[];
      placement: string;
      gameWinner: boolean;
      communityChamp: boolean;
      trostpreis: boolean;
      voted: boolean;
    }> = {};
    for (const e of spieltag.entries) {
      const scores: number[] = e.roundScores ? JSON.parse(e.roundScores) : [];
      map[e.userId] = {
        role: e.role as "player" | "spectator",
        rounds: Array.from({ length: 10 }, (_, i) => scores[i] != null ? String(scores[i]) : ""),
        placement: e.placement != null ? String(e.placement) : "",
        gameWinner: e.gameWinner,
        communityChamp: e.communityChamp,
        trostpreis: e.trostpreis,
        voted: e.voted,
      };
    }
    return map;
  };

  const [entries, setEntries] = useState(initEntries);
  const [playerIds, setPlayerIds] = useState<string[]>(
    spieltag.entries.filter(e => e.role === "player").map(e => e.userId)
  );
  const [spectatorIds, setSpectatorIds] = useState<string[]>(
    spieltag.entries.filter(e => e.role === "spectator").map(e => e.userId)
  );

  function ensureEntry(userId: string, role: "player" | "spectator") {
    if (!entries[userId]) {
      setEntries(prev => ({
        ...prev,
        [userId]: { role, rounds: Array(10).fill(""), placement: "", gameWinner: false, communityChamp: false, trostpreis: false, voted: false },
      }));
    }
  }

  function togglePlayer(userId: string) {
    if (playerIds.includes(userId)) {
      setPlayerIds(prev => prev.filter(id => id !== userId));
      setEntries(prev => { const n = { ...prev }; delete n[userId]; return n; });
    } else {
      setPlayerIds(prev => [...prev, userId]);
      ensureEntry(userId, "player");
    }
  }

  function toggleSpectator(userId: string) {
    if (spectatorIds.includes(userId)) {
      setSpectatorIds(prev => prev.filter(id => id !== userId));
      setEntries(prev => { const n = { ...prev }; delete n[userId]; return n; });
    } else {
      setSpectatorIds(prev => [...prev, userId]);
      ensureEntry(userId, "spectator");
    }
  }

  function setRound(userId: string, ri: number, val: string) {
    setEntries(prev => ({
      ...prev,
      [userId]: { ...prev[userId], rounds: prev[userId].rounds.map((r, i) => i === ri ? val : r) },
    }));
  }

  function setField<K extends keyof typeof entries[string]>(userId: string, field: K, val: typeof entries[string][K]) {
    setEntries(prev => ({ ...prev, [userId]: { ...prev[userId], [field]: val } }));
  }

  function autoPlacement() {
    const scored = playerIds.map(uid => {
      const r = entries[uid];
      const total = r ? r.rounds.reduce((s, v) => s + (Number(v) || 0), 0) : 0;
      return { uid, total };
    }).sort((a, b) => b.total - a.total);

    setEntries(prev => {
      const next = { ...prev };
      scored.forEach(({ uid }, i) => {
        if (next[uid]) next[uid] = { ...next[uid], placement: String(i + 1) };
      });
      return next;
    });
  }

  function autoGameWinner() {
    const scored = playerIds.map(uid => {
      const r = entries[uid];
      const total = r ? r.rounds.reduce((s, v) => s + (Number(v) || 0), 0) : 0;
      return { uid, total };
    }).sort((a, b) => b.total - a.total);

    if (scored.length > 0) {
      const winnerId = scored[0].uid;
      setEntries(prev => {
        const next = { ...prev };
        for (const uid of playerIds) {
          if (next[uid]) next[uid] = { ...next[uid], gameWinner: uid === winnerId };
        }
        return next;
      });
    }
  }

  async function saveDraft() {
    setLoading(true);
    const allIds = [...playerIds, ...spectatorIds];
    const payload = allIds.map(userId => {
      const e = entries[userId];
      const role = playerIds.includes(userId) ? "player" : "spectator";
      const scores = (e?.rounds ?? []).map(Number).filter((_, i) => i < (e?.rounds.findLastIndex(r => r !== "") ?? -1) + 1);
      return {
        userId,
        role,
        roundScores: scores,
        placement: e?.placement ? Number(e.placement) : null,
        gameWinner: e?.gameWinner ?? false,
        communityChamp: e?.communityChamp ?? false,
        trostpreis: e?.trostpreis ?? false,
        voted: e?.voted ?? false,
      };
    });
    await fetch(`/api/lul/spieltage/${spieltag.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: payload }),
    });
    setLoading(false);
    onRefresh();
  }

  async function finalize() {
    if (!confirm(`Spieltag ${spieltag.number} (${spieltag.game}) wirklich finalisieren? LUL-Punkte werden berechnet und können nicht mehr geändert werden.`)) return;
    setLoading(true);
    await saveDraft();
    await fetch(`/api/lul/spieltage/${spieltag.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finalize: true }),
    });
    setLoading(false);
    onRefresh();
  }

  const isFinished = spieltag.status === "finished";

  if (isFinished) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
          <Lock className="w-4 h-4" /> Abgeschlossen – Ergebnisse finalisiert
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700 text-gray-500">
                <th className="text-left py-1.5 pr-3">Spieler</th>
                <th className="text-center px-2">Rolle</th>
                <th className="text-center px-2">Platz</th>
                <th className="text-center px-2">Game</th>
                <th className="text-center px-2">Champ</th>
                <th className="text-center px-2">Trost</th>
                <th className="text-center px-2">Vote</th>
                <th className="text-center px-2">Bonus</th>
                <th className="text-right px-2 font-semibold">LUL Pkt</th>
              </tr>
            </thead>
            <tbody>
              {spieltag.entries.sort((a,b) => b.lulPoints - a.lulPoints).map(e => (
                <tr key={e.id} className="border-b border-gray-800">
                  <td className="py-2 pr-3 text-white whitespace-nowrap">{uname(e.user)}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${e.role === "player" ? "bg-blue-900/40 text-blue-300" : "bg-purple-900/40 text-purple-300"}`}>
                      {e.role === "player" ? "Spieler" : "Zuschauer"}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center text-gray-300">{e.placement != null ? (e.placement <= 3 ? MEDAL[e.placement-1] : e.placement) : "–"}</td>
                  <td className="py-2 px-2 text-center">{e.gameWinner && "🏆"}</td>
                  <td className="py-2 px-2 text-center">{e.communityChamp && "👑"}</td>
                  <td className="py-2 px-2 text-center">{e.trostpreis && "🎁"}</td>
                  <td className="py-2 px-2 text-center">{e.voted && "✅"}</td>
                  <td className="py-2 px-2 text-center">{e.dominionBonus && "🔥"}</td>
                  <td className="py-2 px-2 text-right font-bold text-amber-400">{e.lulPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit">
        {(["players", "spectators", "awards"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t ? "bg-gray-700 text-white" : "text-gray-500 hover:text-white"
            }`}>
            {t === "players" ? "🎮 Mitspieler" : t === "spectators" ? "👁️ Zuschauer" : "🗳️ Umfrage"}
          </button>
        ))}
      </div>

      {/* Players tab */}
      {tab === "players" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-gray-400">Mitspieler auswählen und Runden-Ergebnisse eintragen:</p>
            <button onClick={autoPlacement}
              className="text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/30 px-2 py-1 rounded transition-colors">
              Platzierung auto
            </button>
            <button onClick={autoGameWinner}
              className="text-xs text-amber-400 hover:text-amber-300 bg-amber-900/20 hover:bg-amber-900/30 px-2 py-1 rounded transition-colors">
              Game Winner auto
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
            {allUsers.map(u => (
              <label key={u.id} className="flex items-center gap-1.5 p-1.5 rounded bg-gray-800 hover:bg-gray-700 cursor-pointer text-xs">
                <input type="checkbox" checked={playerIds.includes(u.id)} onChange={() => togglePlayer(u.id)} className="rounded shrink-0" />
                <span className="text-white truncate">{uname(u)}</span>
              </label>
            ))}
          </div>

          {playerIds.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table className="w-full text-xs min-w-[600px]">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-700 text-gray-400">
                    <th className="text-left px-3 py-2">Spieler</th>
                    {Array.from({length: 10}, (_, i) => (
                      <th key={i} className="text-center px-1 py-2 w-12">R{i+1}</th>
                    ))}
                    <th className="text-center px-2 py-2">∑</th>
                    <th className="text-center px-2 py-2">Platz</th>
                    <th className="text-center px-2 py-2">🏆</th>
                  </tr>
                </thead>
                <tbody>
                  {playerIds.map(uid => {
                    const u = allUsers.find(u => u.id === uid);
                    const e = entries[uid];
                    if (!u || !e) return null;
                    const total = e.rounds.reduce((s, v) => s + (Number(v) || 0), 0);
                    return (
                      <tr key={uid} className="border-b border-gray-800 last:border-0">
                        <td className="px-3 py-1.5 text-white whitespace-nowrap font-medium">{uname(u)}</td>
                        {e.rounds.map((val, ri) => (
                          <td key={ri} className="px-1 py-1">
                            <input type="number" min={0} value={val}
                              onChange={ev => setRound(uid, ri, ev.target.value)}
                              className="w-11 bg-gray-700 border border-gray-600 text-white rounded px-1 py-0.5 text-center text-xs"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1.5 text-center font-bold text-amber-400 tabular-nums">{total}</td>
                        <td className="px-2 py-1">
                          <input type="number" min={1} value={e.placement}
                            onChange={ev => setField(uid, "placement", ev.target.value)}
                            className="w-12 bg-gray-700 border border-gray-600 text-white rounded px-1 py-0.5 text-center text-xs"
                          />
                        </td>
                        <td className="px-2 py-1 text-center">
                          <input type="checkbox" checked={e.gameWinner}
                            onChange={ev => setField(uid, "gameWinner", ev.target.checked)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Spectators tab */}
      {tab === "spectators" && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Zuschauer auswählen (Discord- oder Twitch-Teilnehmer):</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
            {allUsers.filter(u => !playerIds.includes(u.id)).map(u => (
              <label key={u.id} className="flex items-center gap-1.5 p-1.5 rounded bg-gray-800 hover:bg-gray-700 cursor-pointer text-xs">
                <input type="checkbox" checked={spectatorIds.includes(u.id)} onChange={() => toggleSpectator(u.id)} className="rounded shrink-0" />
                <span className="text-white truncate">{uname(u)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Awards tab */}
      {tab === "awards" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Community Champ */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">👑 Community-Champ (Zuschauer-Umfrage)</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {spectatorIds.map(uid => {
                  const u = allUsers.find(u => u.id === uid);
                  const e = entries[uid];
                  if (!u || !e) return null;
                  return (
                    <label key={uid} className="flex items-center gap-2 p-2 rounded bg-gray-800 hover:bg-gray-750 cursor-pointer text-xs">
                      <input type="radio" name="communityChamp"
                        checked={!!e.communityChamp}
                        onChange={() => {
                          setEntries(prev => {
                            const next = { ...prev };
                            for (const id of spectatorIds) {
                              if (next[id]) next[id] = { ...next[id], communityChamp: id === uid };
                            }
                            return next;
                          });
                        }}
                      />
                      <span className="text-white">{uname(u)}</span>
                    </label>
                  );
                })}
                {spectatorIds.length === 0 && <p className="text-xs text-gray-600">Keine Zuschauer eingetragen.</p>}
              </div>
            </div>

            {/* Trostpreis */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">🎁 Trostpreis (Mitspieler-Umfrage)</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {playerIds.filter(uid => !entries[uid]?.gameWinner).map(uid => {
                  const u = allUsers.find(u => u.id === uid);
                  const e = entries[uid];
                  if (!u || !e) return null;
                  return (
                    <label key={uid} className="flex items-center gap-2 p-2 rounded bg-gray-800 hover:bg-gray-750 cursor-pointer text-xs">
                      <input type="radio" name="trostpreis"
                        checked={!!e.trostpreis}
                        onChange={() => {
                          setEntries(prev => {
                            const next = { ...prev };
                            for (const id of playerIds) {
                              if (next[id]) next[id] = { ...next[id], trostpreis: id === uid };
                            }
                            return next;
                          });
                        }}
                      />
                      <span className="text-white">{uname(u)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Vote */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">✅ Vote-Teilnehmer (haben abgestimmt)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
              {[...playerIds, ...spectatorIds].map(uid => {
                const u = allUsers.find(u => u.id === uid);
                const e = entries[uid];
                if (!u || !e) return null;
                return (
                  <label key={uid} className="flex items-center gap-1.5 p-1.5 rounded bg-gray-800 hover:bg-gray-700 cursor-pointer text-xs">
                    <input type="checkbox" checked={!!e.voted}
                      onChange={ev => setField(uid, "voted", ev.target.checked)}
                      className="rounded shrink-0"
                    />
                    <span className="text-white truncate">{uname(u)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2 border-t border-gray-700">
        <button onClick={saveDraft} disabled={loading}
          className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg px-3 py-2">
          <Save className="w-3.5 h-3.5" /> Entwurf speichern
        </button>
        <button onClick={finalize} disabled={loading}
          className="flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg px-3 py-2">
          <Lock className="w-3.5 h-3.5" /> Spieltag finalisieren
        </button>
      </div>
    </div>
  );
}

export default function LulAdminPanel({
  seasons: initialSeasons,
  allUsers,
}: {
  seasons: LulSeason[];
  allUsers: User[];
}) {
  const router = useRouter();
  const [seasons, setSeasons] = useState(initialSeasons);
  const [loading, setLoading] = useState(false);
  const [expandedSeason, setExpandedSeason] = useState<string | null>(
    initialSeasons.find(s => s.status === "active")?.id ?? initialSeasons[0]?.id ?? null
  );
  const [expandedSpieltag, setExpandedSpieltag] = useState<string | null>(null);

  // Create season form
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [sNumber, setSNumber] = useState(initialSeasons.length + 1);
  const [sName, setSName] = useState("");
  const [sPeriod, setSPeriod] = useState("");
  const [sTotalSpieltage, setSTotalSpieltage] = useState(8);

  // Create spieltag form
  const [showSpieltagForm, setShowSpieltagForm] = useState<string | null>(null);
  const [stGame, setStGame] = useState("");
  const [stGameType, setStGameType] = useState("");
  const [stPlatform, setStPlatform] = useState("");
  const [stDate, setStDate] = useState("");
  const [stP1, setStP1] = useState(10);
  const [stP2, setStP2] = useState(5);
  const [stP3, setStP3] = useState(3);

  async function loadSeasons() {
    const res = await fetch("/api/lul/seasons");
    const data = await res.json();
    setSeasons(data);
    router.refresh();
  }

  async function createSeason() {
    setLoading(true);
    await fetch("/api/lul/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: sNumber, name: sName || null, period: sPeriod || null, totalSpieltage: sTotalSpieltage }),
    });
    setLoading(false);
    setShowSeasonForm(false);
    await loadSeasons();
  }

  async function deleteSeason(id: string) {
    if (!confirm("Saison und alle Spieltage löschen?")) return;
    await fetch(`/api/lul/seasons/${id}`, { method: "DELETE" });
    await loadSeasons();
  }

  async function updateSeasonStatus(id: string, status: string) {
    await fetch(`/api/lul/seasons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadSeasons();
  }

  async function createSpieltag(seasonId: string) {
    if (!stGame) return;
    setLoading(true);
    const season = seasons.find(s => s.id === seasonId);
    const nextNum = (season?.spieltage.length ?? 0) + 1;
    await fetch("/api/lul/spieltage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seasonId, number: nextNum, game: stGame,
        gameType: stGameType || null, platform: stPlatform || null,
        scheduledAt: stDate || null,
        pointsConfig: { "1": stP1, "2": stP2, "3": stP3 },
      }),
    });
    setLoading(false);
    setShowSpieltagForm(null);
    setStGame(""); setStGameType(""); setStPlatform(""); setStDate("");
    await loadSeasons();
  }

  async function deleteSpieltag(id: string) {
    if (!confirm("Spieltag löschen?")) return;
    await fetch(`/api/lul/spieltage/${id}`, { method: "DELETE" });
    await loadSeasons();
  }

  const STATUS_OPTS = ["upcoming", "active", "finished"];
  const STATUS_LABEL: Record<string, string> = { upcoming: "Geplant", active: "Läuft", finished: "Beendet" };

  return (
    <div className="space-y-4">
      {/* Create season */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">Saisons</h2>
        <button onClick={() => setShowSeasonForm(!showSeasonForm)}
          className="flex items-center gap-1.5 text-xs bg-amber-700 hover:bg-amber-600 text-white rounded-lg px-3 py-2">
          <Plus className="w-3.5 h-3.5" /> Neue Saison
        </button>
      </div>

      {showSeasonForm && (
        <div className="border border-amber-800/40 bg-amber-950/20 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-white">Neue Saison anlegen</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Saison-Nummer</label>
              <input type="number" min={1} value={sNumber} onChange={e => setSNumber(Number(e.target.value))}
                className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Anzahl Spieltage</label>
              <input type="number" min={1} value={sTotalSpieltage} onChange={e => setSTotalSpieltage(Number(e.target.value))}
                className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Name (optional)</label>
              <input type="text" value={sName} onChange={e => setSName(e.target.value)} placeholder="Level-Up-League"
                className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Zeitraum (optional)</label>
              <input type="text" value={sPeriod} onChange={e => setSPeriod(e.target.value)} placeholder="Mai 2026 – Dez 2026"
                className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
            </div>
          </div>
          <button onClick={createSeason} disabled={loading}
            className="flex items-center gap-2 text-sm bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg px-4 py-2">
            <Trophy className="w-4 h-4" /> Saison erstellen
          </button>
        </div>
      )}

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
                <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-white">{season.name ?? `Saison ${season.number}`}</p>
                  {season.period && <p className="text-xs text-gray-500">{season.period}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${statusCls}`}>
                  {STATUS_LABEL[season.status] ?? season.status}
                </span>
                <span className="text-xs text-gray-600 ml-auto">
                  {season.spieltage.filter(s => s.status === "finished").length}/{season.totalSpieltage} Spieltage
                </span>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <select value={season.status} onChange={e => updateSeasonStatus(season.id, e.target.value)}
                  className="text-xs bg-gray-800 border border-gray-700 text-white rounded px-2 py-1">
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
                <button onClick={() => deleteSeason(season.id)}
                  className="text-gray-600 hover:text-red-500 transition-colors p-1.5 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-white/5 p-4 space-y-3">
                {/* Spieltage list */}
                {season.spieltage.map(st => {
                  const isStExp = expandedSpieltag === st.id;
                  const stCls = st.status === "finished" ? "text-green-400 bg-green-900/20 border-green-800/30" :
                                st.status === "active"   ? "text-amber-400 bg-amber-900/20 border-amber-800/30" :
                                "text-gray-500 bg-gray-800/50 border-gray-700";
                  return (
                    <div key={st.id} className="border border-gray-700 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/40">
                        <button onClick={() => setExpandedSpieltag(isStExp ? null : st.id)}
                          className="flex-1 flex items-center gap-3 text-left min-w-0">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                            st.status === "finished" ? "bg-amber-900/40 text-amber-300" : "bg-gray-700 text-gray-400"
                          }`}>{st.number}</div>
                          <div className="min-w-0">
                            <p className="text-sm text-white font-medium">{st.game}</p>
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
                        <button onClick={() => deleteSpieltag(st.id)}
                          className="text-gray-600 hover:text-red-500 transition-colors p-1 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isStExp ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
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
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Spiel / Disziplin *</label>
                        <input type="text" value={stGame} onChange={e => setStGame(e.target.value)} placeholder="z.B. Brawlhalla"
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
                      <button onClick={() => createSpieltag(season.id)} disabled={loading || !stGame}
                        className="flex items-center gap-2 text-sm bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg px-3 py-2">
                        <Gamepad2 className="w-4 h-4" /> Spieltag erstellen
                      </button>
                      <button onClick={() => setShowSpieltagForm(null)}
                        className="text-sm text-gray-500 hover:text-white px-3 py-2">
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
