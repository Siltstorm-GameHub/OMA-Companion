import { redirect } from "next/navigation";
import { STREAMER_OVERLAY_SETTINGS_PATH } from "@/components/overlay/types";

/** Alte Einstiegs-URL (aus Streamer-Anmeldungen vor dem festen Streamer-Link) — die Einstellungen
 *  liegen jetzt zentral unter /profile/overlay und gelten für jedes Event. */
export default async function LegacyEventOverlaySettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`${STREAMER_OVERLAY_SETTINGS_PATH}?event=${encodeURIComponent(id)}`);
}
