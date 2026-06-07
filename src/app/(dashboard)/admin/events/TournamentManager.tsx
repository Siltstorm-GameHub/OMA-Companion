"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Trophy, Plus, Trash2, Clock, ChevronDown, ChevronUp,
  Save, X, Settings, Users, UserPlus, UserMinus, RotateCcw,
  RefreshCw, Lock, Unlock,
} from "lucide-react";

type User = { id: string; name: string | null; username: string | null; image: string | null };
type MatchEntry = {
  id: string; userId: string | null; teamId: string | null;
  placement: number | null; score: number | null; statsJson: string | null;
};
type Match = {
  id: string; round: number; position: number;
  title: string | null; scheduledAt: string | Date | null; notes: string | null;
  player1Id: string | null; player2Id: string | null;
  winnerId: string | null; score1: number | null; score2: number | null;
  playedAt: string | Date | null; entries: MatchEntry[];
};
type Participant = { userId: string; user: User };
type Tournament = {
  id: string; status: string; format: string;
  pointsConfig: string | null; statFields: string | null;
  participants: Participant[]; matches: Match[];
};
type Event = { id: string };

type RankingEntry = {
  placement: number;
  userId: string;
  user: { id: string; name: string | null; username: string | null; image: string | null } | null;
  score: number;
  label: string;
  coins: number;
  rankPts: number;
};

const FORMATS = [
  { value: "single_elimination", label: "Einzel-Eliminierung", desc: "Klassisches K.O.-System" },
  { value: "round_robin",        label: "Jeder gegen Jeden",   desc: "Alle spielen gegen alle" },
  { value: "liga",               label: "Liga",                desc: "Spieltage, Tabelle mit S/U/N" },
  { value: "ffa",                label: "Free for All",        desc: "Alle gegeneinander, Platzierung zählt" },
  { value: "coop_stats",         label: "Kooperativ (Stats)",  desc: "Alle zusammen, individuelle Stats" },
];

const STATUS_OPTIONS = ["active", "finished", "pending"];

const userName = (u: User) => u.username ?? u.name ?? "?";

