"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button-styles";
import { OPEN_REPORT_EVENT } from "./MatchResultSubmit";

/**
 * "Für dich": Der Gegner hat ein Ergebnis gemeldet — mit einem Tipp bestätigen ("Stimmt") oder
 * selbst melden ("Stimmt nicht" öffnet das Formular in "Dein Match"). Gleiche API wie MatchForm.
 */
export default function OpponentReportActions({ eventId, matchId }: { eventId: string; matchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      const res = await fetch(`/api/tournaments/${eventId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, confirm: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "Bestätigen fehlgeschlagen");
      toast.success(data.confirmedByBoth ? "Bestätigt — das Ergebnis gilt jetzt endgültig" : "Bestätigung gespeichert — ein Verwalter prüft das Ergebnis");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function dispute() {
    window.dispatchEvent(new CustomEvent(OPEN_REPORT_EVENT, { detail: matchId }));
    const el = document.getElementById("dein-match");
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <>
      <button type="button" onClick={confirm} disabled={busy} className={buttonClasses("primary", "md")}>
        {busy && <Loader2 className="size-4 animate-spin" />} Stimmt
      </button>
      <button type="button" onClick={dispute} disabled={busy} className={buttonClasses("secondary", "md")}>
        Stimmt nicht
      </button>
    </>
  );
}
