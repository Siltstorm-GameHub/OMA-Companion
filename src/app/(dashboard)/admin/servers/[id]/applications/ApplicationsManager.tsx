"use client";
import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Check, X, Ban, Loader2 } from "lucide-react";

type User = { id: string; name: string | null; username: string | null; image: string | null };

type Application = {
  id: string;
  status: string;
  message: string | null;
  appliedAt: string;
  expiresAt: string | null;
  lastConnectedAt: string | null;
  user: User;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Ausstehend",
  approved: "Genehmigt",
  denied: "Abgelehnt",
  revoked: "Entzogen",
  expired: "Abgelaufen",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ApplicationsManager({ initialApplications }: { initialApplications: Application[] }) {
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [actingId, setActingId] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "deny" | "revoke") {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/servers/applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Aktion fehlgeschlagen");
        return;
      }
      const updated = await res.json();
      setApplications((apps) => apps.map((a) => (a.id === id ? { ...a, ...updated } : a)));
      toast.success(action === "approve" ? "Genehmigt" : action === "deny" ? "Abgelehnt" : "Zugriff entzogen");
    } finally {
      setActingId(null);
    }
  }

  const pending = applications.filter((a) => a.status === "pending");
  const approved = applications.filter((a) => a.status === "approved");
  const others = applications.filter((a) => !["pending", "approved"].includes(a.status));

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-white">Offene Bewerbungen ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-xs text-gray-500">Keine offenen Bewerbungen.</p>
        ) : (
          pending.map((app) => (
            <div key={app.id} className="flex items-center gap-3 rounded-xl glass px-4 py-3" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              {app.user.image ? <Image src={app.user.image} alt="" width={32} height={32} className="rounded-full shrink-0" /> : <div className="w-8 h-8 rounded-full bg-gray-700 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{app.user.username ?? app.user.name}</p>
                <p className="text-xs text-gray-500">beworben am {formatDate(app.appliedAt)}</p>
                {app.message && <p className="text-xs text-gray-400 mt-0.5 italic">„{app.message}&quot;</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => act(app.id, "approve")} disabled={actingId === app.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40 transition-colors">
                  {actingId === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Annehmen
                </button>
                <button onClick={() => act(app.id, "deny")} disabled={actingId === app.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 disabled:opacity-40 transition-colors">
                  <X className="w-3.5 h-3.5" /> Ablehnen
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-white">Freigeschaltete Mitglieder ({approved.length})</h2>
        {approved.length === 0 ? (
          <p className="text-xs text-gray-500">Noch niemand freigeschaltet.</p>
        ) : (
          approved.map((app) => (
            <div key={app.id} className="flex items-center gap-3 rounded-xl glass px-4 py-3" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              {app.user.image ? <Image src={app.user.image} alt="" width={32} height={32} className="rounded-full shrink-0" /> : <div className="w-8 h-8 rounded-full bg-gray-700 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{app.user.username ?? app.user.name}</p>
                {app.expiresAt && <p className="text-xs text-gray-500">Zugang gültig bis {formatDate(app.expiresAt)}</p>}
                <p className="text-[11px] text-gray-600">
                  {app.lastConnectedAt ? `Zuletzt verbunden am ${formatDate(app.lastConnectedAt)}` : "Noch nicht verbunden"}
                </p>
              </div>
              <button onClick={() => act(app.id, "revoke")} disabled={actingId === app.id}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 disabled:opacity-40 transition-colors shrink-0">
                {actingId === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Entziehen
              </button>
            </div>
          ))
        )}
      </section>

      {others.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-white">Verlauf</h2>
          {others.map((app) => (
            <div key={app.id} className="flex items-center gap-3 rounded-xl glass px-4 py-3 opacity-60" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              {app.user.image ? <Image src={app.user.image} alt="" width={28} height={28} className="rounded-full shrink-0" /> : <div className="w-7 h-7 rounded-full bg-gray-700 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{app.user.username ?? app.user.name}</p>
              </div>
              <span className="text-xs text-gray-500 shrink-0">{STATUS_LABEL[app.status] ?? app.status}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
