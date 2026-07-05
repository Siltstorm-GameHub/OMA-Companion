"use client";

import { useState } from "react";
import { Eye, Check, Loader2 } from "lucide-react";

interface Props {
  eventId: string;
  isSpectator: boolean;
}

export default function SpectatorRegisterButton({ eventId, isSpectator }: Props) {
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(isSpectator);

  async function toggle() {
    setLoading(true);
    try {
      const method = registered ? "DELETE" : "POST";
      const body   = registered ? undefined : JSON.stringify({ role: "spectator" });
      const res    = await fetch(`/api/events/${eventId}/register`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body,
      });
      if (res.ok) setRegistered(r => !r);
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-400 transition-colors border border-white/[0.08] hover:border-red-500/30 px-3 py-1.5 rounded-xl"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />}
        Als Zuschauer angemeldet
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors border border-white/[0.08] hover:border-white/[0.15] px-3 py-1.5 rounded-xl"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
      Als Zuschauer anmelden
    </button>
  );
}
