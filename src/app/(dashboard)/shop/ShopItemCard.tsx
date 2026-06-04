"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShoppingCart, Loader2, Star, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { RARITY_CONFIG, TITLE_STYLES } from "@/lib/shop";

interface ShopItem {
  id: string; name: string; description: string; icon: string;
  price: number; type: string; value: string; category: string;
  rarity: string; stock: number | null; active: boolean;
}

interface Props {
  item: ShopItem;
  owned: boolean;
  canAfford: boolean;
  soldOut: boolean;
  myPoints: number;
  activeTitle: string | null;
  profileTheme: string;
  purchaseId?: string;
  consumed?: boolean;
}

export default function ShopItemCard({
  item, owned, canAfford, soldOut, myPoints, activeTitle, profileTheme, purchaseId, consumed,
}: Props) {
  const [loading, setLoading]       = useState(false);
  const [localOwned, setOwned]      = useState(owned);
  const [localTitle, setTitle]      = useState(activeTitle);
  const [localTheme, setTheme]      = useState(profileTheme);
  const [localConsumed, setConsumed] = useState(consumed ?? false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestGame, setSuggestGame] = useState("");
  const [suggestNote, setSuggestNote] = useState("");
  const router = useRouter();

  const rarity = RARITY_CONFIG[item.rarity as keyof typeof RARITY_CONFIG] ?? RARITY_CONFIG.common;
  const isTitle  = item.type === "title";
  const isTheme  = item.type === "profile_theme";
  const isActive = isTitle ? localTitle === item.value : isTheme ? localTheme === item.value : false;

  // Repeatable items can be bought multiple times
  const isRepeatable = ["streak_shield", "xp_boost", "event_slot"].includes(item.type);
  const alreadyOwned = localOwned && !isRepeatable;

  async function handleBuy() {
    if (alreadyOwned || soldOut || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/shop/purchase", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Kauf fehlgeschlagen");
        return;
      }
      setOwned(true);
      toast.success(`${item.icon} ${item.name} gekauft!`, {
        description: isTitle ? 'Aktiviere den Titel in deinen "Meine Titel"' :
                     isTheme ? "Dein Profil-Theme wurde aktualisiert." :
                     "Die Belohnung wurde gutgeschrieben.",
      });
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleLulSuggest() {
    if (!purchaseId || !suggestGame.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/shop/lul-suggest", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ purchaseId, game: suggestGame, note: suggestNote }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler"); return; }
      setConsumed(true);
      setShowSuggest(false);
      toast.success("🎮 Vorschlag eingereicht!", { description: `„${suggestGame}" wurde zur Abstimmung vorgeschlagen.` });
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleActivateTitle(title: string | null) {
    setLoading(true);
    try {
      const res = await fetch("/api/shop/title", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title }),
      });
      if (res.ok) {
        setTitle(title);
        toast.success(title ? `Titel "${title}" aktiviert` : "Titel entfernt");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  // Theme preview colors
  const THEME_PREVIEWS: Record<string, string> = {
    cyber:   "from-blue-500 to-cyan-400",
    golden:  "from-amber-500 to-yellow-400",
    void:    "from-violet-600 to-purple-800",
    emerald: "from-emerald-500 to-teal-400",
    crimson: "from-red-600 to-rose-800",
    default: "from-rose-500 to-violet-500",
  };

  return (
    <div className={`card-shine glass relative overflow-hidden rounded-2xl border transition-all duration-200 ${rarity.border} ${rarity.glow} ${alreadyOwned ? "opacity-80" : ""}`}>
      {/* Rarity glow bg */}
      <div className={`absolute inset-0 bg-gradient-to-br ${rarity.bg} to-transparent pointer-events-none`} />

      {/* Top accent line */}
      <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${
        item.rarity === "legendary" ? "via-amber-400/50" :
        item.rarity === "epic"      ? "via-purple-400/40" :
        item.rarity === "rare"      ? "via-blue-400/35" :
                                      "via-white/10"
      } to-transparent`} />

      <div className="relative p-4">
        {/* Icon + Rarity */}
        <div className="flex items-start justify-between mb-3">
          <div className="text-3xl leading-none">{item.icon}</div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${rarity.color} ${rarity.border} bg-white/[0.04]`}>
            {rarity.label}
          </span>
        </div>

        {/* Theme preview */}
        {isTheme && (
          <div className={`h-1.5 rounded-full bg-gradient-to-r ${THEME_PREVIEWS[item.value] ?? THEME_PREVIEWS.default} mb-3 opacity-70`} />
        )}

        {/* Title preview */}
        {isTitle && (
          <div className="mb-3">
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${TITLE_STYLES[item.value] ?? "text-gray-400 bg-white/[0.05] border-white/10"}`}>
              {item.value}
            </span>
          </div>
        )}

        <p className="font-bold text-white text-sm mb-1">{item.name}</p>
        <p className="text-xs text-gray-500 leading-relaxed mb-4">{item.description}</p>

        {/* Price + CTA */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span className={`text-sm font-bold tabular-nums ${canAfford || alreadyOwned ? "text-amber-400" : "text-red-400"}`}>
              {item.price.toLocaleString("de-DE")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Activate/deactivate for owned cosmetics */}
            {alreadyOwned && isTitle && (
              <button
                onClick={() => handleActivateTitle(isActive ? null : item.value)}
                disabled={loading}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border disabled:opacity-50 ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                    : "glass border-white/[0.1] text-gray-400 hover:text-white hover:border-white/[0.2]"
                }`}
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : isActive ? "Aktiv ✓" : "Aktivieren"}
              </button>
            )}

            {/* Buy button */}
            {!alreadyOwned && (
              <button
                onClick={handleBuy}
                disabled={loading || soldOut || !canAfford}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all active:scale-[0.97] disabled:opacity-50 ${
                  soldOut
                    ? "bg-white/[0.04] text-gray-600 border border-white/[0.06] cursor-not-allowed"
                    : !canAfford
                    ? "bg-white/[0.04] text-red-400 border border-red-500/20 cursor-not-allowed"
                    : "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                }`}
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> :
                 soldOut  ? <><Lock className="w-3 h-3" /> Ausverkauft</> :
                 !canAfford ? <><Lock className="w-3 h-3" /> Zu teuer</> :
                 <><ShoppingCart className="w-3 h-3" /> Kaufen</>}
              </button>
            )}

            {/* LUL-Vorschlag einlösen */}
            {alreadyOwned && item.type === "lul_suggest" && !localConsumed && (
              <button
                onClick={() => setShowSuggest(s => !s)}
                className="text-xs px-3 py-1.5 rounded-lg font-medium glass border border-violet-500/25 text-violet-300 hover:border-violet-400/40 transition-all"
              >
                🎮 Vorschlagen
              </button>
            )}

            {/* Owned badge for non-activatable items */}
            {alreadyOwned && !isTitle && item.type !== "lul_suggest" && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <Check className="w-3 h-3" /> {item.type === "tournament_sponsor" ? "Sponsor aktiv" : "Besessen"}
              </span>
            )}
            {alreadyOwned && item.type === "lul_suggest" && localConsumed && (
              <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                <Check className="w-3 h-3" /> Eingereicht
              </span>
            )}
          </div>
        </div>

        {/* LUL-Vorschlag Formular */}
        {showSuggest && (
          <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
            <input
              type="text"
              placeholder="Spielname *"
              value={suggestGame}
              onChange={e => setSuggestGame(e.target.value)}
              className="w-full text-xs bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40"
            />
            <input
              type="text"
              placeholder="Notiz (optional)"
              value={suggestNote}
              onChange={e => setSuggestNote(e.target.value)}
              className="w-full text-xs bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40"
            />
            <button
              onClick={handleLulSuggest}
              disabled={loading || !suggestGame.trim()}
              className="flex items-center gap-1.5 w-full justify-center text-xs px-3 py-2 rounded-lg font-medium bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Vorschlag einreichen
            </button>
          </div>
        )}

        {/* Stock indicator */}
        {item.stock !== null && item.stock <= 5 && item.stock > 0 && (
          <p className="text-[10px] text-amber-500 mt-2">⚠️ Nur noch {item.stock} verfügbar</p>
        )}
        {soldOut && (
          <p className="text-[10px] text-red-500/70 mt-2">Ausverkauft</p>
        )}
      </div>
    </div>
  );
}
