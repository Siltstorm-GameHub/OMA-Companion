"use client";
import { useState, type ReactNode } from "react";
import { HeartColor as Heart } from "@/components/icons-color";
import { ShoppingBag } from "@/components/icons";

/*
 * ── SupportTabs ──────────────────────────────────────────────────────────
 * Die Unterstützungs-Seite bündelt zwei Wege, die Community zu fördern:
 * Spendenpool (Server-Daten) und Fanshop (Spreadshirt-Embed). Beide Inhalte
 * werden serverseitig gerendert und hier nur client-seitig ein-/ausgeblendet,
 * damit kein Reload nötig ist und die Donations-Queries nicht doppelt laufen.
 */
export default function SupportTabs({
  donations,
  fanshop,
}: {
  donations: ReactNode;
  fanshop: ReactNode;
}) {
  const [tab, setTab] = useState<"donations" | "fanshop">("donations");

  return (
    <div>
      <div
        className="flex items-center gap-1.5 mb-7 p-1.5 rounded-2xl max-w-sm mx-auto"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(20,184,166,0.16)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        <button
          type="button"
          onClick={() => setTab("donations")}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{
            background: tab === "donations"
              ? "linear-gradient(135deg, rgba(20,184,166,0.9), rgba(13,148,136,0.9))"
              : "transparent",
            color: tab === "donations" ? "#fff" : "var(--nav-icon-inactive, #6b7280)",
            boxShadow: tab === "donations" ? "0 4px 14px rgba(20,184,166,0.35)" : "none",
            transform: tab === "donations" ? "scale(1.02)" : "scale(1)",
          }}
        >
          <Heart className="w-4 h-4" />
          Spendenpool
        </button>
        <button
          type="button"
          onClick={() => setTab("fanshop")}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{
            background: tab === "fanshop"
              ? "linear-gradient(135deg, rgba(20,184,166,0.9), rgba(13,148,136,0.9))"
              : "transparent",
            color: tab === "fanshop" ? "#fff" : "var(--nav-icon-inactive, #6b7280)",
            boxShadow: tab === "fanshop" ? "0 4px 14px rgba(20,184,166,0.35)" : "none",
            transform: tab === "fanshop" ? "scale(1.02)" : "scale(1)",
          }}
        >
          <ShoppingBag className="w-4 h-4" />
          Fanshop
        </button>
      </div>

      <div style={{ display: tab === "donations" ? "block" : "none" }}>{donations}</div>
      <div style={{ display: tab === "fanshop" ? "block" : "none" }}>{fanshop}</div>
    </div>
  );
}
