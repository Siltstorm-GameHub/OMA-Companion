import Link from "next/link";
import { Tv2, Smartphone } from "@/components/icons";
import { STREAMER_OVERLAY_SETTINGS_PATH } from "@/components/overlay/types";

/** Einstiegspunkte fürs OBS-Overlay — der EINZIGE Ort für Overlay-Link, Einstellungen und
 *  Live-Steuerung (Events verlinken bewusst nicht mehr selbst dorthin). Nur nutzbar, wenn im Profil
 *  ein Twitch-Konto hinterlegt ist (Grundvoraussetzung dafür, dass der Link je in einem Stream landet). */
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

  const linkClass = "flex items-center gap-2 text-sm px-4 py-3 rounded-2xl border border-white/[0.08] text-gray-300 hover:text-teal-300 hover:border-teal-500/30 transition-all";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Link href={STREAMER_OVERLAY_SETTINGS_PATH} className={linkClass}>
        <Tv2 className="w-4 h-4 text-teal-400 shrink-0" />
        OBS-Overlay einrichten
      </Link>
      <Link href={`${STREAMER_OVERLAY_SETTINGS_PATH}/live`} className={linkClass}>
        <Smartphone className="w-4 h-4 text-teal-400 shrink-0" />
        Live-Steuerung
      </Link>
    </div>
  );
}
