// ============================================
// Battle Cards — MOBA-Style-Skin-Wrapper
// ============================================
// Umschließt alle battle-cards-Routen (Hub, Kampf-Replays, Live-PvP,
// Challenges, Duel-Deck, Leaderboard, Lineup, My-Card) mit dem
// .moba-skin-Scope — siehe battle-cards-moba.css. Der Rest der App bleibt
// beim bestehenden dunklen Glass-Design; admin/battle-cards/* liegt
// außerhalb dieses Route-Segments und ist nicht betroffen.
//
// Eigene Schrift statt der App-weiten Russo One: Rajdhani statt (zunächst
// versuchtem) Cinzel — Cinzel wirkte zu verspielt/mittelalterlich und war bei
// kleinen UI-Labels (Tab-Beschriftung) kaum lesbar. League of Legends nutzt
// UI-seitig tatsächlich eine klare, leicht technische Groteskschrift statt
// einer Fantasy-Zierschrift — Rajdhani trifft genau dieses "moderne Esports-
// HUD"-Gefühl (klar, leicht kantig, gut lesbar auch klein). --font-battle
// wird nur INNERHALB von .moba-skin überschrieben — die bestehende
// .font-battle-Klasse (Kartennamen, Kapitel-Titel etc.) greift dadurch
// automatisch, ohne dass jede Stelle einzeln angefasst werden muss.

import { Rajdhani } from "next/font/google";
import "@/app/battle-cards-moba.css";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-battle",
  display: "swap",
});

export default function BattleCardsLayout({ children }: { children: React.ReactNode }) {
  return <div className={`moba-skin ${rajdhani.variable}`}>{children}</div>;
}
