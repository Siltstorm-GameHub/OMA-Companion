"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function QuestRegenerateButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function regenerate() {
    if (!confirm("Quests für diesen Monat neu generieren? Alle bisherigen Fortschritte gehen verloren.")) return;
    setLoading(true);
    await fetch("/api/quests", { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={regenerate} disabled={loading}
      title="Quests neu generieren"
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
      <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
      Neu generieren
    </button>
  );
}
