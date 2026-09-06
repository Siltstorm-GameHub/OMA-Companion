"use client";
import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";

type Badge =
  | { employed: true; jobKey: string; jobLabel: string; jobEmoji: string; status: string; tierLabel: string | null }
  | { employed: false; unemployedSinceMonths: number };

/** Profil-Hero-Section: aktueller Community-Job + letzte Gehaltsstufe, oder "Arbeitslos seit N Monaten". */
export default function ProfileJobBadge({ userId }: { userId: string }) {
  const [badge, setBadge] = useState<Badge | null>(null);

  useEffect(() => {
    fetch(`/api/community-jobs/profile-badge/${userId}`).then(r => r.json()).then(setBadge).catch(() => {});
  }, [userId]);

  if (!badge) return null;

  if (!badge.employed) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
        <Briefcase className="w-3 h-3" />
        Arbeitslos seit {badge.unemployedSinceMonths === 0 ? "diesem Monat" : `${badge.unemployedSinceMonths} Monat${badge.unemployedSinceMonths === 1 ? "" : "en"}`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-teal-300">
      {badge.jobEmoji} {badge.jobLabel}
      {badge.status === "WARNED" && <span className="text-amber-400">· Verwarnt</span>}
      {badge.tierLabel && <span className="text-gray-500">· {badge.tierLabel}</span>}
    </span>
  );
}
