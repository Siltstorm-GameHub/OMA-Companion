import Link from "next/link";
import { Tv2 } from "@/components/icons";
import { STREAMER_OVERLAY_SETTINGS_PATH } from "@/components/overlay/types";

/** Einstiegspunkt fürs OBS-Overlay (fester Streamer-Link) — nur nutzbar, wenn im Profil ein
 *  Twitch-Konto hinterlegt ist (Grundvoraussetzung dafür, dass der Link je in einem Stream landet). */
export default function ProfileOverlayButton({ hasTwitch }: { hasTwitch: boolean }) {
  if (!hasTwitch) {
    return (
      <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
        <Tv2 className="w-4 h-4 text-gray-600 shrink-0" />
        <p className="text-xs text-gray-500">
          Hinterlege dein Twitch-Konto oben, um dein OBS-Overlay einzurichten.
        </p>
      </div>
    );
  }

  return (
    <Link
      href={STREAMER_OVERLAY_SETTINGS_PATH}
      className="w-full flex items-center gap-2 text-sm px-4 py-3 rounded-2xl border border-white/[0.08] text-gray-300 hover:text-teal-300 hover:border-teal-500/30 transition-all"
    >
      <Tv2 className="w-4 h-4 text-teal-400" />
      OBS-Overlay einrichten
    </Link>
  );
}