function fmtDate(iso: string | Date) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Creation Form ────────────────────────────────────────────────────────────
function CreationForm({
  event, allUsers, onCreated,
}: {
  event: Event;
  allUsers: User[];
  onCreated: (t: Tournament) => void;
}) {
  const [format, setFormat]           = useState("single_elimination");
  // Münzen pro Platz
  const [coins1, setCoins1]           = useState(200);
  const [coins2, setCoins2]           = useState(100);
  const [coins3, setCoins3]           = useState(50);
  // Punkte (rankPoints) pro Platz — nur 1./2./3. geben Punkte
  const [pts1, setPts1]               = useState(100);
  const [pts2, setPts2]               = useState(50);
  const [pts3, setPts3]               = useState(25);
  // Liga
  const [coinsWin, setCoinsWin]       = useState(30);
  const [coinsDraw, setCoinsDraw]     = useState(10);
  const [statInput, setStatInput]     = useState("Kills, Assists, Punkte");
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [selected, setSelected]       = useState<string[]>([]);
  const [loading, setLoading]         = useState(false);

  const supportsAutoGenerate = format === "single_elimination" || format === "round_robin" || format === "liga";

  const AUTO_LABEL: Record<string, string> = {
    single_elimination: "KO-Baum automatisch aus Teilnehmern generieren",
    round_robin:        "Alle Paarungen (Jeder gegen Jeden) automatisch generieren",
    liga:               "Spielplan (Hin- & Rückrunde) automatisch generieren",
  };

  const AUTO_DESC: Record<string, string> = {
    single_elimination: "Zufällige Auslosung · BYE-Freilose werden automatisch vergeben",
    round_robin:        "Jeder spielt gegen jeden anderen genau einmal",
    liga:               "Alle Spieltage werden als Hin- & Rückrunde angelegt",
  };

  async function create() {
    setLoading(true);
    const config = format === "liga"
      ? { win: coinsWin, draw: coinsDraw }
      : {
          "1": { coins: coins1, points: pts1 },
          "2": { coins: coins2, points: pts2 },
          "3": { coins: coins3, points: pts3 },
        };
    const fields = (format === "ffa" || format === "coop_stats")
      ? statInput.split(",").map(s => s.trim()).filter(Boolean)
      : null;
    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: event.id, format, pointsConfig: config, statFields: fields,
        participantIds: selected.length ? selected : undefined,
        autoGenerate,
      }),
    });
    setLoading(false);
    if (res.ok) { toast.success("Turnier erstellt"); onCreated(await res.json()); }
    else { const e = await res.json(); toast.error(e.error ?? "Fehler beim Erstellen"); }
  }

  return (
    <div className="space-y-5">
      {/* Format */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Format</label>
        <div className="grid grid-cols-2 gap-2">
          {FORMATS.map(f => (
            <button key={f.value} onClick={() => setFormat(f.value)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                format === f.value
                  ? "border-rose-500 bg-rose-900/20 text-white"
                  : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
              }`}>
              <p className="text-sm font-medium">{f.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Points */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">
          {format === "liga" ? "🪙 Münzen pro Match-Ergebnis" : "Belohnungen pro Platzierung"}
        </label>
        {format === "liga" ? (
          <div className="flex gap-3">
            {([["🏆 Sieg", coinsWin, setCoinsWin], ["🤝 Unentschieden", coinsDraw, setCoinsDraw]] as const).map(
              ([label, val, set]) => (
                <div key={label} className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">{label}</label>
                  <input type="number" value={val} min={0}
                    onChange={e => (set as (v: number) => void)(Number(e.target.value))}
                    className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-center"
                  />
                  <p className="text-[10px] text-gray-600 mt-1 text-center">nur 🪙 Münzen</p>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Spalten-Header */}
            <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-500 uppercase tracking-wide px-1">
              <span>Platz</span>
              <span className="text-center">🪙 Münzen</span>
              <span className="text-center">⭐ Punkte</span>
            </div>
            {([
              ["🥇 1. Platz", coins1, setCoins1, pts1, setPts1],
              ["🥈 2. Platz", coins2, setCoins2, pts2, setPts2],
              ["🥉 3. Platz", coins3, setCoins3, pts3, setPts3],
            ] as const).map(([label, cVal, cSet, pVal, pSet]) => (
              <div key={label} className="grid grid-cols-3 gap-2 items-center">
                <span className="text-xs text-gray-300 font-medium">{label}</span>
                <input type="number" value={cVal} min={0}
                  onChange={e => (cSet as (v: number) => void)(Number(e.target.value))}
                  className="text-sm bg-gray-800 border border-gray-700 text-amber-300 rounded-lg px-2 py-1.5 text-center w-full"
                />
                <input type="number" value={pVal} min={0}
                  onChange={e => (pSet as (v: number) => void)(Number(e.target.value))}
                  className="text-sm bg-gray-800 border border-gray-700 text-teal-300 rounded-lg px-2 py-1.5 text-center w-full"
                />
              </div>
            ))}
            <p className="text-[10px] text-gray-600 pt-1">Münzen gehen an alle Platzierten · Punkte nur an 1./2./3.</p>
          </div>
        )}
      </div>

      {/* Stat fields */}
      {(format === "ffa" || format === "coop_stats") && (
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Statistik-Felder (kommagetrennt)</label>
          <input type="text" value={statInput} onChange={e => setStatInput(e.target.value)}
            placeholder="z.B. Kills, Assists, Punkte"
            className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2"
          />
        </div>
      )}

      {/* Auto-generate bracket / schedule */}
      {supportsAutoGenerate && (
        <div className={`rounded-xl border p-4 transition-colors ${
          autoGenerate ? "border-rose-500/40 bg-rose-950/20" : "border-gray-700 bg-gray-800/30"
        }`}>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoGenerate}
              onChange={e => {
                setAutoGenerate(e.target.checked);
                if (e.target.checked && selected.length === 0) {
                  // Alle registrierten Teilnehmer vorauswählen
                  setSelected(allUsers.map(u => u.id));
                }
              }}
              className="rounded mt-0.5 shrink-0"
            />
            <div>
              <p className="text-sm font-medium text-white">{AUTO_LABEL[format]}</p>
              <p className="text-xs text-gray-500 mt-0.5">{AUTO_DESC[format]}</p>
            </div>
          </label>

          {autoGenerate && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Teilnehmer auswählen
                  <span className="text-rose-400 font-semibold ml-1">({selected.length} von {allUsers.length})</span>
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelected(allUsers.map(u => u.id))}
                    className="text-[11px] text-gray-500 hover:text-white transition-colors">
                    Alle
                  </button>
                  <span className="text-gray-700">·</span>
                  <button type="button" onClick={() => setSelected([])}
                    className="text-[11px] text-gray-500 hover:text-white transition-colors">
                    Keine
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {allUsers.map(u => (
                  <label key={u.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                    selected.includes(u.id) ? "bg-rose-900/30 border border-rose-800/50" : "bg-gray-800 hover:bg-gray-700 border border-transparent"
                  }`}>
                    <input type="checkbox"
                      checked={selected.includes(u.id)}
                      onChange={e => setSelected(e.target.checked
                        ? [...selected, u.id]
                        : selected.filter(id => id !== u.id)
                      )}
                      className="rounded shrink-0"
                    />
                    <span className="text-white truncate">{userName(u)}</span>
                  </label>
                ))}
              </div>
              {selected.length >= 2 && format === "round_robin" && (
                <p className="text-[11px] text-gray-600">
                  → {selected.length} Spieler · {(selected.length * (selected.length - 1)) / 2} Matches
                </p>
              )}
              {selected.length >= 2 && format === "liga" && (
                <p className="text-[11px] text-gray-600">
                  → {selected.length} Spieler · {selected.length * (selected.length - 1)} Matches ({(selected.length - 1)} Spieltage)
                </p>
              )}
              {selected.length >= 2 && format === "single_elimination" && (
                <p className="text-[11px] text-gray-600">
                  → {selected.length} Spieler · {Math.ceil(Math.log2(selected.length))} Runden
                </p>
              )}
              {selected.length < 2 && (
                <p className="text-[11px] text-amber-600">Mindestens 2 Teilnehmer auswählen.</p>
              )}
            </div>
          )}
        </div>
      )}

      <button onClick={create} disabled={loading}
        className="flex items-center gap-2 text-sm bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg px-4 py-2">
        <Trophy className="w-4 h-4" /> Turnier erstellen
      </button>
    </div>
  );
}

