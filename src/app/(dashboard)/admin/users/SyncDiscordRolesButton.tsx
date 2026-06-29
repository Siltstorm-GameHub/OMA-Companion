"use client";
import { useState } from "react";
import { Shield } from "lucide-react";

export default function SyncDiscordRolesButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    if (!confirm("Rang-Rollen für alle User auf Discord synchronisieren?")) return;
    setLoading(true);
    setResult(null);
    try {
      const res  = await fetch("/api/admin/sync-discord-roles", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setResult(`✅ ${data.synced} / ${data.total} User synchronisiert${data.failed > 0 ? ` · ⚠️ ${data.failed} Fehler` : ""}`);
      } else {
        setResult(`❌ Fehler`);
      }
    } catch {
      setResult("❌ Netzwerkfehler");
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2">
      {result && <span className="text-xs text-gray-400">{result}</span>}
      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-2 bg-indigo-900/40 hover:bg-indigo-800/50 disabled:opacity-50 text-indigo-300 text-sm font-medium px-4 py-2 rounded-lg border border-indigo-700/40 transition-colors"
      >
        <Shield className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
        {loading ? "Sync läuft..." : "Discord-Rollen sync"}
      </button>
    </div>
  );
}
