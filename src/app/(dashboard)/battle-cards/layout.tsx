// ============================================
// Battle Cards — MOBA-Style-Skin-Wrapper
// ============================================
// Umschließt alle battle-cards-Routen (Hub, Kampf-Replays, Live-PvP,
// Challenges, Duel-Deck, Leaderboard, Lineup, My-Card) mit dem
// .moba-skin-Scope — siehe battle-cards-moba.css. Der Rest der App bleibt
// beim bestehenden dunklen Glass-Design; admin/battle-cards/* liegt
// außerhalb dieses Route-Segments und ist nicht betroffen.
//
// Eigene Schrift statt der App-weiten Russo One: Cinzel (verziertes Serif)
// passt zum navy/goldenen Filigran-Look des MOBA-Style-Kits (Kartenrahmen,
// Panel-Ecken) deutlich besser als die kantige Arcade-Schrift der übrigen
// App. --font-battle wird nur INNERHALB von .moba-skin überschrieben — die
// bestehende .font-battle-Klasse (Kartennamen, Kapitel-Titel etc.) greift
// dadurch automatisch, ohne dass jede Stelle einzeln angefasst werden muss.

import { Cinzel } from "next/font/google";
import "@/app/battle-cards-moba.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-battle",
  display: "swap",
});

export default function BattleCardsLayout({ children }: { children: React.ReactNode }) {
  return <div className={`moba-skin ${cinzel.variable}`}>{children}</div>;
}
