"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PointsManager({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen]       = useState(false);
  const [amount, setAmount]   = useState("");
  const [reason, setReason]   = useState("");
  const [mode, setMode]       = useState<"add" | "sub">("add");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function reset() { setAmount(""); setReason(""); setMode("add"); setOpen(false); }

  async function handleSubmit() {
    const num = parseInt(amount);
    if (!num || num <= 0 || !reason.trim()) {
      toast.error("Betrag und Grund sind Pflicht");
      return;
    }
    setLoading(true);
    try {
      const finalAmount = mode === "sub" ? -num : num;
      const res = await fetch("/api/admin/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: finalAmount, reason: reason.trim() }),
      });
      if (res.ok) {
        toast.success(
          `${mode === "add" ? "+" : "-"}${num} Münzen an ${userName}`,
          { description: reason.trim() }
        );
        reset();
        router.refresh();
      } else {
        toast.error("Fehler beim Vergeben der Münzen");
      }
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs glass hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] text-gray-400 hover:text-white rounded-lg px-2 py-1.5 transition-all"
      >
        <Plus className="w-3 h-3" /> Münzen
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* +/- Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
        <button
          onClick={() => setMode("add")}
          className={`px-2 py-1.5 text-xs font-bold transition-colors ${mode === "add" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/[0.03] text-gray-600 hover:text-gray-400"}`}
        >
          <Plus className="w-3 h-3" />
        </button>
        <button
          onClick={() => setMode("sub")}
          className={`px-2 py-1.5 text-xs font-bold transition-colors ${mode === "sub" ? "bg-red-500/20 text-red-400" : "bg-white/[0.03] text-gray-600 hover:text-gray-400"}`}
        >
          <Minus className="w-3 h-3" />
        </button>
      </div>

      <input
        type="number"
        min="1"
        placeholder="Münzen"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-20 text-xs glass border border-white/[0.08] text-white rounded-lg px-2 py-1.5 focus:border-rose-500/40 focus:outline-none"
      />
      <input
        type="text"
        placeholder="Grund"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        className="w-32 text-xs glass border border-white/[0.08] text-white rounded-lg px-2 py-1.5 focus:border-rose-500/40 focus:outline-none"
      />
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
      </button>
      <button
        onClick={reset}
        className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
