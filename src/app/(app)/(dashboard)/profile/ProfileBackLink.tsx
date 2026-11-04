"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@/components/icons";

/**
 * "Zurück" auf fremden Profilen: führt dorthin zurück, woher man kam (Community-Board, Turnier,
 * Squad …). Nur wenn es keinen App-internen Vorgänger gibt (direkt geöffneter Link), geht es zur Rangliste.
 */
export default function ProfileBackLink() {
  const router = useRouter();

  function back() {
    const cameFromApp = typeof document !== "undefined"
      && !!document.referrer && new URL(document.referrer).origin === window.location.origin
      && window.history.length > 1;
    if (cameFromApp) router.back();
    else router.push("/leaderboard");
  }

  return (
    <button type="button" onClick={back}
      className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors group">
      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
      Zurück
    </button>
  );
}
