"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Clock } from "lucide-react";

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} kopiert`);
    setTimeout(() => setCopied(false), 1500);
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
  host,
  port,
  password,
  connectInfo,
  expiresAt,
}: {
  host?: string;
  port?: string | null;
  password?: string | null;
  connectInfo?: string | null;
  expiresAt: string | null;
}) {
  if (!host) return null;
  const remaining = expiresAt ? daysUntil(expiresAt) : null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <CopyField label="Host" value={port ? `${host}:${port}` : host} />
        {password && <CopyField label="Passwort" value={password} />}
      </div>
      {connectInfo && <p className="text-xs text-gray-400">{connectInfo}</p>}
      {remaining !== null && (
        <p className={`flex items-center gap-1.5 text-xs ${remaining <= 3 ? "text-amber-400" : "text-gray-500"}`}>
          <Clock className="w-3 h-3" />
          {remaining <= 0 ? "Zugang läuft heute ab" : `Zugang läuft in ${remaining} Tag${remaining === 1 ? "" : "en"} ab`}
        </p>
      )}
    </div>
  );
}
