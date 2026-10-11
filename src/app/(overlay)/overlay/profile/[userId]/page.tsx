import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProfileOverlayClient from "@/components/overlay/ProfileOverlayClient";
import { getProfileOverlayState } from "@/lib/overlay-state";
import { parseLayoutParam, defaultProfileLayout, clampRotateSeconds } from "@/components/overlay/layout";
import { PROFILE_ELEMENT_KEYS, DEFAULT_ROTATE_SECONDS, type ProfileElementKey } from "@/components/overlay/types";

export const dynamic = "force-dynamic";

/** Profil-Link mit eingebautem Layout (`?layout=brand:1.5,90.6;rank:20,90.6,s1.2,c8-4`, gleiche
 *  Notation wie beim Event-Link). Neue Links zeigen auf den festen Streamer-Link. */
export default async function ProfileOverlayPage({
  params, searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ token?: string; layout?: string; rotate?: string; lite?: string }>;
}) {
  const { userId } = await params;
  const { token, layout: layoutParam, rotate, lite } = await searchParams;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, overlayToken: true } });
  if (!user || !token || user.overlayToken !== token) notFound();

  const state = await getProfileOverlayState(user.id);
  if (!state) notFound();

  const elements = parseLayoutParam<ProfileElementKey>(layoutParam, PROFILE_ELEMENT_KEYS);
  const layout = elements
    ? { elements, rotateSeconds: rotate ? clampRotateSeconds(rotate) : DEFAULT_ROTATE_SECONDS }
    : defaultProfileLayout();

  return <ProfileOverlayClient userId={user.id} token={token} layout={layout} initialState={state} lite={lite === "1"} />;
}
