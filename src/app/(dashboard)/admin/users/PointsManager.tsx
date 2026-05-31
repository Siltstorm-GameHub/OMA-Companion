"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export default function PointsManager({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    if (!amount || !reason) return;
    setLoading(true);
    await fetch("/api/admin/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount: Number(amount), reason }),
    });
    setAmount("");
    setReason("");
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg px-2 py-1.5 transition-colors"
      >
        <Plus className="w-3 h-3" /> Punkte
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        placeholder="±Punkte"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-20 text-xs bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5"
      />
      <input
        type="text"
        placeholder="Grund"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-28 text-xs bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5"
      />
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-lg px-2 py-1.5 disabled:opacity-50"
      >
        OK
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-white">✕</button>
    </div>
  );
}
