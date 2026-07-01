"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Check, Clock, ExternalLink } from "lucide-react";

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

// Erkennt Protokoll-Links wie steam://connect/... oder minecraft://..., die per Klick
// direkt das Spiel/Steam öffnen (im Gegensatz zu einer reinen IP:Port-Adresse).
const PROTOCOL_LINK = /^[a-z][a-z0-9+.-]*:\/\//i;

function CopyField({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} kopiert`);
    setTimeout(() => setCopied(false), 1500);
    onCopy?.();
  }

  return (
    <button
      onClick={copy}
      className="flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 transition-colors text-left"
    >
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-white font-mono truncate">{value}</p>
      </div>
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
    </button>
  );
}

export default function ServerCredentials({
  serverId,
  host,
  port,
  password,
  connectInfo,
  expiresAt,
}: {
  serverId: string;
  host?: string;
  port?: string | null;
  password?: string | null;
  connectInfo?: string | null;
  expiresAt: string | null;
}) {
  const router = useRouter();
  if (!host) return null;
  const remaining = expiresAt ? daysUntil(expiresAt) : null;
  const connectLink = connectInfo && PROTOCOL_LINK.test(connectInfo.trim()) ? connectInfo.trim() : null;
  const connectNote = connectInfo && !connectLink ? connectInfo : null;

  // Verlängert den 30-Tage-Zugriff ab jetzt, da der User gerade tatsächlich verbindet.
  function markConnected() {
    fetch(`/api/servers/${serverId}/connect`, { method: "POST" })
      .then(() => router.refresh())
      .catch(() => {});
  }

  return (
    <div className="space-y-2">
      {connectLink && (
        <>
          <a
            href={connectLink}
            onClick={markConnected}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Jetzt verbinden
          </a>
          <p className="text-[11px] text-gray-500">
            Öffnet Steam. Falls sich nichts tut (z.B. in der installierten App-Ansicht blockiert): Link unten kopieren und manuell einfügen (Windows: Win+R).
          </p>
          <CopyField label="Verbindungslink" value={connectLink} onCopy={markConnected} />
        </>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <CopyField label="Host" value={port ? `${host}:${port}` : host} onCopy={markConnected} />
        {password && <CopyField label="Passwort" value={password} />}
      </div>
      {connectNote && <p className="text-xs text-gray-400">{connectNote}</p>}
      {remaining !== null && (
        <p className={`flex items-center gap-1.5 text-xs ${remaining <= 3 ? "text-amber-400" : "text-gray-500"}`}>
          <Clock className="w-3 h-3" />
          {remaining <= 0 ? "Zugang läuft heute ab" : `Zugang läuft in ${remaining} Tag${remaining === 1 ? "" : "en"} ab`}
        </p>
      )}
    </div>
  );
}
