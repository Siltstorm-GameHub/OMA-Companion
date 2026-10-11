"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, ChevronRight, Info } from "@/components/icons";

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
  joinInstructions,
  host,
  port,
  password,
}: {
  serverId: string;
  joinInstructions?: string | null;
  host?: string;
  port?: string | null;
  password?: string | null;
}) {
  if (!host) return null;

  // Merkt den Zeitpunkt der letzten Nutzung (nur Info für Admins, kein Einfluss auf den Zugriff).
  function markConnected() {
    fetch(`/api/servers/${serverId}/connect`, { method: "POST" }).catch(() => {});
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <CopyField label="Host" value={port ? `${host}:${port}` : host} onCopy={markConnected} />
        {password && <CopyField label="Passwort" value={password} onCopy={markConnected} />}
      </div>

      {joinInstructions && (
        <details className="group rounded-lg bg-teal-500/10 border border-teal-500/20 overflow-hidden">
          <summary className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-300 hover:text-teal-200 cursor-pointer select-none list-none">
            <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-transform group-open:rotate-90" />
            <Info className="w-3.5 h-3.5 shrink-0" />
            So trittst du bei
          </summary>
          <p className="px-3 pb-3 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{joinInstructions}</p>
        </details>
      )}
    </div>
  );
}
