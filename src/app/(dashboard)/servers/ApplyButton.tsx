"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send, X } from "lucide-react";

export default function ApplyButton({ serverId, status, isFull }: { serverId: string; status: string; isFull: boolean }) {
  const [loading, setLoading] = useState(false);
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function apply() {
    setLoading(true);
    try {
      const res = await fetch(`/api/servers/${serverId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Bewerbung fehlgeschlagen");
        return;
      }
      toast.success("Bewerbung eingereicht");
      setShowMessageBox(false);
      setMessage("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    setLoading(true);
    try {
      const res = await fetch(`/api/servers/${serverId}/apply`, { method: "DELETE" });
      if (!res.ok) { toast.error("Fehler beim Zurückziehen"); return; }
      toast("Bewerbung zurückgezogen", { icon: <X className="w-4 h-4 text-gray-400" /> });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (status === "pending") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Bewerbung ausstehend
        </span>
        <button onClick={cancel} disabled={loading}
          className="text-xs px-2.5 py-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Zurückziehen"}
        </button>
      </div>
    );
  }

  if (isFull) {
    return (
      <button disabled className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-gray-600 cursor-not-allowed border border-white/[0.06]">
        Server voll
      </button>
    );
  }

  if (showMessageBox) {
    return (
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Kurze Nachricht (optional)"
          rows={2}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/20 resize-none"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={() => setShowMessageBox(false)} className="text-xs px-2.5 py-1.5 rounded-lg text-gray-500 hover:bg-white/8 transition-colors">
            Abbrechen
          </button>
          <button onClick={apply} disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Absenden
          </button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setShowMessageBox(true)}
      className="text-xs px-3 py-1.5 rounded-lg font-medium bg-teal-600 hover:bg-teal-500 text-white transition-colors">
      Bewerben
    </button>
  );
}
