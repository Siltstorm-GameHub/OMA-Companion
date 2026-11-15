"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { X } from "@/components/icons";
import { goalHideCookie } from "@/lib/goal-spotlight";

/** ✕ auf der großen Ziel-Karte: blendet nur den aktuellen Anlass aus (Cookie), die schmale Leiste bleibt. */
export default function GoalSpotlightDismiss({ eventId, spotlightKey }: { eventId: string; spotlightKey: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label="Bis zum nächsten Anlass klein anzeigen"
      title="Bis zum nächsten Anlass klein anzeigen"
      disabled={pending}
      onClick={() => {
        document.cookie = `${goalHideCookie(eventId)}=${encodeURIComponent(spotlightKey)}; path=/; max-age=${60 * 60 * 24 * 45}; samesite=lax`;
        startTransition(() => router.refresh());
      }}
      className="absolute top-2 right-2 z-10 rounded-lg p-1.5 text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  );
}
