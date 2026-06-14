"use client";
import { useState } from "react";
import { toast } from "sonner";
import { History, Save, UserPlus, X } from "lucide-react";
import type { User } from "./lul-types";
import { uname } from "./lul-types";

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

export default function LulLegacyImport({
  seasonId, allUsers, onRefresh,
}: {
  seasonId: string;
  allUsers: User[];
  onRefresh: () => void;
}) {
  const [rows, setRows]         = useState<LegacyRow[]>([]);
  const [loaded, setLoaded]     = useState(false);
  const [loading, setLoading]   = useState(false);
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
  const available    = allUsers.filter(u => !alreadyAdded.has(u.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" /> Saison-Endergebnis eintragen
        </p>
        <p className="text-xs text-gray-500">{rows.length} Spieler</p>
      </div>

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
                <th className="px-2 py-2" />
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
