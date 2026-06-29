"use client";
import { useState } from "react";
import { Shield } from "lucide-react";

export default function SyncDiscordRolesButton() {
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult]     = useState<string | null>(null);

  async function handleSync() {
    if (!confirm("Rang-Rollen für alle User auf Discord synchronisieren?")) return;
    setLoading(true);
    setResult(null);

    let offset     = 0;
    let totalSynced = 0;
    let totalFailed = 0;
    let total       = 0;
    const allErrors: string[] = [];

    try {
      while (true) {
        setProgress(`Verarbeite User ${offset + 1}–${offset + 15}…`);

        const res  = await fetch(`/api/admin/sync-discord-roles?offset=${offset}`, { method: "POST" });
        const data = await res.json() as {
          done: boolean; nextOffset: number; total: number;
          synced: number; failed: number; errors: string[];
        };

        total        = data.total;
        totalSynced += data.synced;
        totalFailed += data.failed;
        allErrors.push(...data.errors);

        if (data.done) break;
        offset = data.nextOffset;
      }

      let msg = `✅ ${totalSynced} / ${total} synchronisiert`;
      if (totalFailed > 0) {
        msg += ` · ⚠️ ${totalFailed} Fehler: ${allErrors.slice(0, 2).join(", ")}`;
      }
      setResult(msg);
    } catch {
      setResult("❌ Netzwerkfehler");
    }

    setProgress(null);
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {(progress || result) && (
        <span className="text-xs text-gray-400">{loading ? progress : result}</span>
      )}
      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-2 bg-indigo-900/40 hover:bg-indigo-800/50 disabled:opacity-50 text-indigo-300 text-sm font-medium px-4 py-2 rounded-lg border border-indigo-700/40 transition-colors"
      >
        <Shield className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
        {loading ? "Sync läuft…" : "Discord-Rollen sync"}
      </button>
    </div>
  );
}
