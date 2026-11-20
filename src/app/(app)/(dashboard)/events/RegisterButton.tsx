"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, ExternalLink, X, Clock } from "@/components/icons";
import { toast } from "sonner";
import { useConfirm } from "@/components/admin/ConfirmDialog";

/**
 * Anmelde-Knopf für Karten und Eventseite. Abmelden fragt vorher nach. Ist das Event voll, gibt es (wenn
 * `waitlist` gesetzt ist, z.B. auf der Eventseite) die Warteliste, sonst einen Link dorthin (`waitlistHref`).
 * `canUnregister = false`: Event läuft schon → "Dabei" ohne Abmelden.
 */
export default function RegisterButton({
  eventId,
  isRegistered,
  isFull,
  discordEventUrl,
  joinLabel = "Anmelden",
  coins,
  canUnregister = true,
  waitlist,
  waitlistHref,
  checkIn = false,
}: {
  eventId: string;
  isRegistered: boolean;
  isFull: boolean;
  discordEventUrl?: string | null;
  /** Beschriftung des Anmelde-Knopfs, z.B. "Einsteigen" bei Zeitraum-Events */
  joinLabel?: string;
  /** Teilnahme-Münzen — als Hinweis "+X nach dem Event" nach der Anmeldung */
  coins?: number;
  /** false = Event läuft schon, Abmelden geht nicht mehr */
  canUnregister?: boolean;
  /** Warteliste direkt hier bedienen: position = eigener Platz (null = nicht auf der Liste) */
  waitlist?: { position: number | null } | null;
  /** Ohne `waitlist`: Link zur Eventseite mit Warteliste */
  waitlistHref?: string;
  /** Event hat Check-in: nach der Anmeldung an "Bin bereit" erinnern */
  checkIn?: boolean;
}) {
  const [loading, setLoading]               = useState(false);
  const [registered, setRegistered]         = useState(isRegistered);
  const [justRegistered, setJustRegistered] = useState(false);
  const [burst, setBurst]                   = useState(0);
  const [waitPos, setWaitPos]               = useState<number | null>(waitlist?.position ?? null);
  const router = useRouter();
  const { confirm, ConfirmDialogElement } = useConfirm();

  async function handleClick() {
    if (isFull && !registered) return;
    const wasRegistered = registered;
    if (wasRegistered && !(await confirm({
      title: "Abmelden?",
      description: "Dein Platz wird frei und kann an die Warteliste gehen. Du kannst dich danach wieder anmelden, solange noch Platz ist.",
      confirmLabel: "Abmelden",
      variant: "danger",
    }))) return;
    // Optimistisch: Zustand sofort umschalten, bei Fehler zurückdrehen.
    setRegistered(!wasRegistered);
    setJustRegistered(!wasRegistered);
    if (!wasRegistered) setBurst(b => b + 1);
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/register`, { method: wasRegistered ? "DELETE" : "POST" });

      if (res.ok) {
        if (!wasRegistered) {
          const hints = [
            checkIn ? "Melde dich ab 30 Min. vor Start mit „Bin bereit“, sonst wirst du nicht ausgelost." : null,
            discordEventUrl ? "Melde dich auch auf Discord an, dann bekommst du die Erinnerung." : null,
          ].filter(Boolean).join(" ");
          toast.success("Angemeldet", {
            description: hints || undefined,
            action: discordEventUrl
              ? { label: "Discord öffnen", onClick: () => window.open(discordEventUrl, "_blank") }
              : undefined,
          });
        } else {
          toast("Abgemeldet", { icon: <X className="w-4 h-4 text-gray-400" /> });
        }
      } else {
        setRegistered(wasRegistered);
        setJustRegistered(false);
        const err = await res.json().catch(() => ({}));
        toast.error("Das hat nicht geklappt", {
          description: (err as { error?: string }).error ?? "Versuch es gleich noch mal.",
        });
      }
      router.refresh();
    } catch {
      setRegistered(wasRegistered);
      setJustRegistered(false);
      toast.error("Keine Verbindung", { description: "Versuch es gleich noch mal." });
    } finally {
      setLoading(false);
    }
  }

  async function toggleWaitlist() {
    setLoading(true);
    try {
      const on = waitPos !== null;
      const res = await fetch(`/api/events/${eventId}/waitlist`, { method: on ? "DELETE" : "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error((data as { error?: string }).error ?? "Das hat nicht geklappt"); return; }
      if (on) { setWaitPos(null); toast("Von der Warteliste genommen"); }
      else {
        const pos = (data as { position?: number }).position ?? 1;
        setWaitPos(pos);
        toast.success(`Auf der Warteliste (Platz ${pos})`, { description: "Wird ein Platz frei, rückst du automatisch nach und bekommst eine Meldung." });
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // Event läuft schon: angemeldet, aber nicht mehr abmeldbar
  if (registered && !canUnregister) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/25"
        title="Das Event läuft schon. Abmelden geht nicht mehr, sag dem Veranstalter Bescheid.">
        <Check className="w-3 h-3" /> Dabei
      </span>
    );
  }

  if (isFull && !registered) {
    if (waitlist !== undefined && waitlist !== null) {
      return (
        <>
          <button type="button" onClick={toggleWaitlist} disabled={loading}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors disabled:opacity-70 ${
              waitPos !== null
                ? "bg-amber-500/10 text-amber-300 border-amber-500/25 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/25"
                : "bg-white/[0.04] text-gray-200 border-white/[0.1] hover:bg-white/[0.08]"
            }`}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
            {waitPos !== null ? `Warteliste · Platz ${waitPos}` : "Voll · auf die Warteliste"}
          </button>
          {ConfirmDialogElement}
        </>
      );
    }
    return waitlistHref ? (
      <Link href={waitlistHref} className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:text-white">
        Voll · Warteliste
      </Link>
    ) : (
      <span className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-gray-500 border border-white/[0.06]">
        Voll
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <span className="relative inline-flex">
        <button
          onClick={handleClick}
          disabled={loading}
          aria-pressed={registered}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-95 ${
            registered
              ? "bg-teal-500/10 text-teal-300 hover:bg-red-500/10 hover:text-red-400 border border-teal-500/25 hover:border-red-500/25"
              : "bg-teal-500 hover:bg-teal-400 text-teal-950"
          } disabled:opacity-70`}
        >
          {registered ? (
            <><Check className="w-3 h-3" /> Dabei</>
          ) : (
            <>{loading && <Loader2 className="w-3 h-3 animate-spin" />}{joinLabel}</>
          )}
        </button>
        {burst > 0 && !!coins && registered && (
          <span key={burst} aria-hidden="true"
            className="pointer-events-none absolute -top-1 left-1/2 whitespace-nowrap text-[11px] font-bold text-amber-400 value-delta-pop">
            +{coins} nach dem Event
          </span>
        )}
      </span>

      {justRegistered && checkIn && (
        <span className="text-[10px] text-amber-300/90">Check-in: ab 30 Min. vor Start „Bin bereit“ drücken.</span>
      )}
      {justRegistered && !!coins && (
        <span className="text-[10px] text-gray-500">Die Münzen gibt es nach dem Event, wenn du dabei warst.</span>
      )}
      {justRegistered && discordEventUrl && (
        <a
          href={discordEventUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-teal-300 hover:text-teal-200 transition-colors whitespace-nowrap"
        >
          <ExternalLink className="w-3 h-3" />
          Auf Discord anmelden
        </a>
      )}
      {ConfirmDialogElement}
    </div>
  );
}
