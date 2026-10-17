"use client";

// ============================================
// OMA Gems — Shop-Bereich „Kosmetik“ für „Mein Held“
// ============================================
// Zeigt jedes nicht freie Teil am eigenen Helden: kaufbare mit Preis und Kauf-Bestätigung, erspielbare
// mit ihrer Quelle (Rang, Turmwächter, Saison). Gekauftes legt man im Editor an (/gems/held).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import CoinIcon from "@/components/CoinIcon";
import { Check, Lock } from "@/components/icons";
import HeroFigure from "../HeroFigure";
import HeroBackdrop from "../HeroBackdrop";
import ErrorNotice from "../ErrorNotice";
import { allCosmetics, cosmeticLabel, unlockFor, unlockLabel } from "@/lib/gems/hero/cosmetics";
import type { HeroClass, HeroLook } from "@/lib/gems/hero/look";

export default function CosmeticShop({
  look,
  heroClass,
  owned,
  coins: initialCoins,
}: {
  look: HeroLook;
  heroClass: HeroClass;
  owned: string[];
  coins: number;
}) {
  const router = useRouter();
  const [ownedSet, setOwnedSet] = useState(() => new Set(owned));
  const [coins, setCoins] = useState(initialCoins);
  const [pending, setPending] = useState<{ itemId: string; label: string; price: number } | null>(null);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = allCosmetics()
    .map((c) => ({ ...c, unlock: unlockFor(c.slot, c.id, heroClass) }))
    .filter((c) => c.unlock.kind !== "free");
  const buyable = items.filter((c) => c.unlock.kind === "coins");
  const earnable = items.filter((c) => c.unlock.kind !== "coins");

  async function buy() {
    if (!pending) return;
    setBuying(true);
    setError(null);
    try {
      const res = await fetch("/api/gems/cosmetics/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: [pending.itemId] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Kauf fehlgeschlagen.");
      setOwnedSet((cur) => new Set([...cur, pending.itemId]));
      setCoins(data.points);
      setPending(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setBuying(false);
    }
  }

  const tile = (c: (typeof items)[number], action: React.ReactNode) => (
    <div key={c.itemId} className="glass rounded-xl p-2 flex flex-col items-center gap-1.5 text-center">
      <span className="relative w-full h-20 block rounded-lg overflow-hidden">
        {c.slot === "backdrop" && <HeroBackdrop id={c.id} />}
        <HeroFigure look={{ ...look, [c.slot]: c.id }} className="relative w-full h-full" />
      </span>
      <span className="text-[11px] font-semibold text-gray-200 leading-tight">{cosmeticLabel(c.slot, c.id)}</span>
      {action}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-lg font-bold text-white">Kosmetik für deinen Helden</h2>
          <p className="text-xs text-gray-500 mt-0.5">Nur Aussehen, keine Kampfwerte. Anlegen kannst du alles unter „Mein Held“.</p>
        </div>
        <Link href="/gems/held" className="text-xs font-semibold text-teal-300 hover:text-teal-200">
          Mein Held gestalten →
        </Link>
      </div>
      {error && <ErrorNotice message={error} />}

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {buyable.map((c) =>
          tile(
            c,
            ownedSet.has(c.itemId) ? (
              <span className="flex items-center gap-1 text-[11px] text-teal-300">
                <Check className="w-3 h-3" /> Gekauft
              </span>
            ) : (
              <Button
                size="sm"
                variant="accent"
                className="w-full"
                disabled={coins < (c.unlock.kind === "coins" ? c.unlock.price : 0)}
                onClick={() =>
                  setPending({ itemId: c.itemId, label: cosmeticLabel(c.slot, c.id), price: c.unlock.kind === "coins" ? c.unlock.price : 0 })
                }
              >
                {c.unlock.kind === "coins" ? c.unlock.price : ""} <CoinIcon size={12} />
              </Button>
            )
          )
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-display text-sm font-bold text-white">Erspielen</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {earnable.map((c) =>
            tile(
              c,
              ownedSet.has(c.itemId) ? (
                <span className="flex items-center gap-1 text-[11px] text-teal-300">
                  <Check className="w-3 h-3" /> Freigeschaltet
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-amber-300">
                  <Lock className="w-2.5 h-2.5" /> {unlockLabel(c.unlock)}
                </span>
              )
            )
          )}
        </div>
      </div>

      <Modal open={pending !== null} onClose={() => setPending(null)} title="Kosmetik kaufen?" size="sm">
        {pending && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              {pending.label} für <span className="font-semibold text-amber-300">{pending.price} Münzen</span>? Danach hast du noch{" "}
              {coins - pending.price}. Gekaufte Teile behältst du dauerhaft.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPending(null)}>
                Abbrechen
              </Button>
              <Button onClick={buy} loading={buying}>
                Kaufen
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
