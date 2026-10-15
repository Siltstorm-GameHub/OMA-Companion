"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Circle } from "@/components/icons";

export type OverlayConnection = {
  online: boolean;
  obs: boolean;
  everConnected: boolean;
  sources: { scene: string; isObs: boolean; lastSeenAt: string; online: boolean }[];
};

const SCENE_NAMES: Record<string, string> = {
  auto: "Hauptlink", gameplay: "Spiel", pause: "Pause", intro: "Intro", clips: "Clips", outro: "Outro",
};

/** Fragt regelmäßig ab, ob das eigene Overlay gerade irgendwo (am besten in OBS) geöffnet ist. */
export function useOverlayConnection(pollMs = 5000): OverlayConnection | null {
  const [state, setState] = useState<OverlayConnection | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/profile/overlay/status", { cache: "no-store" });
        if (res.ok && !cancelled) setState(await res.json());
      } catch { /* nächster Versuch beim nächsten Takt */ }
    };
    const first = setTimeout(load, 0);
    const t = setInterval(load, pollMs);
    return () => { cancelled = true; clearTimeout(first); clearInterval(t); };
  }, [pollMs]);
  return state;
}

function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 60) return `vor ${Math.max(1, min)} Min.`;
  const h = Math.round(min / 60);
  return h < 48 ? `vor ${h} Std.` : `vor ${Math.round(h / 24)} Tagen`;
}

/**
 * "In OBS verbunden ✓" — die wichtigste Rückmeldung für Einsteiger: Ist der Link angekommen?
 * Grün = in OBS offen, Gelb = nur in einem Browser-Tab offen, Grau = (gerade) nicht verbunden.
 */
export function OverlayConnectionStatus({ connection, compact = false }: { connection: OverlayConnection | null; compact?: boolean }) {
  if (!connection) return <span className="text-xs text-gray-500">Verbindung wird geprüft …</span>;
  const online = connection.sources.filter(s => s.online);
  const scenes = online.map(s => SCENE_NAMES[s.scene] ?? s.scene).join(", ");

  if (connection.obs) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-emerald-300">
        <CheckCircle2 className="w-4 h-4 shrink-0" /> In OBS verbunden
        {!compact && scenes && <span className="text-xs text-emerald-300/70">· {scenes}</span>}
      </span>
    );
  }
  if (connection.online) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-amber-300">
        <AlertTriangle className="w-4 h-4 shrink-0" /> Geöffnet, aber nicht in OBS
        {!compact && <span className="text-xs text-amber-300/70">· z.B. in einem Browser-Tab</span>}
      </span>
    );
  }
  const last = connection.sources[0];
  return (
    <span className="flex items-center gap-1.5 text-sm text-gray-400">
      <Circle className="w-4 h-4 shrink-0" />
      {last ? <>Gerade nicht verbunden <span className="text-xs text-gray-500">· zuletzt {ago(last.lastSeenAt)}</span></> : "Noch nicht in OBS eingefügt"}
    </span>
  );
}
