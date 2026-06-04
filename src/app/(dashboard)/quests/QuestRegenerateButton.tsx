"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function QuestRegenerateButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function regenerate() {
    const confirmed = await new Promise<boolean>((resolve) => {
      toast("Quests neu generieren?", {
        description: "Alle bisherigen Fortschritte gehen verloren.",
        action:  { label: "Ja, neu generieren", onClick: () => resolve(true)  },
        cancel:  { label: "Abbrechen",           onClick: () => resolve(false) },
        duration: 10000,
      });
    });
    if (!confirmed) return;

    setLoading(true);
    const toastId = toast.loading("Generiere neue Quests…");
    try {
      const res = await fetch("/api/quests", { method: "POST" });
      if (res.ok) {
        toast.success("Quests erfolgreich neu generiert", { id: toastId });
        router.refresh();
      } else {
        toast.error("Fehler beim Generieren", { id: toastId });
      }
    } catch {
      toast.error("Netzwerkfehler", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={regenerate}
      disabled={loading}
      title="Quests neu generieren"
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white glass border border-white/[0.08] hover:border-white/[0.15] px-3 py-2 rounded-lg transition-all disabled:opacity-50"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
      Neu generieren
    </button>
  );
}
