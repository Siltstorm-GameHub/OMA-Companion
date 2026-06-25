"use client";
import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushSubscribeButton() {
  const [status, setStatus] = useState<"loading" | "unsupported" | "denied" | "subscribed" | "idle">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        setStatus(sub ? "subscribed" : "idle");
      }),
    );
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        toast.error("Push-Benachrichtigungen nicht konfiguriert (VAPID-Key fehlt)");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      // Alte Subscription bereinigen (z.B. nach VAPID-Key-Wechsel),
      // da pushManager.subscribe() sonst mit einem Konfliktfehler abbricht.
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      if (!res.ok) {
        await sub.unsubscribe();
        const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        toast.error(`Fehler beim Speichern: ${error}`);
        return;
      }

      setStatus("subscribed");
      toast.success("Push-Benachrichtigungen aktiviert");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[PushSubscribe]", err);
      toast.error(`Fehler: ${msg}`);
      setStatus("idle");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      setStatus("idle");
      toast.success("Push-Benachrichtigungen deaktiviert");
    } catch {
      toast.error("Fehler beim Deaktivieren");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading")     return null;
  if (status === "unsupported") return null;

  if (status === "denied") {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
        <BellOff className="w-4 h-4 flex-shrink-0" />
        <span>Benachrichtigungen im Browser blockiert – bitte in den Browser-Einstellungen erlauben</span>
      </div>
    );
  }

  if (status === "subscribed") {
    return (
      <button
        onClick={unsubscribe}
        disabled={busy}
        className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-colors hover:bg-white/[0.05] text-teal-400"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
        <span>Push-Benachrichtigungen aktiv</span>
      </button>
    );
  }

  return (
    <button
      onClick={subscribe}
      disabled={busy}
      className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-colors hover:bg-white/[0.05] text-gray-300 hover:text-white"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
      <span>Push-Benachrichtigungen aktivieren</span>
    </button>
  );
}