// ─── Main Manager (tournament exists) ────────────────────────────────────────
export default function TournamentManager({
  event, tournament: initial, allUsers,
}: {
  event: Event;
  tournament: Tournament | null;
  allUsers: User[];
}) {
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(initial);
  const [loading, setLoading] = useState(false);

  // ── Panel visibility ──────────────────────────────────────────────────
  const [showSettings, setShowSettings]     = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showAdd, setShowAdd]               = useState(false);
  const [showFinalize, setShowFinalize]     = useState(false);
  const [rankingPreview, setRankingPreview] = useState<RankingEntry[] | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);

  // ── Settings edit state ───────────────────────────────────────────────
  const initSettings = () => {
    if (!tournament) return { status: "active", pts1: 100, pts2: 50, pts3: 25, ptsWin: 3, ptsDraw: 1, statInput: "" };
    const pc: Record<string, number | { coins?: number; points?: number }> =
      tournament.pointsConfig ? JSON.parse(tournament.pointsConfig) : {};
    const sf = tournament.statFields ? JSON.parse(tournament.statFields) : [];
    const extract = (v: number | { coins?: number; points?: number } | undefined, fallback: number): number => {
      if (v == null) return fallback;
      return typeof v === "number" ? v : (v.points ?? v.coins ?? fallback);
    };
    return {
      status:    tournament.status,
      pts1:      extract(pc["1"],   100),
      pts2:      extract(pc["2"],   50),
      pts3:      extract(pc["3"],   25),
      ptsWin:    extract(pc["win"], 3),
      ptsDraw:   extract(pc["draw"],1),
      statInput: sf.join(", "),
    };
  };
  const [settings, setSettings] = useState(initSettings);

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

  if (!tournament) {
    return (
      <CreationForm
        event={event}
        allUsers={allUsers}
        onCreated={(t) => { setTournament(t); router.refresh(); }}
      />
    );
  }

  // ── Derived ──────────────────────────────────────────────────────────
  const isFfa  = tournament.format === "ffa" || tournament.format === "coop_stats";
  const isLiga = tournament.format === "liga";
  const is1v1  = !isFfa;
  const isRoundRobin = tournament.format === "round_robin";
  const statFields: string[] = tournament.statFields ? JSON.parse(tournament.statFields) : [];
  // pointsConfig kann zwei Formate haben:
  //   Erstellung: {"1": {coins: 200, points: 100}, ...} oder {"win": 30, "draw": 10}
  //   Einstellungen: {"1": 100, ...} (nur Punkte)
  const pointsConfigRaw: Record<string, number | { coins: number; points: number }> =
    tournament.pointsConfig ? JSON.parse(tournament.pointsConfig) : {};
  // Normalisierung: extrahiert immer eine Zahl (bei Objekt: points-Wert)
  const getConfigVal = (key: string): number => {
    const v = pointsConfigRaw[key];
    if (v == null) return 0;
    return typeof v === "number" ? v : (v.points ?? v.coins ?? 0);
  };
  const getCoinsVal = (key: string): number => {
    const v = pointsConfigRaw[key];
    if (v == null) return 0;
    return typeof v === "number" ? v : (v.coins ?? 0);
  };
  // Für Anzeige im Header (Münzen oder Punkte)
  const pointsConfig = pointsConfigRaw as Record<string, number>;
  const rounds = tournament.matches.length ? Math.max(...tournament.matches.map(m => m.round)) : 0;
  const formatLabel = FORMATS.find(f => f.value === tournament.format)?.label ?? tournament.format;

  // ── Handlers ─────────────────────────────────────────────────────────

  async function reload() {
    const res = await fetch(`/api/events/${event.id}`).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      if (data.tournament) setTournament(data.tournament);
    }
    router.refresh();
  }

  async function deleteTournament() {
    if (!tournament || !confirm("Turnier wirklich löschen? Alle Matches werden entfernt.")) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      toast.success("Turnier gelöscht");
      setTournament(null);
      router.refresh();
    } else {
      toast.error("Fehler beim Löschen des Turniers");
    }
  }

  async function saveSettings() {
    if (!tournament) return;
    setLoading(true);
    const isLigaFmt = tournament.format === "liga";
    const config = isLigaFmt
      ? { win: settings.ptsWin, draw: settings.ptsDraw }
      : { "1": settings.pts1, "2": settings.pts2, "3": settings.pts3 };
    const fields = (tournament.format === "ffa" || tournament.format === "coop_stats")
      ? settings.statInput.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      : null;
    const res = await fetch(`/api/tournaments/${tournament.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status:       settings.status,
        pointsConfig: config,
        ...(fields !== null && { statFields: fields }),
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTournament(prev => prev ? { ...prev, status: updated.status, pointsConfig: updated.pointsConfig, statFields: updated.statFields } : prev);
      setShowSettings(false);
    }
    setLoading(false);
    router.refresh();
  }

  async function generateRoundRobinMatches() {
    if (!tournament || !confirm("Alle Paarungen automatisch aus den aktuellen Teilnehmern generieren?")) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generateMatches: "round_robin" }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      toast.success(`${data.generated} Matches generiert`);
    } else {
      const e = await res.json();
      toast.error(e.error ?? "Fehler beim Generieren");
    }
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
    if (!tournament || !confirm("Teilnehmer aus dem Turnier entfernen?")) return;
    setLoading(true);
    await fetch(`/api/tournaments/${tournament.id}/participants`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setLoading(false);
    setTournament(prev => prev ? { ...prev, participants: prev.participants.filter(p => p.userId !== userId) } : prev);
  }

  async function addMatch() {
    if (!tournament) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: mTitle || null, scheduledAt: mScheduled ? new Date(mScheduled).toISOString() : null,
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

  async function submit1v1(matchId: string, winnerId: string | null, isDraw = false) {
    if (!tournament) return;
    const s = scores1v1[matchId];
    setLoading(true);
    await fetch(`/api/tournaments/${tournament.id}/matches`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId, winnerId, isDraw,
        score1: s?.s1 ? Number(s.s1) : null,
        score2: s?.s2 ? Number(s.s2) : null,
      }),
    });
    setLoading(false);
    router.refresh();
  }

  async function resetMatch(matchId: string) {
    if (!tournament || !confirm("Ergebnis dieses Matches zurücksetzen?")) return;
    setLoading(true);
    await fetch(`/api/tournaments/${tournament.id}/matches`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, action: "reset" }),
    });
    setLoading(false);
    router.refresh();
  }

  async function submitFfa(matchId: string, matchEntries: MatchEntry[]) {
    if (!tournament) return;
    const ed = ffaEdits[matchId] ?? {};
    const updated = matchEntries.map(e => {
      const row = ed[e.userId ?? ""] ?? {};
      const stats: Record<string, number> = {};
      statFields.forEach(f => { if (row[f]) stats[f] = Number(row[f]); });
      return {
        id: e.id,
        statsJson: Object.keys(stats).length ? stats : null,
      };
    });
    setLoading(true);
    await fetch(`/api/tournaments/${tournament.id}/matches`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, entries: updated }),
    });
    setLoading(false);
    router.refresh();
  }

  async function deleteMatch(matchId: string) {
    if (!tournament || !confirm("Match löschen?")) return;
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

  async function openFinalize() {
    if (!tournament) return;
    setRankingLoading(true);
    setShowFinalize(true);
    setShowSettings(false);
    setShowParticipants(false);
    const res = await fetch(`/api/tournaments/${tournament.id}/ranking`);
    if (res.ok) {
      const data = await res.json();
      setRankingPreview(data.ranking);
    } else {
      toast.error("Rangliste konnte nicht geladen werden");
    }
    setRankingLoading(false);
  }

  async function confirmFinalize() {
    if (!tournament || !rankingPreview) return;
    setLoading(true);
    const res = await fetch(`/api/tournaments/${tournament.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "finished",
        finalRanking: rankingPreview.map(r => r.userId),
      }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Turnier abgeschlossen & Punkte vergeben!");
      setShowFinalize(false);
      setRankingPreview(null);
      setTournament(prev => prev ? { ...prev, status: "finished" } : prev);
      router.refresh();
    } else {
      toast.error("Fehler beim Abschließen");
    }
  }

  function moveRankingUp(index: number) {
    if (!rankingPreview || index === 0) return;
    const updated = [...rankingPreview];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setRankingPreview(updated.map((r, i) => ({ ...r, placement: i + 1 })));
  }

  function moveRankingDown(index: number) {
    if (!rankingPreview || index === rankingPreview.length - 1) return;
    const updated = [...rankingPreview];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setRankingPreview(updated.map((r, i) => ({ ...r, placement: i + 1 })));
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

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">

      {/* ── Header bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-rose-900/40 text-rose-300 px-2 py-1 rounded-full">{formatLabel}</span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            tournament.status === "active"   ? "bg-green-900/40 text-green-300" :
            tournament.status === "finished" ? "bg-gray-800 text-gray-500"      :
                                               "bg-amber-900/40 text-amber-300"
          }`}>{tournament.status}</span>
          {Object.keys(pointsConfigRaw).length > 0 && (
            tournament.format === "liga"
              ? <span className="text-xs text-gray-500">🏆{getCoinsVal("win")} 🤝{getCoinsVal("draw")} 🪙</span>
              : <span className="text-xs text-gray-500">🥇{getConfigVal("1")} 🥈{getConfigVal("2")} 🥉{getConfigVal("3")} Pts</span>
          )}
          {statFields.length > 0 && (
            <span className="text-xs text-gray-600">Stats: {statFields.join(", ")}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { setShowSettings(!showSettings); setShowParticipants(false); }}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
              showSettings ? "bg-gray-700 text-white" : "text-gray-500 hover:text-white hover:bg-gray-800"
            }`}>
            <Settings className="w-3.5 h-3.5" /> Einstellungen
          </button>
          <button onClick={() => { setShowParticipants(!showParticipants); setShowSettings(false); }}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
              showParticipants ? "bg-gray-700 text-white" : "text-gray-500 hover:text-white hover:bg-gray-800"
            }`}>
            <Users className="w-3.5 h-3.5" /> Teilnehmer ({tournament.participants.length})
          </button>
          {tournament.status !== "finished" && (
            <button onClick={openFinalize} disabled={loading}
              className="flex items-center gap-1 text-xs bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-600/30 px-2 py-1 rounded transition-colors disabled:opacity-50">
              <Trophy className="w-3.5 h-3.5" /> Abschließen
            </button>
          )}
          <button onClick={deleteTournament} disabled={loading}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 hover:bg-red-900/20 px-2 py-1 rounded transition-colors disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" /> Löschen
          </button>
        </div>
      </div>

      {/* ── Finalize panel ───────────────────────────────────────────── */}
      {showFinalize && (
        <div className="border border-amber-700/40 rounded-xl p-4 bg-amber-950/10 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-300 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Endplatzierung bestätigen
            </p>
            <button onClick={() => { setShowFinalize(false); setRankingPreview(null); }}
              className="text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-400">
            Überprüfe die Endplatzierung und passe sie bei Bedarf an. Erst nach Bestätigung werden Punkte vergeben.
          </p>

          {rankingLoading && (
            <p className="text-sm text-gray-500 text-center py-4">Rangliste wird berechnet…</p>
          )}

          {rankingPreview && !rankingLoading && (
            <div className="space-y-2">
              {rankingPreview.map((entry, idx) => {
                const medals   = ["🥇", "🥈", "🥉"];
                // Robuster Fallback: name > username > "Unbekannt"
                const name     = (entry.user?.name || entry.user?.username)
                  ?? allUsers.find(u => u.id === entry.userId)?.name
                  ?? allUsers.find(u => u.id === entry.userId)?.username
                  ?? "Unbekannt";
                const avatar   = entry.user?.image ?? allUsers.find(u => u.id === entry.userId)?.image;
                const hasReward = entry.coins > 0 || entry.rankPts > 0;
                return (
                  <div key={entry.userId}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    style={{ background: idx < 3 ? "rgba(245,158,11,0.07)" : "rgba(255,255,255,0.03)", border: `1px solid ${idx < 3 ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.06)"}` }}>

                    {/* Platz */}
                    <span className="text-base w-6 text-center shrink-0">
                      {idx < 3 ? medals[idx] : <span className="text-xs text-gray-500">{idx + 1}.</span>}
                    </span>

                    {/* Avatar + Name */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {avatar
                        ? <img src={avatar} alt="" className="w-6 h-6 rounded-full shrink-0 object-cover" />
                        : <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-300 shrink-0">
                            {name[0]?.toUpperCase() ?? "?"}
                          </div>
                      }
                      <span className="text-sm font-medium text-white truncate">{name}</span>
                    </div>

                    {/* Score */}
                    <span className="text-xs text-gray-500 shrink-0">{entry.label}</span>

                    {/* Belohnung */}
                    {hasReward && (
                      <span className="text-xs text-amber-400 shrink-0 font-semibold">
                        {entry.coins > 0 && `+${entry.coins}🪙`}
                        {entry.rankPts > 0 && ` +${entry.rankPts}⭐`}
                      </span>
                    )}

                    {/* Reihenfolge ändern */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button onClick={() => moveRankingUp(idx)} disabled={idx === 0}
                        className="text-gray-600 hover:text-white disabled:opacity-20 transition-colors leading-none px-1">
                        ▲
                      </button>
                      <button onClick={() => moveRankingDown(idx)} disabled={idx === rankingPreview.length - 1}
                        className="text-gray-600 hover:text-white disabled:opacity-20 transition-colors leading-none px-1">
                        ▼
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {rankingPreview && !rankingLoading && (
            <button onClick={confirmFinalize} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #b45309, #d97706)" }}>
              <Trophy className="w-4 h-4" />
              {loading ? "Wird abgeschlossen…" : "Bestätigen & Punkte vergeben"}
            </button>
          )}
        </div>
      )}

      {/* ── Settings panel ───────────────────────────────────────────── */}
      {showSettings && (
        <div className="border border-gray-700 rounded-xl p-4 bg-gray-800/30 space-y-4">
          <p className="text-sm font-medium text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-400" /> Turnier bearbeiten
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Status</label>
              <select value={settings.status} onChange={e => setSettings(s => ({ ...s, status: e.target.value }))}
                className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">
              {tournament.format === "liga" ? "Ligapunkte" : "Punkte pro Platzierung"}
            </label>
            {tournament.format === "liga" ? (
              <div className="flex gap-3">
                {([["🏆 Sieg", "ptsWin"], ["🤝 Unentschieden", "ptsDraw"]] as const).map(([label, key]) => (
                  <div key={key} className="flex-1">
                    <label className="text-xs text-gray-600 block mb-1">{label}</label>
                    <input type="number" value={settings[key]} min={0}
                      onChange={e => setSettings(s => ({ ...s, [key]: Number(e.target.value) }))}
                      className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-center"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3">
                {([["🥇 1.", "pts1"], ["🥈 2.", "pts2"], ["🥉 3.", "pts3"]] as const).map(([label, key]) => (
                  <div key={key} className="flex-1">
                    <label className="text-xs text-gray-600 block mb-1">{label}</label>
                    <input type="number" value={settings[key]} min={0}
                      onChange={e => setSettings(s => ({ ...s, [key]: Number(e.target.value) }))}
                      className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-center"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          {(tournament.format === "ffa" || tournament.format === "coop_stats") && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Statistik-Felder (kommagetrennt)</label>
              <input type="text" value={settings.statInput}
                onChange={e => setSettings(s => ({ ...s, statInput: e.target.value }))}
                className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={saveSettings} disabled={loading}
              className="flex items-center gap-1.5 text-sm bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg px-3 py-2">
              <Save className="w-3.5 h-3.5" /> Speichern
            </button>
            <button onClick={() => setShowSettings(false)} className="text-sm text-gray-500 hover:text-white px-3 py-2">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ── Participants panel ────────────────────────────────────────── */}
      {showParticipants && (
        <div className="border border-gray-700 rounded-xl p-4 bg-gray-800/30 space-y-3">
          <p className="text-sm font-medium text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" /> Teilnehmer verwalten
          </p>

          {/* Current participants */}
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
            {tournament.participants.map(p => (
              <div key={p.userId} className="flex items-center gap-2 bg-gray-800 rounded-lg px-2.5 py-1.5">
                {p.user.image ? (
                  <img src={p.user.image} alt="" className="w-5 h-5 rounded-full shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-rose-900/40 flex items-center justify-center text-[9px] font-bold text-rose-400 shrink-0">
                    {userName(p.user)[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-white truncate flex-1">{userName(p.user)}</span>
                <button onClick={() => removeParticipant(p.userId)} disabled={loading}
                  className="text-gray-600 hover:text-red-500 transition-colors shrink-0">
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {tournament.participants.length === 0 && (
              <p className="text-xs text-gray-600 col-span-2">Noch keine Teilnehmer.</p>
            )}
          </div>

          {/* Add participant */}
          {notInTournament.length > 0 && (
            <div className="flex gap-2">
              <select value={addParticipantId} onChange={e => setAddParticipantId(e.target.value)}
                className="flex-1 text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2">
                <option value="">Teilnehmer hinzufügen…</option>
                {notInTournament.map(u => (
                  <option key={u.id} value={u.id}>{userName(u)}</option>
                ))}
              </select>
              <button onClick={addParticipant} disabled={loading || !addParticipantId}
                className="flex items-center gap-1.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg px-3 py-2">
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Round Robin auto-generate */}
          {isRoundRobin && tournament.participants.length >= 2 && (
            <button onClick={generateRoundRobinMatches} disabled={loading}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-900/40 rounded-lg px-3 py-2 transition-colors w-full justify-center">
              <RefreshCw className="w-3.5 h-3.5" />
              Alle Paarungen automatisch generieren ({tournament.participants.length} Spieler → {(tournament.participants.length * (tournament.participants.length - 1)) / 2} Matches)
            </button>
          )}
        </div>
      )}

      {/* ── Match list ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        {tournament.matches.length === 0 && (
          <div className="text-center py-6 bg-gray-800/50 rounded-lg text-gray-500 text-sm border border-gray-700 border-dashed">
            {isRoundRobin
              ? 'Öffne "Teilnehmer" und klicke auf "Paarungen generieren".'
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
                    {rMatches.map(match => {
                      const p1 = allUsers.find(u => u.id === match.player1Id);
                      const p2 = allUsers.find(u => u.id === match.player2Id);
                      const isPlayed  = !!match.winnerId || !!match.playedAt;
                      const isDraw    = !!match.playedAt && !match.winnerId;
                      const isPending = !!p1 && !!p2 && !isPlayed;
                      return (
                        <div key={match.id}
                          className={`rounded-lg border overflow-hidden ${
                            isPlayed ? "border-gray-700 opacity-80" : "border-gray-600"
                          }`}>
                          {/* Match header */}
                          <div className="px-3 py-1.5 bg-gray-800 border-b border-gray-700 flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-400 truncate">
                              {match.title || `Match ${match.position}`}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {match.scheduledAt && (
                                <span className="text-xs text-gray-600 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />{fmtDate(match.scheduledAt)}
                                </span>
                              )}
                              {isPlayed && (
                                <button onClick={() => resetMatch(match.id)} disabled={loading}
                                  title="Ergebnis zurücksetzen"
                                  className="text-gray-600 hover:text-amber-500 transition-colors">
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => deleteMatch(match.id)} disabled={loading}
                                className="text-gray-600 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
                                <input type="number" placeholder="0" min={0}
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

                          {/* Win buttons */}
                          {isPending && (
                            <div className="flex gap-1 p-2 bg-gray-800/50">
                              <button onClick={() => submit1v1(match.id, match.player1Id!)} disabled={loading}
                                className="flex-1 text-xs bg-gray-700 hover:bg-rose-600 text-white rounded px-2 py-1.5 transition-colors truncate">
                                {p1 ? userName(p1) : "?"} gewinnt
                              </button>
                              {isLiga && (
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          : /* ── FFA / coop view ─────────────────────────────────────── */
            tournament.matches.map(match => {
              const isExp    = expanded.has(match.id);
              const isPlayed = !!match.playedAt;
              const ed       = ffaEdits[match.id] ?? {};
              return (
                <div key={match.id}
                  className={`rounded-lg border overflow-hidden ${isPlayed ? "border-gray-700" : "border-gray-600"}`}>
                  <button
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-800 hover:bg-gray-750 text-left"
                    onClick={() => setExpanded(prev => { const s = new Set(prev); s.has(match.id) ? s.delete(match.id) : s.add(match.id); return s; })}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-white">{match.title || `Match ${match.position}`}</span>
                      {match.scheduledAt && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{fmtDate(match.scheduledAt)}
                        </span>
                      )}
                      {isPlayed && (
                        <span className="text-xs bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded-full">Gespielt</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500">{match.entries.length} Spieler</span>
                      {isExp ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </button>

                  {isExp && (
                    <div className="p-3">
                      {match.notes && <p className="text-xs text-gray-500 mb-3">{match.notes}</p>}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500 border-b border-gray-700">
                              <th className="text-left py-1.5 pr-3 font-medium">Spieler</th>
                              {statFields.map(f => (
                                <th key={f} className="text-center py-1.5 px-2 font-medium">{f}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {match.entries.map(entry => {
                              const user    = allUsers.find(u => u.id === entry.userId);
                              const existing: Record<string, number> = entry.statsJson ? JSON.parse(entry.statsJson) : {};
                              const row     = ed[entry.userId ?? ""] ?? {};
                              return (
                                <tr key={entry.id} className="border-b border-gray-800 last:border-0">
                                  <td className="py-1.5 pr-3 text-white whitespace-nowrap">
                                    {user ? userName(user) : "?"}
                                  </td>
                                  {statFields.map(f => (
                                    <td key={f} className="py-1 px-2 text-center">
                                      <input type="number" placeholder="–"
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
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => submitFfa(match.id, match.entries)} disabled={loading}
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
            })}
      </div>

      {/* ── Add Match ────────────────────────────────────────────────── */}
      {!showAdd ? (
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-4 py-2 w-full justify-center transition-colors">
          <Plus className="w-4 h-4" /> Match hinzufügen
        </button>
      ) : (
        <div className="border border-rose-800 rounded-lg p-4 bg-rose-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">Neues Match</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
                  <input type="number" min={1} value={mRound} onChange={e => setMRound(Number(e.target.value))}
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

          {isFfa && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Teilnehmer ({mFfaIds.length} gewählt)</label>
              <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
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

          <div>
            <label className="text-xs text-gray-500 block mb-1">Notizen (optional)</label>
            <input type="text" value={mNotes} onChange={e => setMNotes(e.target.value)}
              placeholder="z.B. Map: Verdansk, Server: EU"
              className="w-full text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2"
            />
          </div>

          <button onClick={addMatch} disabled={loading || (isFfa && mFfaIds.length === 0)}
            className="flex items-center gap-2 text-sm bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg px-4 py-2">
            <Plus className="w-4 h-4" /> Match erstellen
          </button>
        </div>
      )}
    </div>
  );
}
