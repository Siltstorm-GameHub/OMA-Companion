"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function SyncMembersButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleSync() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/admin/sync-members", { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setResult(`✅ ${data.total} Mitglieder · ${data.created} neu · ${data.updated} aktualisiert · ${data.total - data.created - data.updated} unverändert`);
      router.refresh();
    } else {
      setResult(`❌ ${data.error}`);
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2">
      {result && <span className="text-xs text-gray-400">{result}</span>}
      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg border border-gray-700 transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Sync läuft..." : "Discord-Mitglieder sync"}
      </button>
    </div>
  );
}
