"use client";
import { useState } from "react";
import { Upload } from "@/components/icons";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SyncButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSync() {
    setLoading(true);
    const toastId = toast.loading("Sende Events an Discord...");
    try {
      const res  = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Events zu Discord gepusht", {
          id: toastId,
          description: `${data.created} neu · ${data.updated} aktualisiert${data.failed ? ` · ${data.failed} fehlgeschlagen` : ""}`,
        });
        router.refresh();
      } else {
        toast.error("Push fehlgeschlagen", {
          id: toastId,
          description: data.error ?? "Unbekannter Fehler",
        });
      }
    } catch {
      toast.error("Netzwerkfehler", {
        id: toastId,
        description: "Verbindung zu Discord fehlgeschlagen.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      className="flex items-center gap-2 glass hover:bg-line disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-card transition-all border border-line hover:border-line-strong"
    >
      <Upload className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
      {loading ? "Wird gepusht..." : "Zu Discord pushen"}
    </button>
  );
}
