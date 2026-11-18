"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { X } from "@/components/icons";
import { addHiddenResults, parseHiddenResults, RESULTS_HIDE_COOKIE } from "@/lib/home-tasks";

function readCookie(name: string): string | undefined {
  return document.cookie.split("; ").find(c => c.startsWith(`${name}=`))?.slice(name.length + 1);
}

/**
 * Kachel in "Heute für dich" mit ✕: merkt sich die Event-IDs im Cookie (vom Server beim nächsten
 * Rendern herausgefiltert), blendet die Kachel sofort aus und lädt die Startseite neu.
 */
export default function HomeTaskDismiss({ ids, label, className, children }: {
  ids: string[]; label: string; className?: string; children: ReactNode;
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();
  if (hidden) return null;
  return (
    <li className={`relative ${className ?? ""}`}>
      {children}
      <button
        type="button"
        aria-label={`${label} ausblenden`}
        title="Ausblenden"
        onClick={() => {
          const next = addHiddenResults(parseHiddenResults(readCookie(RESULTS_HIDE_COOKIE)), ids);
          document.cookie = `${RESULTS_HIDE_COOKIE}=${encodeURIComponent(next.join(","))}; path=/; max-age=${60 * 60 * 24 * 60}; samesite=lax`;
          setHidden(true);
          startTransition(() => router.refresh());
        }}
        className="absolute top-1.5 right-1.5 z-10 rounded-lg p-1.5 text-gray-500 hover:text-gray-200 hover:bg-white/[0.08] transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}
