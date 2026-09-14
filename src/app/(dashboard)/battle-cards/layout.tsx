// ============================================
// Battle Cards — MOBA-Style-Skin-Wrapper
// ============================================
// Umschließt alle battle-cards-Routen (Hub, Kampf-Replays, Live-PvP,
// Challenges, Duel-Deck, Leaderboard, Lineup, My-Card) mit dem
// .moba-skin-Scope — siehe battle-cards-moba.css. Der Rest der App bleibt
// beim bestehenden dunklen Glass-Design; admin/battle-cards/* liegt
// außerhalb dieses Route-Segments und ist nicht betroffen.
//
// Eigene Schrift statt der App-weiten Russo One — vierter Anlauf: Cinzel (zu
// verspielt/mittelalterlich, bei kleinen Labels kaum lesbar) → Rajdhani (zu
// technisch/dünn) → Titan One (traf den Gold/Outline-Effekt, aber die runde
// Comic-Form passte nicht zum Diablo-artigen Vorbild) → jetzt Metamorphous:
// sturdy gotische Serifen im Stil klassischer Dark-Fantasy-RPG-UIs (Diablo/
// WoW-artig), bleibt zusammen mit dem Gold-Fill+dunklem-Outline-Textstil
// unten (.moba-skin .font-battle) auch bei kleinen Tab-Labels lesbar (lokal
// gegen 3 weitere Kandidaten geprüft). --font-battle wird nur INNERHALB von
// .moba-skin überschrieben — die bestehende .font-battle-Klasse greift
// dadurch automatisch überall.

import { Metamorphous } from "next/font/google";
import "@/app/battle-cards-moba.css";

const metamorphous = Metamorphous({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-battle",
  display: "swap",
});

export default function BattleCardsLayout({ children }: { children: React.ReactNode }) {
  return <div className={`moba-skin ${metamorphous.variable}`}>{children}</div>;
}
