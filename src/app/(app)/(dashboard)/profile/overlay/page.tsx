import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureUserOverlayToken, buildStreamerOverlayUrl } from "@/lib/overlay";
import { getStreamerActiveEventId, getStreamerUpcomingEvents } from "@/lib/overlay-state";
import { parseStreamerConfig, defaultStreamerEventLayout, defaultProfileLayout } from "@/components/overlay/layout";
import ProfileOverlayButton from "@/components/ProfileOverlayButton";
import StreamerOverlaySettings from "./StreamerOverlaySettings";

export const metadata = { title: "OBS-Overlay – Old Masters Ally" };

/** Einstellungen des festen Streamer-Links: zwei Szenen-Links (Spiel, Pause), zwei Layouts
 *  (mit/ohne laufendes Event), Pausentext und Leicht-Modus. */
export default async function StreamerOverlaySettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/profile/overlay");

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

  // Status: was zeigt der Link genau jetzt — und für welche kommenden Events ist der User als
  // Streamer angemeldet (die erscheinen dann automatisch, ohne hier etwas tun zu müssen)?
  const [activeEventId, streamingEvents] = await Promise.all([
    getStreamerActiveEventId(user.id),
    getStreamerUpcomingEvents(user.id),
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
      initialPauseBackground={config.pauseBackground}
      activeEvent={activeEvent}
      streamingEvents={streamingEvents}
    />
  );
}
