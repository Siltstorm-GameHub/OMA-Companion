"use client";

import ProfileOverlayView from "./ProfileOverlayView";
import { useOverlayStream } from "./useOverlayStream";
import type { OverlayLayout, ProfileElementKey, ProfileOverlayState } from "./types";

/** Profil-Link (/overlay/profile/[userId]?token=…&layout=…): Layout fest in der URL. */
export default function ProfileOverlayClient({
  userId, token, layout, initialState, lite,
}: {
  userId: string;
  token: string;
  layout: OverlayLayout<ProfileElementKey>;
  initialState: ProfileOverlayState;
  lite: boolean;
}) {
  const state = useOverlayStream(`/api/overlay/profile/${userId}/stream?token=${encodeURIComponent(token)}`, initialState);
  return <ProfileOverlayView state={state} layout={layout} lite={lite} />;
}
