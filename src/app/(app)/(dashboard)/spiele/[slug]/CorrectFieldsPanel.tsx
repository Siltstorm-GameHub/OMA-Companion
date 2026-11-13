"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CorrectFieldsForm from "@/components/games/CorrectFieldsForm";
import { Button } from "@/components/ui/Button";
import { Pencil } from "@/components/icons";
import type { GameFields } from "@/lib/games/draft";

/** "Fehler entdeckt?" — Spielerzahl, Rundenlänge, Plattformen und Crossplay korrigieren (Detailseite). */
export default function CorrectFieldsPanel({ slug, current }: { slug: string; current: GameFields }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="surface rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Pencil className="w-4 h-4 text-gray-500 shrink-0" />
        <p className="flex-1 min-w-0 text-xs text-gray-300">
          Fehler entdeckt? <span className="text-gray-500">Spielerzahl, Rundenlänge, Plattformen und Crossplay kannst du korrigieren.</span>
        </p>
        {!open && <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Korrigieren</Button>}
      </div>
      {open && (
        <CorrectFieldsForm
          slug={slug}
          current={current}
          onDone={saved => {
            setOpen(false);
            if (saved) router.refresh();
          }}
        />
      )}
    </div>
  );
}
