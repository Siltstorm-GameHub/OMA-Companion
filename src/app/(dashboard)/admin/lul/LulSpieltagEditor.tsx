"use client";
import { useState, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import { fireConfetti } from "@/components/ConfettiTrigger";
import {
  Save, Trophy, Lock, RefreshCw, Plus, X,
  Gamepad2, Eye, Vote, Search,
} from "lucide-react";
import { UserPickerSheet } from "@/components/UserPickerSheet";
import type { LulSpieltag, User } from "./lul-types";
import { uname, MEDAL } from "./lul-types";

type LulEntry = LulSpieltag["entries"][number];
type LulMatch = { id: string; p1: string; p2: string; s1: string; s2: string; winner: string };

export default function LulSpieltagEditor({
  spieltag, allUsers, onRefresh,
}: {
  spieltag: LulSpieltag;
  allUsers: User[];
  seasonId: string;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<"players" | "spectators" | "awards">("players");
  const [loading, setLoading] = useState(false);
  const TAB_ORDER: ("players" | "spectators" | "awards")[] = ["players", "spectators", "awards"];
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; }, []);
  const onTouchEnd   = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 50) return;
    const idx = TAB_ORDER.indexOf(tab);
    if (dx < 0 && idx < TAB_ORDER.length - 1) setTab(TAB_ORDER[idx + 1]);
    if (dx > 0 && idx > 0)                    setTab(TAB_ORDER[idx - 1]);
    touchStartX.current = null;
  }, [tab]);
  const [playerSearch, setPlayerSearch]     = useState("");
  const [spectatorSearch, setSpectatorSearch] = useState("");
  const [voterSearch, setVoterSearch]       = useState("");

  const fmt = spieltag.tournamentFormat ?? "";
  const statFieldsList: string[] = (() => { try { return JSON.parse(spieltag.statFields ?? "[]"); } catch { return []; } })();
  const isStatFmt = fmt === "ffa" || fmt === "coop_stats" || fmt === "avg_stats";
  const is1v1Fmt  = fmt === "single_elimination" || fmt === "double_elimination" || fmt === "round_robin" || fmt === "liga";

  // ── Draft state ──────────────────────────────────────────────────────────────
  const initNumRounds = () => {
    let max = 10;
    for (const e of spieltag.entries) {
      const scores: number[] = e.roundScores ? JSON.parse(e.roundScores) : [];
      if (scores.length > max) max = scores.length;
    }
    return max;
  };
  const [numRounds, setNumRounds] = useState(initNumRounds);

  const initEntries = () => {
    const map: Record<string, {
      role: "player" | "spectator" | "voter";
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
        role: e.role as "player" | "spectator" | "voter",
        rounds: Array.from({ length: numRounds }, (_, i) => scores[i] != null ? String(scores[i]) : ""),
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
  const [playerIds, setPlayerIds]       = useState<string[]>(spieltag.entries.filter(e => e.role === "player").map(e => e.userId));
  const [spectatorIds, setSpectatorIds] = useState<string[]>(spieltag.entries.filter(e => e.role === "spectator").map(e => e.userId));
  const [voterIds, setVoterIds]         = useState<string[]>(spieltag.entries.filter(e => e.role === "voter").map(e => e.userId));

  const [numStatRounds, setNumStatRounds] = useState<number>(() => {
    for (const e of spieltag.entries) {
      if (e.statsJson) {
        try {
          const s = JSON.parse(e.statsJson) as Record<string, unknown>;
          if (typeof s._rounds === "number" && s._rounds > 0) return s._rounds;
        } catch { /* */ }
      }
    }
    return 1;
  });

  const [statsData, setStatsData] = useState<Record<string, Record<string, string[]>>>(() => {
    const map: Record<string, Record<string, string[]>> = {};
    for (const e of spieltag.entries) {
      if (e.statsJson) {
        try {
          const s = JSON.parse(e.statsJson) as Record<string, unknown>;
          const nR = typeof s._rounds === "number" && s._rounds > 0 ? s._rounds : 1;
          const fields: Record<string, string[]> = {};
          for (const f of statFieldsList) {
            const val = s[f];
            if (Array.isArray(val)) fields[f] = Array.from({ length: nR }, (_, i) => String(val[i] ?? ""));
            else if (typeof val === "number") fields[f] = [String(val), ...Array(nR - 1).fill("")];
            else fields[f] = Array(nR).fill("");
          }
          map[e.userId] = fields;
        } catch { /* */ }
      }
    }
    return map;
  });

  const [matches, setMatches] = useState<LulMatch[]>(() => {
    try { return JSON.parse(spieltag.matchesJson ?? "[]"); } catch { return []; }
  });

  // ── Filtered user lists ───────────────────────────────────────────────────────
  const filteredPlayerUsers = useMemo(() => {
    const q = playerSearch.toLowerCase().trim();
    return q ? allUsers.filter(u => uname(u).toLowerCase().includes(q)) : allUsers;
  }, [allUsers, playerSearch]);

  const filteredSpectatorUsers = useMemo(() => {
    const q = spectatorSearch.toLowerCase().trim();
    const base = allUsers.filter(u => !playerIds.includes(u.id));
    return q ? base.filter(u => uname(u).toLowerCase().includes(q)) : base;
  }, [allUsers, spectatorSearch, playerIds]);

  const filteredVoterUsers = useMemo(() => {
    const q = voterSearch.toLowerCase().trim();
    const base = allUsers.filter(u => !playerIds.includes(u.id) && !spectatorIds.includes(u.id));
    return q ? base.filter(u => uname(u).toLowerCase().includes(q)) : base;
  }, [allUsers, voterSearch, playerIds, spectatorIds]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function ensureEntry(userId: string, role: "player" | "spectator" | "voter") {
    if (!entries[userId]) {
      setEntries(prev => ({
        ...prev,
        [userId]: { role, rounds: Array(numRounds).fill(""), placement: "", gameWinner: false, communityChamp: false, trostpreis: false, voted: role === "voter" },
      }));
    }
  }

  function toggleVoter(userId: string) {
    if (voterIds.includes(userId)) {
      setVoterIds(prev => prev.filter(id => id !== userId));
      setEntries(prev => { const n = { ...prev }; delete n[userId]; return n; });
    } else {
      setVoterIds(prev => [...prev, userId]);
      setEntries(prev => ({
        ...prev,
        [userId]: { role: "voter", rounds: Array(numRounds).fill(""), placement: "", gameWinner: false, communityChamp: false, trostpreis: false, voted: true },
      }));
    }
  }

  function changeNumRounds(delta: number) {
    setNumRounds(prev => {
      const next = Math.max(1, prev + delta);
      setEntries(cur => {
        const updated: typeof cur = {};
        for (const [uid, e] of Object.entries(cur)) {
          updated[uid] = { ...e, rounds: Array.from({ length: next }, (_, i) => e.rounds[i] ?? "") };
        }
        return updated;
      });
      return next;
    });
  }

  function changeNumStatRounds(delta: number) {
    setNumStatRounds(prev => {
      const next = Math.max(1, prev + delta);
      setStatsData(cur => {
        const updated: typeof cur = {};
        for (const uid of playerIds) {
          const fields: Record<string, string[]> = {};
          for (const f of statFieldsList) {
            const arr = cur[uid]?.[f] ?? [];
            fields[f] = Array.from({ length: next }, (_, i) => arr[i] ?? "");
          }
          updated[uid] = fields;
        }
        return updated;
      });
      return next;
    });
  }

  function togglePlayer(userId: string) {
    if (playerIds.includes(userId)) {
      setPlayerIds(prev => prev.filter(id => id !== userId));
      setEntries(prev => { const n = { ...prev }; delete n[userId]; return n; });
      setStatsData(prev => { const n = { ...prev }; delete n[userId]; return n; });
    } else {
      setPlayerIds(prev => [...prev, userId]);
      ensureEntry(userId, "player");
      if (isStatFmt) {
        setStatsData(prev => ({
          ...prev,
          [userId]: Object.fromEntries(statFieldsList.map(f => [f, Array(numStatRounds).fill("")])),
        }));
      }
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
      return { uid, total: r ? r.rounds.reduce((s, v) => s + (Number(v) || 0), 0) : 0 };
    }).sort((a, b) => b.total - a.total);
    setEntries(prev => {
      const next = { ...prev };
      scored.forEach(({ uid }, i) => { if (next[uid]) next[uid] = { ...next[uid], placement: String(i + 1) }; });
      return next;
    });
  }

  function autoGameWinner() {
    const scored = playerIds.map(uid => {
      const r = entries[uid];
      return { uid, total: r ? r.rounds.reduce((s, v) => s + (Number(v) || 0), 0) : 0 };
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

  function calcStatScore(uid: string) {
    const fields = statsData[uid] ?? {};
    if (fmt === "avg_stats") {
      const fieldAvgs = statFieldsList.map(f => {
        const arr = fields[f] ?? [];
        const total = arr.reduce((s, v) => s + (Number(v) || 0), 0);
        const filled = arr.filter(v => v !== "").length || 1;
        return total / filled;
      });
      return fieldAvgs.length > 0 ? fieldAvgs.reduce((s, v) => s + v, 0) / fieldAvgs.length : 0;
    }
    return statFieldsList.reduce((s, f) => {
      return s + (statsData[uid]?.[f] ?? []).reduce((ss, v) => ss + (Number(v) || 0), 0);
    }, 0);
  }

  function autoPlacementStat() {
    const scored = playerIds.map(uid => ({ uid, score: calcStatScore(uid) })).sort((a, b) => b.score - a.score);
    setEntries(prev => {
      const next = { ...prev };
      scored.forEach(({ uid }, i) => { if (next[uid]) next[uid] = { ...next[uid], placement: String(i + 1) }; });
      return next;
    });
  }

  function autoGameWinnerStat() {
    const scored = playerIds.map(uid => ({ uid, score: calcStatScore(uid) })).sort((a, b) => b.score - a.score);
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

  function computeStandings(): [string, { wins: number; draws: number; losses: number; pts: number }][] {
    const pts = new Map<string, { wins: number; draws: number; losses: number; pts: number }>();
    for (const uid of playerIds) pts.set(uid, { wins: 0, draws: 0, losses: 0, pts: 0 });
    for (const m of matches) {
      if (!m.p1 || !m.p2) continue;
      if (m.winner === m.p1) {
        const r1 = pts.get(m.p1); const r2 = pts.get(m.p2);
        if (r1) { r1.wins++; r1.pts += 3; }
        if (r2) r2.losses++;
      } else if (m.winner === m.p2) {
        const r2 = pts.get(m.p2); const r1 = pts.get(m.p1);
        if (r2) { r2.wins++; r2.pts += 3; }
        if (r1) r1.losses++;
      } else if (m.winner === "draw") {
        const r1 = pts.get(m.p1); const r2 = pts.get(m.p2);
        if (r1) { r1.draws++; r1.pts += 1; }
        if (r2) { r2.draws++; r2.pts += 1; }
      }
    }
    return [...pts.entries()].sort((a, b) => b[1].pts - a[1].pts || b[1].wins - a[1].wins);
  }

  function autoPlacementMatch() {
    const standings = computeStandings();
    setEntries(prev => {
      const next = { ...prev };
      standings.forEach(([uid], i) => { if (next[uid]) next[uid] = { ...next[uid], placement: String(i + 1) }; });
      const winnerId = standings[0]?.[0];
      for (const uid of playerIds) {
        if (next[uid]) next[uid] = { ...next[uid], gameWinner: uid === winnerId };
      }
      return next;
    });
  }

  function addMatch() { setMatches(prev => [...prev, { id: String(Date.now()), p1: "", p2: "", s1: "", s2: "", winner: "" }]); }
  function removeMatch(id: string) { setMatches(prev => prev.filter(m => m.id !== id)); }
  function updateMatch(id: string, field: string, value: string) {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  }

  // ── API ───────────────────────────────────────────────────────────────────────
  async function saveDraft() {
    setLoading(true);
    const allIds = [...playerIds, ...spectatorIds, ...voterIds];
    const payload = allIds.map(userId => {
      const e = entries[userId];
      const role = playerIds.includes(userId) ? "player" : spectatorIds.includes(userId) ? "spectator" : "voter";
      const scores = !isStatFmt && role !== "voter"
        ? (e?.rounds ?? []).map(Number).filter((_, i) => i < (e?.rounds.findLastIndex(r => r !== "") ?? -1) + 1)
        : [];
      const statsJson = isStatFmt && role === "player" ? (() => {
        const fields = statsData[userId] ?? {};
        const data: Record<string, unknown> = { _rounds: numStatRounds };
        for (const f of statFieldsList) data[f] = (fields[f] ?? []).map(v => Number(v) || 0);
        return data;
      })() : null;
      return {
        userId, role, roundScores: scores, statsJson,
        placement: e?.placement ? Number(e.placement) : null,
        gameWinner: e?.gameWinner ?? false,
        communityChamp: e?.communityChamp ?? false,
        trostpreis: e?.trostpreis ?? false,
        voted: role === "voter" ? true : (e?.voted ?? false),
      };
    });
    const body: Record<string, unknown> = { entries: payload };
    if (is1v1Fmt) body.matchesJson = JSON.stringify(matches);
    await fetch(`/api/lul/spieltage/${spieltag.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    toast.success("Entwurf gespeichert");
    onRefresh();
  }

  async function finalize() {
    if (!confirm(`Spieltag ${spieltag.number} (${spieltag.title ?? spieltag.game ?? "Special Event"}) wirklich finalisieren? LUL-Punkte werden berechnet und können nicht mehr geändert werden.`)) return;
    setLoading(true);
    await saveDraft();
    const res = await fetch(`/api/lul/spieltage/${spieltag.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finalize: true }),
    });
    setLoading(false);
    if (res.ok) { toast.success(`Spieltag ${spieltag.number} finalisiert – LUL-Punkte vergeben`); fireConfetti(); }
    else toast.error("Fehler beim Finalisieren");
    onRefresh();
  }

  const isFinished = spieltag.status === "finished";

  async function reopen() {
    if (!confirm(`Spieltag ${spieltag.number} (${spieltag.title ?? spieltag.game ?? "Special Event"}) wirklich wiedereröffnen?\n\nDie LUL-Punkte werden zurückgesetzt und neu berechnet sobald du erneut finalisierst.`)) return;
    setLoading(true);
    await fetch(`/api/lul/spieltage/${spieltag.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    setLoading(false);
    toast.success("Spieltag wieder geöffnet");
    onRefresh();
  }

  // ── Finished view ─────────────────────────────────────────────────────────────
  if (isFinished) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
            <Lock className="w-4 h-4" /> Abgeschlossen – Ergebnisse finalisiert
          </div>
          <button onClick={reopen} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 bg-orange-900/20 hover:bg-orange-900/30 border border-orange-800/30 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50">
            <RefreshCw className="w-3 h-3" /> Wiedereröffnen
          </button>
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
              {spieltag.entries.sort((a, b) => b.lulPoints - a.lulPoints).map(e => (
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

  // ── Editor ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Tabs */}
      <div className="sticky top-0 z-10 -mx-4 px-4 pt-3 pb-2 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800/60">
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {(["players", "spectators", "awards"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t ? "bg-gray-700 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
              }`}>
              {t === "players"
                ? <><Gamepad2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Mitspieler</span><span className="sm:hidden">Spieler</span></>
                : t === "spectators"
                ? <><Eye className="w-3.5 h-3.5" /><span className="hidden sm:inline">Zuschauer</span><span className="sm:hidden">Zusch.</span></>
                : <><Vote className="w-3.5 h-3.5" /><span>Umfrage</span></>}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-700 text-center mt-1.5 sm:hidden select-none">← wischen zum Wechseln →</p>
      </div>

      {/* Players tab */}
      {tab === "players" && (
        <div className="space-y-3">
          {isStatFmt ? (
            statFieldsList.length === 0 ? (
              <p className="text-xs text-amber-400/80 bg-amber-900/10 border border-amber-800/30 rounded-lg px-3 py-2">
                Keine Stat-Felder konfiguriert — bearbeite den Spieltag und füge Felder hinzu.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-gray-400">Statistiken pro Spieler eintragen:</p>
                  <button onClick={autoPlacementStat} className="text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/30 px-2 py-1 rounded transition-colors">Platzierung auto</button>
                  <button onClick={autoGameWinnerStat} className="text-xs text-amber-400 hover:text-amber-300 bg-amber-900/20 hover:bg-amber-900/30 px-2 py-1 rounded transition-colors">Game Winner auto</button>
                  <div className="flex items-center gap-1 ml-auto text-xs">
                    <span className="text-gray-500">Runden:</span>
                    <button onClick={() => changeNumStatRounds(-1)} disabled={numStatRounds <= 1}
                      className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white font-bold transition-colors">−</button>
                    <span className="text-white font-semibold w-6 text-center tabular-nums">{numStatRounds}</span>
                    <button onClick={() => changeNumStatRounds(1)}
                      className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors">+</button>
                  </div>
                </div>
                <UserPickerSheet label="Mitspieler" users={filteredPlayerUsers} selected={playerIds}
                  onToggle={togglePlayer} searchValue={playerSearch} onSearchChange={setPlayerSearch} />
                {playerIds.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-gray-700 -mx-1 px-1">
                    <p className="text-[10px] text-gray-600 mb-1 sm:hidden">← scrollbar →</p>
                    <table className="w-full text-xs" style={{ minWidth: `${160 + numStatRounds * statFieldsList.length * 60 + (fmt === "avg_stats" ? 80 : statFieldsList.length * 48) + 90}px` }}>
                      <thead>
                        <tr className="bg-gray-800/80 border-b border-gray-700/50 text-gray-500">
                          <th className="px-3 py-1" />
                          {Array.from({ length: numStatRounds }, (_, ri) => (
                            <th key={ri} colSpan={statFieldsList.length}
                              className="text-center px-1 py-1 text-[10px] font-semibold uppercase tracking-wide border-l border-gray-700/50">
                              R{ri + 1}
                            </th>
                          ))}
                          <th colSpan={1} className="text-center px-1 py-1 text-[10px] font-semibold uppercase tracking-wide border-l border-gray-700/50 text-amber-500/70">
                            {fmt === "avg_stats" ? "Ø Gesamt" : "Σ"}
                          </th>
                          <th className="px-2 py-1" /><th className="px-2 py-1" />
                        </tr>
                        <tr className="bg-gray-800 border-b border-gray-700 text-gray-400">
                          <th className="text-left px-3 py-2">Spieler</th>
                          {Array.from({ length: numStatRounds }, (_, ri) =>
                            statFieldsList.map(f => (
                              <th key={`${ri}_${f}`} className="text-center px-1 py-2 whitespace-nowrap border-l border-gray-700/30 first:border-0">{f}</th>
                            ))
                          )}
                          {fmt === "avg_stats"
                            ? <th className="text-center px-2 py-2 whitespace-nowrap border-l border-gray-700/30 text-amber-400/70">Ø</th>
                            : statFieldsList.map(f => (
                                <th key={`sum_${f}`} className="text-center px-2 py-2 whitespace-nowrap border-l border-gray-700/30 text-amber-400/70">{f}</th>
                              ))
                          }
                          <th className="text-center px-2 py-2">Platz</th>
                          <th className="text-center px-2 py-2"><Trophy className="w-3.5 h-3.5 inline text-amber-400" /></th>
                        </tr>
                      </thead>
                      <tbody>
                        {playerIds.map(uid => {
                          const u = allUsers.find(u => u.id === uid);
                          const e = entries[uid];
                          const fields = statsData[uid] ?? {};
                          if (!u || !e) return null;
                          return (
                            <tr key={uid} className="border-b border-gray-800 last:border-0">
                              <td className="px-3 py-1.5 text-white whitespace-nowrap font-medium">{uname(u)}</td>
                              {Array.from({ length: numStatRounds }, (_, ri) =>
                                statFieldsList.map(f => {
                                  const arr = fields[f] ?? [];
                                  return (
                                    <td key={`${ri}_${f}`} className="px-1 py-1 border-l border-gray-800/50 first:border-0">
                                      <input type="number" min={0} value={arr[ri] ?? ""}
                                        onChange={ev => setStatsData(prev => {
                                          const cur = prev[uid]?.[f] ?? Array(numStatRounds).fill("");
                                          const updated = [...cur];
                                          updated[ri] = ev.target.value;
                                          return { ...prev, [uid]: { ...(prev[uid] ?? {}), [f]: updated } };
                                        })}
                                        className="w-14 bg-gray-700 border border-gray-600 text-white rounded px-1 py-0.5 text-center text-xs"
                                      />
                                    </td>
                                  );
                                })
                              )}
                              {fmt === "avg_stats"
                                ? (() => {
                                    const fieldAvgs = statFieldsList.map(f => {
                                      const arr = (fields[f] ?? []).map(v => Number(v) || 0);
                                      const filled = arr.filter(v => v !== 0).length || 1;
                                      return arr.reduce((s, v) => s + v, 0) / filled;
                                    });
                                    const combined = fieldAvgs.length > 0 ? fieldAvgs.reduce((s, v) => s + v, 0) / fieldAvgs.length : 0;
                                    return (
                                      <td className="px-2 py-1.5 text-center font-bold text-amber-400 tabular-nums border-l border-gray-800/50">
                                        {combined % 1 === 0 ? String(combined) : combined.toFixed(2)}
                                      </td>
                                    );
                                  })()
                                : statFieldsList.map(f => {
                                    const arr = (fields[f] ?? []).map(v => Number(v) || 0);
                                    return (
                                      <td key={`sum_${f}`} className="px-2 py-1.5 text-center font-bold text-amber-400 tabular-nums border-l border-gray-800/50">
                                        {arr.reduce((s, v) => s + v, 0)}
                                      </td>
                                    );
                                  })
                              }
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
            )
          ) : is1v1Fmt ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-gray-400">Spieler auswählen und Matches eintragen:</p>
                <button onClick={addMatch}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/30 px-2 py-1 rounded transition-colors">
                  <Plus className="w-3 h-3" /> Match
                </button>
                {matches.some(m => m.winner) && (
                  <button onClick={autoPlacementMatch}
                    className="text-xs text-amber-400 hover:text-amber-300 bg-amber-900/20 hover:bg-amber-900/30 px-2 py-1 rounded transition-colors">
                    Platzierung auto
                  </button>
                )}
              </div>
              <UserPickerSheet label="Mitspieler" users={filteredPlayerUsers} selected={playerIds}
                onToggle={togglePlayer} searchValue={playerSearch} onSearchChange={setPlayerSearch} />
              {matches.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">Matches</p>
                  {matches.map(m => {
                    const u1 = allUsers.find(u => u.id === m.p1);
                    const u2 = allUsers.find(u => u.id === m.p2);
                    return (
                      <div key={m.id} className="flex items-center gap-1.5 bg-gray-800/60 rounded-lg p-2 flex-wrap">
                        <select value={m.p1} onChange={e => updateMatch(m.id, "p1", e.target.value)}
                          className="flex-1 min-w-[80px] text-xs bg-gray-700 border border-gray-600 text-white rounded px-2 py-1">
                          <option value="">Spieler 1</option>
                          {playerIds.map(uid => { const u = allUsers.find(u => u.id === uid); return u ? <option key={uid} value={uid}>{uname(u)}</option> : null; })}
                        </select>
                        <div className="flex items-center gap-1 shrink-0">
                          <input type="number" min={0} value={m.s1} onChange={e => updateMatch(m.id, "s1", e.target.value)}
                            className="w-10 bg-gray-700 border border-gray-600 text-white rounded px-1 py-1 text-center text-xs" />
                          <span className="text-gray-600 text-xs font-bold">:</span>
                          <input type="number" min={0} value={m.s2} onChange={e => updateMatch(m.id, "s2", e.target.value)}
                            className="w-10 bg-gray-700 border border-gray-600 text-white rounded px-1 py-1 text-center text-xs" />
                        </div>
                        <select value={m.p2} onChange={e => updateMatch(m.id, "p2", e.target.value)}
                          className="flex-1 min-w-[80px] text-xs bg-gray-700 border border-gray-600 text-white rounded px-2 py-1">
                          <option value="">Spieler 2</option>
                          {playerIds.map(uid => { const u = allUsers.find(u => u.id === uid); return u ? <option key={uid} value={uid}>{uname(u)}</option> : null; })}
                        </select>
                        <select value={m.winner} onChange={e => updateMatch(m.id, "winner", e.target.value)}
                          className="flex-1 min-w-[90px] text-xs bg-gray-700 border border-gray-600 text-white rounded px-2 py-1">
                          <option value="">– Sieger –</option>
                          {m.p1 && <option value={m.p1}>{u1 ? uname(u1) : m.p1} ✓</option>}
                          {m.p2 && <option value={m.p2}>{u2 ? uname(u2) : m.p2} ✓</option>}
                          {(fmt === "round_robin" || fmt === "liga") && <option value="draw">Unentschieden</option>}
                        </select>
                        <button onClick={() => removeMatch(m.id)} className="text-gray-600 hover:text-red-500 transition-colors p-1 rounded shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {playerIds.length > 0 && matches.length > 0 && (() => {
                const standings = computeStandings();
                return (
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Tabelle</p>
                    <div className="overflow-x-auto rounded-lg border border-gray-700">
                      <table className="w-full text-xs min-w-[320px]">
                        <thead>
                          <tr className="bg-gray-800 border-b border-gray-700 text-gray-400">
                            <th className="text-left px-3 py-1.5">Spieler</th>
                            <th className="text-center px-2 py-1.5 text-green-400">S</th>
                            {(fmt === "round_robin" || fmt === "liga") && <th className="text-center px-2 py-1.5 text-gray-500">U</th>}
                            <th className="text-center px-2 py-1.5 text-red-400">N</th>
                            <th className="text-center px-2 py-1.5 text-amber-400 font-bold">Pkt</th>
                            <th className="text-center px-2 py-1.5">Platz</th>
                            <th className="text-center px-2 py-1.5"><Trophy className="w-3.5 h-3.5 inline text-amber-400" /></th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map(([uid, s]) => {
                            const u = allUsers.find(u => u.id === uid);
                            const e = entries[uid];
                            if (!u) return null;
                            return (
                              <tr key={uid} className="border-b border-gray-800 last:border-0">
                                <td className="px-3 py-1.5 text-white font-medium whitespace-nowrap">{uname(u)}</td>
                                <td className="px-2 py-1.5 text-center text-green-400 font-medium">{s.wins}</td>
                                {(fmt === "round_robin" || fmt === "liga") && <td className="px-2 py-1.5 text-center text-gray-400">{s.draws}</td>}
                                <td className="px-2 py-1.5 text-center text-red-400">{s.losses}</td>
                                <td className="px-2 py-1.5 text-center font-bold text-amber-400">{s.pts}</td>
                                <td className="px-2 py-1">
                                  <input type="number" min={1} value={e?.placement ?? ""}
                                    onChange={ev => setField(uid, "placement", ev.target.value)}
                                    className="w-10 bg-gray-700 border border-gray-600 text-white rounded px-1 py-0.5 text-center text-xs"
                                  />
                                </td>
                                <td className="px-2 py-1 text-center">
                                  <input type="checkbox" checked={e?.gameWinner ?? false}
                                    onChange={ev => setField(uid, "gameWinner", ev.target.checked)}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-gray-400">Mitspieler auswählen und Runden-Ergebnisse eintragen:</p>
                <button onClick={autoPlacement} className="text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/30 px-2 py-1 rounded transition-colors">Platzierung auto</button>
                <button onClick={autoGameWinner} className="text-xs text-amber-400 hover:text-amber-300 bg-amber-900/20 hover:bg-amber-900/30 px-2 py-1 rounded transition-colors">Game Winner auto</button>
                <div className="flex items-center gap-1 ml-auto text-xs">
                  <span className="text-gray-500">Runden:</span>
                  <button onClick={() => changeNumRounds(-1)} disabled={numRounds <= 1}
                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white font-bold transition-colors">−</button>
                  <span className="text-white font-semibold w-6 text-center tabular-nums">{numRounds}</span>
                  <button onClick={() => changeNumRounds(1)}
                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors">+</button>
                </div>
              </div>
              <UserPickerSheet label="Mitspieler" users={filteredPlayerUsers} selected={playerIds}
                onToggle={togglePlayer} searchValue={playerSearch} onSearchChange={setPlayerSearch} />
              {playerIds.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-700 -mx-1 px-1">
                  <p className="text-[10px] text-gray-600 mb-1 sm:hidden">← scrollbar →</p>
                  <table className="w-full text-xs min-w-[580px]">
                    <thead>
                      <tr className="bg-gray-800 border-b border-gray-700 text-gray-400">
                        <th className="text-left px-3 py-2">Spieler</th>
                        {Array.from({length: numRounds}, (_, i) => (
                          <th key={i} className="text-center px-1 py-2 w-12">R{i+1}</th>
                        ))}
                        <th className="text-center px-2 py-2">∑</th>
                        <th className="text-center px-2 py-2">Platz</th>
                        <th className="text-center px-2 py-2"><Trophy className="w-3.5 h-3.5 inline text-amber-400" /></th>
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
            </>
          )}
        </div>
      )}

      {/* Spectators tab */}
      {tab === "spectators" && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Zuschauer auswählen (Discord- oder Twitch-Teilnehmer):</p>
          <UserPickerSheet label="Zuschauer" users={filteredSpectatorUsers} selected={spectatorIds}
            onToggle={toggleSpectator} searchValue={spectatorSearch} onSearchChange={setSpectatorSearch} />
        </div>
      )}

      {/* Awards tab */}
      {tab === "awards" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-2">👑 Community-Champ (Zuschauer-Umfrage)</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {spectatorIds.map(uid => {
                  const u = allUsers.find(u => u.id === uid);
                  const e = entries[uid];
                  if (!u || !e) return null;
                  return (
                    <label key={uid} className="flex items-center gap-2 p-2 rounded bg-gray-800 hover:bg-gray-750 cursor-pointer text-xs">
                      <input type="checkbox" checked={!!e.communityChamp}
                        onChange={ev => setField(uid, "communityChamp", ev.target.checked)} />
                      <span className="text-white">{uname(u)}</span>
                    </label>
                  );
                })}
                {spectatorIds.length === 0 && <p className="text-xs text-gray-600">Keine Zuschauer eingetragen.</p>}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">🎁 Trostpreis (Mitspieler-Umfrage)</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {playerIds.filter(uid => !entries[uid]?.gameWinner).map(uid => {
                  const u = allUsers.find(u => u.id === uid);
                  const e = entries[uid];
                  if (!u || !e) return null;
                  return (
                    <label key={uid} className="flex items-center gap-2 p-2 rounded bg-gray-800 hover:bg-gray-750 cursor-pointer text-xs">
                      <input type="checkbox" checked={!!e.trostpreis}
                        onChange={ev => setField(uid, "trostpreis", ev.target.checked)} />
                      <span className="text-white">{uname(u)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

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
                      className="rounded shrink-0" />
                    <span className="text-white truncate">{uname(u)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Vote className="w-3.5 h-3.5 text-emerald-400" />
              <label className="text-xs text-gray-400">Externe Wähler <span className="text-gray-600">(nur Abstimmung, keine Teilnahme-Punkte)</span></label>
            </div>
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="User suchen..." value={voterSearch}
                onChange={e => setVoterSearch(e.target.value)}
                className="w-full text-xs bg-gray-800 border border-gray-700 text-white rounded-lg pl-8 pr-3 py-1.5 placeholder:text-gray-600" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
              {filteredVoterUsers.map(u => (
                <label key={u.id} className="flex items-center gap-1.5 p-1.5 rounded bg-gray-800 hover:bg-gray-700 cursor-pointer text-xs">
                  <input type="checkbox" checked={voterIds.includes(u.id)} onChange={() => toggleVoter(u.id)} className="rounded shrink-0" />
                  <span className="text-white truncate">{uname(u)}</span>
                  {voterIds.includes(u.id) && <span className="ml-auto text-emerald-500 text-[10px] shrink-0">+2</span>}
                </label>
              ))}
              {filteredVoterUsers.length === 0 && (
                <p className="col-span-3 text-xs text-gray-600 py-1">Keine weiteren User verfügbar.</p>
              )}
            </div>
            {voterIds.length > 0 && (
              <p className="text-[10px] text-gray-600 mt-2">
                {voterIds.length} externer Wähler ausgewählt – erhalten je +2 Pkt, keine Teilnahme-Punkte.
              </p>
            )}
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
