"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Gamepad2, Eye, Check, X } from "lucide-react";

type Props = {
  spieltagId:  string;
  currentRole: "player" | "spectator" | null;
};

export default function LulRegisterButton({ spieltagId, currentRole }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function register(role: "player" | "spectator") {
    setBusy(true);
    try {
      const res = await fetch(`/api/lul/spieltage/${spieltagId}/register`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ role }),
      });
      if (res.ok) {
        toast.success(role === "player" ? "Als Mitspieler angemeldet!" : "Als Zuschauer angemeldet!");
        router.refresh();
      } else {
        const d = await res.json() as { error?: string };
        toast.error(d.error ?? "Fehler");
      }
    } finally { setBusy(false); }
  }

  async function unregister() {
    setBusy(true);
    try {
      const res = await fetch(`/api/lul/spieltage/${spieltagId}/register`, { method: "DELETE" });
      if (res.ok) { toast.success("Abgemeldet"); router.refresh(); }
      else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Fehler"); }
    } finally { setBusy(false); }
  }

  if (currentRole) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
          currentRole === "player"
            ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
            : "text-blue-400 bg-blue-500/10 border-blue-500/20"
        }`}>
          <Check className="w-2.5 h-2.5" />
          {currentRole === "player" ? "Mitspieler" : "Zuschauer"}
        </span>
        <button onClick={unregister} disabled={busy}
          className="w-5 h-5 flex items-center justify-center rounded-full text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
          title="Abmelden">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => register("player")} disabled={busy}
        className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-colors disabled:opacity-40">
        <Gamepad2 className="w-3 h-3" />
        Mitspielen
      </button>
      <button onClick={() => register("spectator")} disabled={busy}
        className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors disabled:opacity-40">
        <Eye className="w-3 h-3" />
        Zuschauen
      </button>
    </div>
  );
}
