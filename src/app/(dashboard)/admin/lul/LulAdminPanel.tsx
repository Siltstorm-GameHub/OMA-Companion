"use client";
import { useState, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import { fireConfetti } from "@/components/ConfettiTrigger";
import {
  Plus, Trophy, ChevronDown, ChevronUp, Trash2, Save,
  Users, Gamepad2, Lock, RefreshCw, Archive, History, UserPlus, X, Search,
  Eye, Vote, Crown, Gift, Flame, CheckCircle2, PenLine, Check,
} from "lucide-react";
import type { LulAdminSeasons } from "./page";
import { UserPickerSheet } from "@/components/UserPickerSheet";
import GameNameInput from "@/components/GameNameInput";
import { getGenreIcon } from "@/lib/genre-icons";
import StatFieldEditor from "@/components/StatFieldEditor";

type User = { id: string; name: string | null; username: string | null; image: string | null };
type LulSeason  = LulAdminSeasons[number];
type LulSpieltag = LulSeason["spieltage"][number];
type LulEntry    = LulSpieltag["entries"][number];

const uname = (u: User) => u.username ?? u.name ?? "?";
const MEDAL = ["🥇", "🥈", "🥉"];

const TOURNAMENT_FORMATS = [
  { value: "single_elimination", label: "Einzel-Eliminierung",  desc: "Klassisches K.O.-System" },
  { value: "double_elimination", label: "Double Elimination",   desc: "Verlierer-Bracket als zweite Chance" },
  { value: "round_robin",        label: "Jeder gegen Jeden",    desc: "Alle spielen gegen alle" },
  { value: "liga",               label: "Liga",                 desc: "Spieltage, Tabelle mit S/U/N" },
  { value: "ffa",                label: "Free for All",         desc: "Alle gegeneinander, Platzierung zählt" },
  { value: "coop_stats",         label: "Kooperativ (Stats)",   desc: "Alle zusammen, individuelle Stats" },
  { value: "avg_stats",          label: "Durchschnittswerte",   desc: "Sieger = bester Durchschnitt (z.B. Kills/Runde)" },
];

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
  const [playerSearch, setPlayerSearch] = useState("");
  const [spectatorSearch, setSpectatorSearch] = useState("");
  const [voterSearch, setVoterSearch] = useState("");

  // Draft state
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
  const [playerIds, setPlayerIds] = useState<string[]>(
    spieltag.entries.filter(e => e.role === "player").map(e => e.userId)
  );
  const [spectatorIds, setSpectatorIds] = useState<string[]>(
    spieltag.entries.filter(e => e.role === "spectator").map(e => e.userId)
  );
  const [voterIds, setVoterIds] = useState<string[]>(
    spieltag.entries.filter(e => e.role === "voter").map(e => e.userId)
  );

  // Format detection
  const fmt = spieltag.tournamentFormat ?? "";
  const statFieldsList: string[] = (() => { try { return JSON.parse(spieltag.statFields ?? "[]"); } catch { return []; } })();
  const isStatFmt = fmt === "ffa" || fmt === "coop_stats" || fmt === "avg_stats";
  const is1v1Fmt  = fmt === "single_elimination" || fmt === "double_elimination" || fmt === "round_robin" || fmt === "liga";

  // Stat tracking data: userId → field → roundValues[]
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

  // 1v1 match results
  type LulMatch = { id: string; p1: string; p2: string; s1: string; s2: string; winner: string };
  const [matches, setMatches] = useState<LulMatch[]>(() => {
    try { return JSON.parse(spieltag.matchesJson ?? "[]"); } catch { return []; }
  });

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
          const rounds = Array.from({ length: next }, (_, i) => e.rounds[i] ?? "");
          updated[uid] = { ...e, rounds };
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

  // ── Stat-format helpers ──────────────────────────────────────────────────
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
      const arr = fields[f] ?? [];
      return s + arr.reduce((ss, v) => ss + (Number(v) || 0), 0);
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

  // ── 1v1 / bracket helpers ────────────────────────────────────────────────
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

  function addMatch() {
    setMatches(prev => [...prev, { id: String(Date.now()), p1: "", p2: "", s1: "", s2: "", winner: "" }]);
  }
  function removeMatch(id: string) { setMatches(prev => prev.filter(m => m.id !== id)); }
  function updateMatch(id: string, field: string, value: string) {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  }

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
        for (const f of statFieldsList) {
          data[f] = (fields[f] ?? []).map(v => Number(v) || 0);
        }
        return data;
      })() : null;
      return {
        userId, role,
        roundScores: scores,
        statsJson,
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
    if (res.ok) {
      toast.success(`Spieltag ${spieltag.number} finalisiert – LUL-Punkte vergeben`);
      fireConfetti();
    } else toast.error("Fehler beim Finalisieren");
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
    <div className="p-4 space-y-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Tabs — sticky + swipe-to-navigate */}
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
        {/* Swipe hint — only on touch */}
        <p className="text-[10px] text-gray-700 text-center mt-1.5 sm:hidden select-none">← wischen zum Wechseln →</p>
      </div>

      {/* Players tab */}
      {tab === "players" && (
        <div className="space-y-3">

          {/* ── Stat-Tracking (ffa / coop_stats / avg_stats) ─────────────── */}
          {isStatFmt ? (
            statFieldsList.length === 0 ? (
              <p className="text-xs text-amber-400/80 bg-amber-900/10 border border-amber-800/30 rounded-lg px-3 py-2">
                Keine Stat-Felder konfiguriert — bearbeite den Spieltag und füge Felder hinzu.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-gray-400">Statistiken pro Spieler eintragen:</p>
                  <button onClick={autoPlacementStat}
                    className="text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/30 px-2 py-1 rounded transition-colors">
                    Platzierung auto
                  </button>
                  <button onClick={autoGameWinnerStat}
                    className="text-xs text-amber-400 hover:text-amber-300 bg-amber-900/20 hover:bg-amber-900/30 px-2 py-1 rounded transition-colors">
                    Game Winner auto
                  </button>
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
                        {/* Gruppen-Header: Runde 1 | Runde 2 | … | Gesamt */}
                        <tr className="bg-gray-800/80 border-b border-gray-700/50 text-gray-500">
                          <th className="px-3 py-1" />
                          {Array.from({ length: numStatRounds }, (_, ri) => (
                            <th key={ri} colSpan={statFieldsList.length}
                              className="text-center px-1 py-1 text-[10px] font-semibold uppercase tracking-wide border-l border-gray-700/50">
                              R{ri + 1}
                            </th>
                          ))}
                          <th colSpan={1}
                            className="text-center px-1 py-1 text-[10px] font-semibold uppercase tracking-wide border-l border-gray-700/50 text-amber-500/70">
                            {fmt === "avg_stats" ? "Ø Gesamt" : "Σ"}
                          </th>
                          <th className="px-2 py-1" />
                          <th className="px-2 py-1" />
                        </tr>
                        {/* Feld-Header */}
                        <tr className="bg-gray-800 border-b border-gray-700 text-gray-400">
                          <th className="text-left px-3 py-2">Spieler</th>
                          {Array.from({ length: numStatRounds }, (_, ri) =>
                            statFieldsList.map(f => (
                              <th key={`${ri}_${f}`} className="text-center px-1 py-2 whitespace-nowrap border-l border-gray-700/30 first:border-0">
                                {f}
                              </th>
                            ))
                          )}
                          {fmt === "avg_stats"
                            ? <th className="text-center px-2 py-2 whitespace-nowrap border-l border-gray-700/30 text-amber-400/70">Ø</th>
                            : statFieldsList.map(f => (
                                <th key={`sum_${f}`} className="text-center px-2 py-2 whitespace-nowrap border-l border-gray-700/30 text-amber-400/70">
                                  {f}
                                </th>
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
                              {/* Per-round inputs */}
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
                              {/* Gesamt: bei avg_stats ein kombinierter Ø, sonst Summen pro Feld */}
                              {fmt === "avg_stats"
                                ? (() => {
                                    const fieldAvgs = statFieldsList.map(f => {
                                      const arr = (fields[f] ?? []).map(v => Number(v) || 0);
                                      const filled = arr.filter(v => v !== 0).length || 1;
                                      return arr.reduce((s, v) => s + v, 0) / filled;
                                    });
                                    const combined = fieldAvgs.length > 0
                                      ? fieldAvgs.reduce((s, v) => s + v, 0) / fieldAvgs.length
                                      : 0;
                                    const display = combined % 1 === 0 ? String(combined) : combined.toFixed(2);
                                    return (
                                      <td className="px-2 py-1.5 text-center font-bold text-amber-400 tabular-nums border-l border-gray-800/50">
                                        {display}
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
            /* ── 1v1 / Bracket-Format ─────────────────────────────────────── */
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

              {/* Match list */}
              {matches.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">Matches</p>
                  {matches.map((m) => {
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

              {/* Standings */}
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
            /* ── Standard: Runden-Scores ──────────────────────────────────── */
            <>
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
                <div className="flex items-center gap-1 ml-auto text-xs">
                  <span className="text-gray-500">Runden:</span>
                  <button onClick={() => changeNumRounds(-1)} disabled={numRounds <= 1}
                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white font-bold transition-colors">
                    −
                  </button>
                  <span className="text-white font-semibold w-6 text-center tabular-nums">{numRounds}</span>
                  <button onClick={() => changeNumRounds(1)}
                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors">
                    +
                  </button>
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
          <UserPickerSheet
            label="Zuschauer"
            users={filteredSpectatorUsers}
            selected={spectatorIds}
            onToggle={toggleSpectator}
            searchValue={spectatorSearch}
            onSearchChange={setSpectatorSearch}
          />
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

          {/* Externe Wähler */}
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Vote className="w-3.5 h-3.5 text-emerald-400" />
              <label className="text-xs text-gray-400">Externe Wähler <span className="text-gray-600">(nur Abstimmung, keine Teilnahme-Punkte)</span></label>
            </div>
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="User suchen..."
                value={voterSearch}
                onChange={e => setVoterSearch(e.target.value)}
                className="w-full text-xs bg-gray-800 border border-gray-700 text-white rounded-lg pl-8 pr-3 py-1.5 placeholder:text-gray-600"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
              {filteredVoterUsers.map(u => (
                <label key={u.id} className="flex items-center gap-1.5 p-1.5 rounded bg-gray-800 hover:bg-gray-700 cursor-pointer text-xs">
                  <input type="checkbox" checked={voterIds.includes(u.id)} onChange={() => toggleVoter(u.id)} className="rounded shrink-0" />
                  <span className="text-white truncate">{uname(u)}</span>
                  {voterIds.includes(u.id) && (
                    <span className="ml-auto text-emerald-500 text-[10px] shrink-0">+2</span>
                  )}
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

// ── Legacy Editor ────────────────────────────────────────────────────────────
type LegacyRow = {
  userId:      string;
  totalPts:    number;
  asPlayer:    number;
  asSpectator: number;
  wins:        number;
  champs:      number;
  trost:       number;
  dominion:    number;
  votes:       number;
};

const LEGACY_COLS: { key: keyof LegacyRow; label: string; icon: string }[] = [
  { key: "totalPts",    label: "Punkte",    icon: "⭐" },
  { key: "asPlayer",    label: "Spieler",   icon: "🎮" },
  { key: "asSpectator", label: "Zuschauer", icon: "👁️" },
  { key: "wins",        label: "Siege",     icon: "🏆" },
  { key: "champs",      label: "Champ",     icon: "👑" },
  { key: "trost",       label: "Trost",     icon: "🎁" },
  { key: "dominion",    label: "Dominion",  icon: "🔥" },
  { key: "votes",       label: "Votes",     icon: "✅" },
];

function LegacyEditor({
  seasonId, allUsers, onRefresh,
}: {
  seasonId: string;
  allUsers: User[];
  onRefresh: () => void;
}) {
  const [rows, setRows] = useState<LegacyRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addUserId, setAddUserId] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/lul/seasons/${seasonId}/legacy`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.map((e: LegacyRow & { userId: string }) => ({
        userId: e.userId,
        totalPts: e.totalPts, asPlayer: e.asPlayer, asSpectator: e.asSpectator,
        wins: e.wins, champs: e.champs, trost: e.trost, dominion: e.dominion, votes: e.votes,
      })));
    }
    setLoaded(true);
    setLoading(false);
  }

  if (!loaded) {
    return (
      <button onClick={load} disabled={loading}
        className="text-sm text-purple-400 hover:text-purple-300 bg-purple-900/20 hover:bg-purple-900/30 border border-purple-800/30 rounded-lg px-4 py-2 w-full transition-colors">
        {loading ? "Lade..." : "Ergebnisse anzeigen / bearbeiten"}
      </button>
    );
  }

  function setField(userId: string, field: keyof LegacyRow, val: string) {
    setRows(prev => prev.map(r => r.userId === userId ? { ...r, [field]: Number(val) || 0 } : r));
  }

  function addRow() {
    if (!addUserId || rows.some(r => r.userId === addUserId)) return;
    setRows(prev => [...prev, {
      userId: addUserId, totalPts: 0, asPlayer: 0, asSpectator: 0,
      wins: 0, champs: 0, trost: 0, dominion: 0, votes: 0,
    }]);
    setAddUserId("");
  }

  function removeRow(userId: string) {
    setRows(prev => prev.filter(r => r.userId !== userId));
  }

  async function save() {
    setLoading(true);
    const res = await fetch(`/api/lul/seasons/${seasonId}/legacy`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: rows }),
    });
    setLoading(false);
    if (res.ok) toast.success("Legacy-Ergebnisse gespeichert und Saison archiviert");
    else toast.error("Fehler beim Speichern");
    onRefresh();
  }

  const alreadyAdded = new Set(rows.map(r => r.userId));
  const available = allUsers.filter(u => !alreadyAdded.has(u.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" /> Saison-Endergebnis eintragen
        </p>
        <p className="text-xs text-gray-500">{rows.length} Spieler</p>
      </div>

      {/* Add player */}
      <div className="flex gap-2">
        <select value={addUserId} onChange={e => setAddUserId(e.target.value)}
          className="flex-1 text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2">
          <option value="">Spieler hinzufügen…</option>
          {available.map(u => <option key={u.id} value={u.id}>{uname(u)}</option>)}
        </select>
        <button onClick={addRow} disabled={!addUserId}
          className="flex items-center gap-1.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg px-3 py-2">
          <UserPlus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Stats table */}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700 text-gray-400">
                <th className="text-left px-3 py-2">Spieler</th>
                {LEGACY_COLS.map(c => (
                  <th key={c.key} className="text-center px-1.5 py-2 whitespace-nowrap">
                    {c.icon} {c.label}
                  </th>
                ))}
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const user = allUsers.find(u => u.id === row.userId);
                return (
                  <tr key={row.userId} className="border-b border-gray-800 last:border-0">
                    <td className="px-3 py-2 text-white font-medium whitespace-nowrap">
                      {user ? uname(user) : row.userId}
                    </td>
                    {LEGACY_COLS.map(c => (
                      <td key={c.key} className="px-1.5 py-1.5 text-center">
                        <input
                          type="number" min={0} value={row[c.key]}
                          onChange={e => setField(row.userId, c.key, e.target.value)}
                          className={`w-14 rounded px-1.5 py-1 text-center text-xs border text-white bg-gray-700 border-gray-600 ${
                            c.key === "totalPts" ? "border-amber-700/50 bg-amber-950/20" : ""
                          }`}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-center">
                      <button onClick={() => removeRow(row.userId)}
                        className="text-gray-600 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 0 && (
        <p className="text-xs text-gray-600 text-center py-4">
          Noch keine Spieler hinzugefügt. Füge Spieler über das Dropdown hinzu.
        </p>
      )}

      <button onClick={save} disabled={loading || rows.length === 0}
        className="flex items-center gap-2 text-sm bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg px-4 py-2">
        <Save className="w-4 h-4" /> Ergebnisse speichern & Saison archivieren
      </button>
    </div>
  );
}

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

  // Create season form
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [sNumber, setSNumber] = useState(initialSeasons.length + 1);
  const [sName, setSName] = useState("");
  const [sPeriod, setSPeriod] = useState("");
  const [sTotalSpieltage, setSTotalSpieltage] = useState(8);
  const [sIsLegacy, setSIsLegacy] = useState(false);

  // Legacy editor state
  const [legacyEditor, setLegacyEditor] = useState<string | null>(null); // seasonId

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

  // Edit spieltag special event fields
  const [editIsSpecial, setEditIsSpecial] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMaxPlayers, setEditMaxPlayers] = useState("");
  const [editTournamentFormat, setEditTournamentFormat] = useState("");

  // Create spieltag: tournament format
  const [stTournamentFormat, setStTournamentFormat] = useState("");
  const [stStatFields, setStStatFields] = useState<string[]>([]);
  const [editStatFields, setEditStatFields] = useState<string[]>([]);

  async function loadSeasons() {
    const res = await fetch("/api/lul/seasons");
    if (!res.ok) return;
    const data: LulAdminSeasons = await res.json();
    setSeasons(data);
  }

  async function createSeason() {
    setLoading(true);
    const res = await fetch("/api/lul/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: sNumber, name: sName || null, period: sPeriod || null, totalSpieltage: sTotalSpieltage }),
    });
    // If legacy, immediately mark it
    if (sIsLegacy && res.ok) {
      const created = await res.json();
      await fetch(`/api/lul/seasons/${created.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      await fetch(`/api/lul/seasons/${created.id}/legacy`, { method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: [] }),
      });
    }
    setLoading(false);
    setShowSeasonForm(false);
    setSIsLegacy(false);
    toast.success(sIsLegacy ? "Legacy-Saison erstellt – Ergebnisse eintragen" : "Saison erstellt");
    await loadSeasons();
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
    if (res.ok) { toast.success(`Spieltag ${nextNum} – ${stIsSpecial ? stTitle : stGame} erstellt`); }
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
    if (res.ok) {
      toast.success("Spieltag aktualisiert");
      setEditingSpieltagId(null);
      await loadSeasons();
    } else {
      toast.error("Fehler beim Speichern");
    }
  }

  async function deleteSpieltag(id: string) {
    if (!confirm("Spieltag löschen?")) return;
    await fetch(`/api/lul/spieltage/${id}`, { method: "DELETE" });
    toast.success("Spieltag gelöscht");
    await loadSeasons();
  }

  const STATUS_OPTS = ["upcoming", "active", "finished", "archived"];
  const STATUS_LABEL: Record<string, string> = { upcoming: "Geplant", active: "Läuft", finished: "Beendet", archived: "Archiviert" };

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
          {/* Legacy toggle */}
          <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
            sIsLegacy ? "bg-purple-900/20 border-purple-800/40" : "bg-gray-800/40 border-gray-700/40"
          }`}>
            <input type="checkbox" checked={sIsLegacy} onChange={e => setSIsLegacy(e.target.checked)} className="rounded" />
            <div>
              <p className="text-sm font-medium text-white flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-purple-400" /> Vergangene Saison (Legacy-Import)
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Nur Endergebnis bekannt — Statistiken werden direkt als Gesamtwerte eingetragen.
              </p>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Saison-Nummer</label>
              <input type="number" min={1} value={sNumber} onChange={e => setSNumber(Number(e.target.value))}
                className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
            </div>
            {!sIsLegacy && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Anzahl Spieltage</label>
                <input type="number" min={1} value={sTotalSpieltage} onChange={e => setSTotalSpieltage(Number(e.target.value))}
                  className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2" />
              </div>
            )}
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
            className={`flex items-center gap-2 text-sm disabled:opacity-50 text-white rounded-lg px-4 py-2 ${
              sIsLegacy ? "bg-purple-700 hover:bg-purple-600" : "bg-amber-600 hover:bg-amber-500"
            }`}>
            {sIsLegacy ? <History className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
            {sIsLegacy ? "Legacy-Saison erstellen" : "Saison erstellen"}
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
                {season.isLegacy
                  ? <History className="w-5 h-5 text-purple-400 shrink-0" />
                  : <Trophy className="w-5 h-5 text-amber-400 shrink-0" />}
                <div className="min-w-0">
                  <p className="font-semibold text-white flex items-center gap-2">
                    {season.name ?? `Saison ${season.number}`}
                    {season.isLegacy && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-400 border border-purple-800/30 font-normal">
                        Legacy
                      </span>
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
                  <button
                    onClick={() => {
                      if (confirm(`Saison ${season.number} archivieren?\n\nDie Saison wird gesperrt und in das All-Time Leaderboard übertragen. Keine weiteren Änderungen möglich.`)) {
                        updateSeasonStatus(season.id, "archived");
                      }
                    }}
                    title="Saison archivieren"
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

            {isExpanded && season.isLegacy && (
              <div className="border-t border-white/5 p-4">
                <LegacyEditor seasonId={season.id} allUsers={allUsers} onRefresh={loadSeasons} />
              </div>
            )}

            {isExpanded && !season.isLegacy && (
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
                        {editingSpieltagId === st.id ? (
                          <div className="flex-1 space-y-2">
                            {/* Special Event toggle */}
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
                                    {TOURNAMENT_FORMATS.map(f => (
                                      <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
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
                                    <StatFieldEditor
                                      fields={editStatFields}
                                      onChange={setEditStatFields}
                                      isAvg={editTournamentFormat === "avg_stats"}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-gray-500 block mb-1">Spiel {editIsSpecial ? "(optional)" : "*"}</label>
                                <GameNameInput
                                  value={editGame}
                                  onChange={setEditGame}
                                  placeholder="z.B. Brawlhalla"
                                  className="w-full text-xs bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5"
                                />
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
                              <button onClick={() => setEditingSpieltagId(null)}
                                className="text-xs text-gray-500 hover:text-white px-2.5 py-1.5">
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
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-300 border border-violet-700/30 font-medium shrink-0">
                                    ⭐ Special
                                  </span>
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
                              className="text-gray-600 hover:text-amber-400 transition-colors p-1 rounded"
                              title="Spieltag bearbeiten">
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
                    {/* Special Event toggle */}
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
                            {TOURNAMENT_FORMATS.map(f => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
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
                            <StatFieldEditor
                              fields={stStatFields}
                              onChange={setStStatFields}
                              isAvg={stTournamentFormat === "avg_stats"}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Spiel / Disziplin {stIsSpecial ? "(optional)" : "*"}</label>
                        <GameNameInput
                          value={stGame}
                          onChange={setStGame}
                          placeholder="z.B. Brawlhalla"
                          className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2"
                        />
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
