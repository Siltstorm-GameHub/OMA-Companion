"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Server } from "@/components/icons";
import ServerInterestButtons from "@/components/games/ServerInterestButtons";
import { SERVER_SOURCE_LABELS, type ServerSource } from "@/lib/games/server-candidates";
import type { GameServerFit } from "@/lib/games/server-candidates-server";

/**
 * OMA-Server: Kommt das Spiel für einen eigenen Community-Server in Frage? Mitglieder tragen es ein
 * (Ja/Nein), bei server-tauglichen Spielen sagt man „Ich wäre dabei“. Kandidaten stehen auf /servers.
 */
export default function ServerFitPanel({ slug, initial, isModerator }: { slug: string; initial: GameServerFit; isModerator: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState<boolean | null>(initial.serverCapable);
  const [source, setSource] = useState<ServerSource | null>(initial.source);
  const [canEdit, setCanEdit] = useState(initial.canEdit);
  const [busy, setBusy] = useState(false);

  async function save(next: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(slug)}/server-fit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen");
      setValue(data.serverCapable);
      setSource(data.source);
      // Mitglieder können ihre eigene Angabe weiter korrigieren
      setCanEdit(true);
      toast.success(next ? "Danke! Das Spiel steht jetzt bei den Server-Kandidaten." : "Danke, eingetragen.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  const sourceNote = source ? ` (${SERVER_SOURCE_LABELS[source]})` : "";
  const btn = "inline-flex min-h-9 items-center rounded-full px-3.5 text-xs font-semibold border transition-colors disabled:opacity-60";

  if (value === true) {
    return (
      <section className="surface rounded-card p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <Server className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg">Eignet sich für einen OMA-Server</p>
            <p className="text-xs text-subtle">
              Server-tauglich{sourceNote}.{" "}
              {initial.hasServer
                ? <>Es gibt schon einen Community-Server — <Link href="/servers" className="text-primary hover:text-primary-fg">zu den Gameservern →</Link></>
                : <>Steht bei den <Link href="/servers#kandidaten" className="text-primary hover:text-primary-fg">Server-Kandidaten →</Link></>}
            </p>
          </div>
        </div>
        {!initial.hasServer && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-fg/85 font-semibold">Ich wäre dabei:</span>
            <ServerInterestButtons slug={slug} initial={{ level: initial.myInterest, regular: initial.regular, casual: initial.casual }} />
          </div>
        )}
        {canEdit && (
          <button type="button" onClick={() => save(false)} disabled={busy} className="text-xs text-subtle hover:text-fg underline-offset-2 hover:underline">
            Stimmt nicht? Als nicht server-tauglich markieren
          </button>
        )}
      </section>
    );
  }

  if (value === false) {
    return (
      <div className="surface rounded-card p-4 flex flex-wrap items-center gap-3">
        <Server className="w-4 h-4 text-subtle shrink-0" />
        <p className="flex-1 min-w-0 text-xs text-muted">Eignet sich nicht für einen eigenen OMA-Server{sourceNote}.</p>
        {canEdit && (
          <button type="button" onClick={() => save(true)} disabled={busy} className={`${btn} border-line-strong text-fg/85 hover:border-primary/40`}>
            Doch, eignet sich
          </button>
        )}
      </div>
    );
  }

  // Unbekannt
  return (
    <div className={`rounded-card p-4 flex flex-wrap items-center gap-3 ${initial.mightBe ? "border border-primary/30 bg-primary/5" : "surface"}`}>
      <Server className={`w-4 h-4 shrink-0 ${initial.mightBe ? "text-primary" : "text-subtle"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-fg">Könnte das auf einen OMA-Server?</p>
        <p className="text-xs text-subtle">
          Also: Kann man dafür einen eigenen Server betreiben, auf dem die Community gemeinsam spielt?
          {isModerator ? "" : " Ein Ja bringt das Spiel zu den Server-Kandidaten."}
        </p>
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <button type="button" onClick={() => save(true)} disabled={busy} className={`${btn} border-primary/40 text-primary-fg hover:bg-primary/10`}>Ja</button>
          <button type="button" onClick={() => save(false)} disabled={busy} className={`${btn} border-line-strong text-fg/85 hover:bg-line`}>Nein</button>
        </div>
      )}
    </div>
  );
}
