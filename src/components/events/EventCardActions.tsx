import RegisterButton from "@/app/(app)/(dashboard)/events/RegisterButton";
import { GateButton, GateLink } from "@/components/GuestGate";
import { Lock } from "@/components/icons";
import { eventDiscordUrl, type EventCardSource } from "@/lib/event-card-data";
import type { EventViewerContext } from "@/lib/event-viewer";
import type { EventCardData } from "./EventCard";

const VIOLET = "rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-400 transition-colors";
const TEAL = "rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-teal-950 hover:bg-teal-400 transition-colors";

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
  const canRegister = ev.status === "open" || ev.status === "active";
  const running = card.phase.phase === "live" || card.phase.phase === "period";

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
  if (card.isRegistered || (!isLocked && isSquadMember)) {
    return (
      <RegisterButton
        eventId={ev.id}
        isRegistered={card.isRegistered}
        isFull={card.phase.phase === "full"}
        discordEventUrl={eventDiscordUrl(ev)}
        joinLabel={running ? "Einsteigen" : "Anmelden"}
        coins={card.coins}
      />
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] text-gray-500" title={isLocked ? "Anmeldung nur durch Admins" : "Anmeldung nur für Squad-Mitglieder"}>
      <Lock className="w-3 h-3" /> {isLocked ? "Nur Admins" : "Nur Squad"}
    </span>
  );
}
