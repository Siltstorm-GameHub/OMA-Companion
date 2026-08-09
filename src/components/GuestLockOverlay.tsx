import { Lock } from "lucide-react";
import DiscordLoginButton from "@/components/DiscordLoginButton";

interface Props {
  title?: string;
  message?: string;
  className?: string;
}

// Legt sich über einen (bereits mit Platzhalter-/Skeleton-Inhalten gefüllten)
// Bereich und weist nicht eingeloggte Besucher darauf hin, dass sie sich mit
// Discord anmelden müssen, um die echten Inhalte zu sehen.
export default function GuestLockOverlay({
  title = "Login erforderlich",
  message = "Melde dich mit Discord an, um alle Inhalte zu sehen.",
  className = "",
}: Props) {
  return (
    <div
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-4 text-center backdrop-blur-md ${className}`}
      style={{ background: "rgba(10,11,15,0.55)" }}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.25)" }}>
        <Lock className="w-4 h-4 text-rose-400" />
      </div>
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5 max-w-[240px]">{message}</p>
      </div>
      <DiscordLoginButton />
    </div>
  );
}
