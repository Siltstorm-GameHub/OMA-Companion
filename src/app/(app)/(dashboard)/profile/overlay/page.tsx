import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureUserOverlayToken, buildStreamerOverlayUrl } from "@/lib/overlay";
import { getStreamerActiveEventId } from "@/lib/overlay-state";
import { parseStreamerConfig, defaultStreamerEventLayout, defaultProfileLayout } from "@/components/overlay/layout";
import ProfileOverlayButton from "@/components/ProfileOverlayButton";
import StreamerOverlaySettings from "./StreamerOverlaySettings";

export const metadata = { title: "OBS-Overlay – Old Masters Ally" };

/** Einstellungen des festen Streamer-Links: zwei Szenen-Links (Spiel, Pause), zwei Layouts
 *  (mit/ohne laufendes Event), Pausentext und Leicht-Modus. */
export default async function StreamerOverlaySettingsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/profile/overlay");
  const { event: highlightEventId } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, twitchLogin: true, overlayLayoutJson: true },
  });
  if (!user) redirect("/login");

  if (!user.twitchLogin) {
    return (
      <div className="max-w-3xl mx-auto w-full p-4 sm:p-8">
        <h1 className="text-lg font-semibold text-white mb-4">OBS-Overlay</h1>
        <ProfileOverlayButton hasTwitch={false} />
      </div>
    );
  }

  const token = await ensureUserOverlayToken(user.id);
  const config = parseStreamerConfig(user.overlayLayoutJson);

  // Status-Zeile: was zeigt der Link genau jetzt? Und ggf. das Event, von dessen Anmeldung man kommt.
  const [activeEventId, highlightEvent] = await Promise.all([
    getStreamerActiveEventId(user.id),
    highlightEventId ? prisma.event.findUnique({ where: { id: highlightEventId }, select: { id: true, title: true, startAt: true } }) : null,
  ]);
  const activeEvent = activeEventId
    ? await prisma.event.findUnique({ where: { id: activeEventId }, select: { id: true, title: true } })
    : null;

  return (
    <StreamerOverlaySettings
      overlayUrl={buildStreamerOverlayUrl(user.id, token)}
      initialEvent={config.event ?? defaultStreamerEventLayout()}
      initialProfile={config.profile ?? defaultProfileLayout()}
      initialPauseText={config.pauseText}
      initialLite={config.lite}
      activeEvent={activeEvent}
      highlightEvent={highlightEvent ? { id: highlightEvent.id, title: highlightEvent.title, startAt: highlightEvent.startAt.toISOString() } : null}
    />
  );
}
