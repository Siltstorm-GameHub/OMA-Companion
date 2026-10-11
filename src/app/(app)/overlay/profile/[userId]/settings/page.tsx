import { redirect } from "next/navigation";
import { STREAMER_OVERLAY_SETTINGS_PATH } from "@/components/overlay/types";

/** Alte Einstiegs-URL des Profil-Overlays — siehe /profile/overlay (fester Streamer-Link). */
export default function LegacyProfileOverlaySettings() {
  redirect(STREAMER_OVERLAY_SETTINGS_PATH);
}
