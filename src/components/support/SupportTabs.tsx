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
      <div className="flex items-center justify-center gap-1 mb-6 p-1 rounded-xl max-w-xs mx-auto"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          type="button"
          onClick={() => setTab("donations")}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
          style={{
            background: tab === "donations" ? "rgba(20,184,166,0.12)" : "transparent",
            color: tab === "donations" ? "#2dd4bf" : "var(--nav-icon-inactive, #6b7280)",
          }}
        >
          <Heart className="w-3.5 h-3.5" />
          Spendenpool
        </button>
        <button
          type="button"
          onClick={() => setTab("fanshop")}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
          style={{
            background: tab === "fanshop" ? "rgba(20,184,166,0.12)" : "transparent",
            color: tab === "fanshop" ? "#2dd4bf" : "var(--nav-icon-inactive, #6b7280)",
          }}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Fanshop
        </button>
      </div>

      <div style={{ display: tab === "donations" ? "block" : "none" }}>{donations}</div>
      <div style={{ display: tab === "fanshop" ? "block" : "none" }}>{fanshop}</div>
    </div>
  );
}
