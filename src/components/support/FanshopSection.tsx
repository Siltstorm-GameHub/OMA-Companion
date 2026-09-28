import { ShoppingBag, ExternalLink } from "@/components/icons";

const SHOP_URL = "https://oma-merch.myspreadshop.de/";

/*
 * ── FanshopSection ───────────────────────────────────────────────────────
 * Spreadshirt bietet für diesen Shop-Typ kein Embed-Widget/keine Partner-API,
 * daher binden wir den Shop direkt per iFrame ein. Der "In neuem Tab öffnen"-
 * Link bleibt bewusst prominent, falls Spreadshirt das Framing serverseitig
 * ändert oder einzelne Unterseiten (Checkout) das Frame verlassen wollen.
 */
export default function FanshopSection() {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-teal-400 mb-1">
          <ShoppingBag className="w-5 h-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">OMA Fanshop</span>
        </div>
        <h1 className="text-2xl font-black text-white">Trag die Community</h1>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          T-Shirts, Hoodies &amp; mehr im OMA-Design — jeder Kauf unterstützt uns direkt.
        </p>

        <div className="pt-2">
          <a
            href={SHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, rgba(20,184,166,0.9), rgba(13,148,136,0.9))",
              color: "#fff",
              boxShadow: "0 4px 16px rgba(20,184,166,0.3)",
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Shop in neuem Tab öffnen
          </a>
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
      >
        <iframe
          src={SHOP_URL}
          title="OMA Fanshop"
          loading="lazy"
          style={{ width: "100%", height: "1400px", border: "none", display: "block" }}
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <p className="text-[11px] text-gray-600 text-center">
        Der Shop wird von Spreadshirt betrieben — Zahlung, Versand und Widerruf laufen dort.
      </p>
    </div>
  );
}
