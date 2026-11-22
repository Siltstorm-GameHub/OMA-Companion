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
      <div className="flex items-center gap-1 mb-6 p-1 rounded-card max-w-sm mx-auto border border-line bg-surface">
        <button
          type="button"
          onClick={() => setTab("donations")}
          aria-pressed={tab === "donations"}
          className={`flex-1 flex min-h-11 items-center justify-center gap-2 px-4 rounded-control text-sm font-bold transition-colors ${
            tab === "donations" ? "bg-primary-soft text-primary-fg" : "text-muted hover:text-fg hover:bg-surface-2"
          }`}
        >
          <Heart className="w-4 h-4" />
          Spendenpool
        </button>
        <button
          type="button"
          onClick={() => setTab("fanshop")}
          aria-pressed={tab === "fanshop"}
          className={`flex-1 flex min-h-11 items-center justify-center gap-2 px-4 rounded-control text-sm font-bold transition-colors ${
            tab === "fanshop" ? "bg-primary-soft text-primary-fg" : "text-muted hover:text-fg hover:bg-surface-2"
          }`}
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
