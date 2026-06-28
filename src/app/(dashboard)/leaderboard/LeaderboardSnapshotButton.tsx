"use client";
import { useState } from "react";
import { Camera } from "lucide-react";

export default function LeaderboardSnapshotButton({
  snapshotTakenAt,
}: {
  snapshotTakenAt: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [takenAt, setTakenAt] = useState(snapshotTakenAt);

  async function takeSnapshot() {
    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard/snapshot", { method: "POST" });
      const data = await res.json();
      if (data.takenAt) setTakenAt(data.takenAt);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={takeSnapshot}
      disabled={loading}
      title={takenAt
        ? `Snapshot: ${new Date(takenAt).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`
        : "Snapshot erstellen"}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] transition-all disabled:opacity-50"
    >
      <Camera className="w-3.5 h-3.5" />
      {loading ? "..." : "Snapshot"}
    </button>
  );
}
