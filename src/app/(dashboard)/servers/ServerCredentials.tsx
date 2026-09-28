"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, ExternalLink } from "@/components/icons";
import { getJoinInstructions } from "@/lib/join-instructions";

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
  game,
  host,
  port,
  password,
}: {
  serverId: string;
  game: string;
  host?: string;
  port?: string | null;
  password?: string | null;
}) {
  if (!host) return null;

  // Merkt den Zeitpunkt der letzten Nutzung (nur Info für Admins, kein Einfluss auf den Zugriff).
  function markConnected() {
    fetch(`/api/servers/${serverId}/connect`, { method: "POST" }).catch(() => {});
  }

  const join = getJoinInstructions(game);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <CopyField label="Host" value={port ? `${host}:${port}` : host} onCopy={markConnected} />
        {password && <CopyField label="Passwort" value={password} onCopy={markConnected} />}
      </div>

      {join.deepLink && (
        <a
          href={join.deepLink(host, port)}
          onClick={markConnected}
          className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-teal-600/15 border border-teal-500/25 text-teal-300 hover:bg-teal-600/25 transition-colors text-xs font-medium"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {join.deepLinkLabel}
        </a>
      )}

      <details className="group">
        <summary className="text-[11px] text-gray-500 hover:text-gray-400 cursor-pointer select-none list-none">
          So trittst du bei ▾
        </summary>
        <ol className="mt-1.5 space-y-1 text-[11px] text-gray-400 list-decimal list-inside">
          {join.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
          {password && <li>Passwort bei Bedarf eingeben (oben kopiert)</li>}
        </ol>
      </details>
    </div>
  );
}
