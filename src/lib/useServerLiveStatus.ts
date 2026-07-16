"use client";
import { useEffect, useState } from "react";

export type LiveStatus = { online: boolean; currentPlayers: number | null; maxPlayers: number | null };

// Live-Status aller Server wird app-weit gemeinsam gepollt (ein Request alle 20s,
// egal wie viele Komponenten gerade zuhören — ServerCard, Dashboard-Widget, etc.)
const statusListeners = new Set<(status: Record<string, LiveStatus>) => void>();
let latestStatus: Record<string, LiveStatus> = {};
let pollStarted = false;

function startPolling() {
  if (pollStarted) return;
  pollStarted = true;
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/servers/status");
      if (!res.ok) return;
      latestStatus = await res.json();
      statusListeners.forEach((listener) => listener(latestStatus));
    } catch {
      // Netzwerkfehler ignorieren, nächster Poll versucht es erneut
    }
  };
  fetchStatus();
  setInterval(fetchStatus, 20_000);
}

function useAllLiveStatus(): Record<string, LiveStatus> {
  const [status, setStatus] = useState<Record<string, LiveStatus>>(latestStatus);
  useEffect(() => {
    startPolling();
    statusListeners.add(setStatus);
    return () => {
      statusListeners.delete(setStatus);
    };
  }, []);
  return status;
}

export function useLiveStatus(serverId: string): LiveStatus | undefined {
  return useAllLiveStatus()[serverId];
}

export { useAllLiveStatus };
