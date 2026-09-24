"use client";

// ============================================
// D&D-Migrations-Banner (plan Abschnitt 6.1)
// ============================================
// Sanfter Hinweis für Bestandsmitglieder ohne D&D-Charakter — kein Blocker
// (analog TutorialProgressBanner: rendert nur, solange relevant). Nach der
// Frist würfelt der dnd-travel-sweep-Cron automatisch aus.

import Link from "next/link";
import { Dices, Clock } from "@/components/icons";
import { DND_MIGRATION_DEADLINE } from "@/lib/dnd/migration";

function formatDeadline(d: Date): string {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}

export default function DndMigrationBanner({ hasCharacter }: { hasCharacter: boolean }) {
  if (hasCharacter) return null;

  return (
    <div className="moba-panel rounded-2xl p-4 flex items-center gap-3 border border-violet-500/20">
      <div className="w-9 h-9 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center shrink-0">
        <Dices className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">Neu: Deine Community-Karte wird zum D&D-Charakter</p>
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3 shrink-0" />
          Würfle freiwillig bis {formatDeadline(DND_MIGRATION_DEADLINE)} — danach übernehmen wir das automatisch für dich.
        </p>
      </div>
      <Link
        href="/dnd"
        className="shrink-0 rounded-xl bg-violet-600 hover:bg-violet-500 px-3 py-2 text-xs font-bold text-white transition-colors"
      >
        Jetzt würfeln
      </Link>
    </div>
  );
}
