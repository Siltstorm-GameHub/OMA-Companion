import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProfileOverlayButton from "@/components/ProfileOverlayButton";
import LiveControl from "./LiveControl";
import { parseStreamerConfig, defaultStreamerEventLayout, defaultProfileLayout } from "@/components/overlay/layout";
import { defaultPauseLayout, defaultClipLayout } from "@/components/overlay/sceneLayouts";

export const metadata = { title: "Overlay-Steuerung – Old Masters Ally" };

/** Live-Steuerung des eigenen OBS-Overlays — für alle ohne Touchscreen-Widget, gedacht fürs Handy
 *  oder einen zweiten Bildschirm neben dem Stream. */
export default async function OverlayLiveControlPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/profile/overlay/live");

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { twitchLogin: true, overlayLayoutJson: true } });
  if (!user?.twitchLogin) {
    return (
      <div className="max-w-xl mx-auto w-full p-4 sm:p-8">
        <h1 className="text-lg font-semibold text-white mb-4">Overlay-Steuerung</h1>
        <ProfileOverlayButton hasTwitch={false} />
      </div>
    );
  }

  const config = parseStreamerConfig(user.overlayLayoutJson);
  return (
    <LiveControl
      layouts={{
        event: config.event ?? defaultStreamerEventLayout(),
        profile: config.profile ?? defaultProfileLayout(),
        pause: config.pauseLayout ?? defaultPauseLayout(),
        clips: config.clipLayout ?? defaultClipLayout(),
      }}
    />
  );
}
