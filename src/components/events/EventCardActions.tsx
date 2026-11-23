import RegisterButton from "@/app/(app)/(dashboard)/events/RegisterButton";
import { GateButton, GateLink } from "@/components/GuestGate";
import Link from "next/link";
import { Lock } from "@/components/icons";
import { eventDiscordUrl, type EventCardSource } from "@/lib/event-card-data";
import type { EventViewerContext } from "@/lib/event-viewer";
import type { EventCardData } from "./EventCard";

const VIOLET = "rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-400 transition-colors";
const TEAL = "rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-ink hover:bg-primary-hover transition-colors";

/**
 * Die EINE Aktion einer Event-Kachel je nach Zustand — gleich auf Events-Seite, Eventreihe und
 * "Meine Events": Abstimmen/Mitwählen (violett), Anmelden/Einsteigen (teal), Gast-Hinweis oder
 * Schloss bei gesperrter Anmeldung.
 */
export default function EventCardActions({
  ev, card, viewer, userId,
}: {
  ev: EventCardSource;
  card: EventCardData;
  viewer: EventViewerContext;
  userId: string | null | undefined;
}) {
  const restrictedSquadId = ev.squadId ?? ev.series?.squadId ?? null;
  const isSquadMember = restrictedSquadId ? viewer.mySquadIds.has(restrictedSquadId) : true;
  const isLocked = ev.registrationLocked || ev.series?.registrationLocked || false;
  const canRegister = ev.status === "open" || ev.status === "active" || ev.status === "closed";
  // Live (kein Zeitraum-Event): Anmelden und Abmelden gehen nicht mehr — nur Zeitraum-Events nehmen bis
  // zum Ende Einsteiger an (lib/event-registration.ts)
  const live = card.phase.phase === "live";
  const period = card.phase.phase === "period";
  const deadlinePassed = !!ev.registrationClosesAt && new Date(ev.registrationClosesAt) <= new Date();

  if (card.phase.phase === "poll") {
    return <GateLink href={`${card.href}#abstimmung`} className={VIOLET}>Abstimmen</GateLink>;
  }
  if (card.phase.phase === "gamevote" && !card.isRegistered) {
    return <GateLink href={`${card.href}#spielwahl`} className={VIOLET}>Mitwählen</GateLink>;
  }
  if (!canRegister) return null;
  if (!userId) {
    return (
      <GateButton
        href={card.href}
        title="Zum Mitspielen anmelden"
        message="Für die Event-Anmeldung brauchst du einen Platz auf unserem Discord-Server. So kommst du rein:"
        className={TEAL}
      >
        Mitmachen
      </GateButton>
    );
  }
  if (card.isRegistered) {
    return (
      <RegisterButton eventId={ev.id} isRegistered isFull={false} discordEventUrl={eventDiscordUrl(ev)} coins={card.coins}
        canUnregister={!live} />
    );
  }
  if ((live && !period) || deadlinePassed) {
    return <span className="text-xs text-gray-500">{deadlinePassed && !live ? "Anmeldeschluss vorbei" : "Anmeldung geschlossen"}</span>;
  }
  if (!isLocked && isSquadMember) {
    return (
      <RegisterButton
        eventId={ev.id}
        isRegistered={false}
        isFull={card.phase.phase === "full"}
        discordEventUrl={eventDiscordUrl(ev)}
        joinLabel={period ? "Einsteigen" : "Anmelden"}
        coins={card.coins}
        waitlistHref={card.href}
      />
    );
  }
  // Gesperrt bzw. nur für ein Squad: sagen, wie man trotzdem dabei sein kann
  return isLocked ? (
    <span className="flex items-center gap-1 text-xs text-gray-500" title="Der Veranstalter trägt die Teilnehmer selbst ein. Frag im Discord nach einem Platz.">
      <Lock className="w-3 h-3" /> Veranstalter trägt ein
    </span>
  ) : (
    <Link href={`/squads/${restrictedSquadId}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white" title="Nur für Mitglieder dieses Squads. Zum Squad und Beitritt anfragen.">
      <Lock className="w-3 h-3" /> Nur Squad · ansehen
    </Link>
  );
}
